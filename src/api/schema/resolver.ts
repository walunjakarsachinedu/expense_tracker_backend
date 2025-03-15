import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import { AnyBulkWriteOperation, BSON } from "mongodb";
import mongoose, { InferSchemaType } from "mongoose";
import { configPath, getConfig } from "../../config-path.js";
import PasswordResetTokenModel from "../../db/password_reset_tokens.js";
import Person from "../../db/persons.js";
import User from "../../db/users.js";
import { ErrorCodes, getError } from "../errors.js";
import passwordResetClient from "../password-reset.js";
import {
  ChangedPersons,
  Conflicts,
  PasswordResetInput,
  PersonDiff,
  PersonPatch,
  PersonVersionId,
  Status,
  TxPatch,
  UserData,
} from "./type.js";

const queryResolvers = {
  Query: {
    hello: (_, args) => {
      return args.name ? `hello ${args.name}` : "hi friend !!!";
    },
    user: async (parent, args, context, info) => {
      let user: any = await User.findById(context.userId).lean();
      if (!user) throw getError(ErrorCodes.USER_NOT_FOUND);
      delete user["password"];
      return user;
    },
    changedPersons: async (
      parent,
      args: { month: string; personVersionIds: PersonVersionId[] },
      context,
      info
    ) => {
      const persons = await Person.where("userId")
        .equals(context.userId)
        .where("month")
        .equals(args.month)
        .lean();
      const addedPersons = persons.filter(
        (person) =>
          !args.personVersionIds.find(
            (personVersionId) => personVersionId._id == person._id.toString()
          )
      );
      const updatedPersons = persons.filter((person) =>
        args.personVersionIds.find(
          (personVersionId) =>
            personVersionId._id == person._id.toString() &&
            personVersionId.version != person.version
        )
      );
      const deletedPersons = args.personVersionIds
        .filter(
          (personVersionId) =>
            !persons.find(
              (person) => person._id.toString() == personVersionId._id
            )
        )
        .map((person) => person._id);
      console.log(JSON.stringify(addedPersons));

      return {
        addedPersons,
        deletedPersons,
        updatedPersons,
      } satisfies ChangedPersons;
    },
  },
  Mutation: {
    login: async (parent, { email, password }, context, info) => {
      const user = await User.findOne({ email });
      if (!user) throw getError(ErrorCodes.INVALID_CREDENTIALS);
      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) throw getError(ErrorCodes.INVALID_CREDENTIALS);

      return generateJwtToken(user);
    },
    signup: async (parent, { name, email, password }, context, info) => {
      password = encryptPassword(password);
      const existingUser = await User.findOne({ email });
      if (existingUser) throw getError(ErrorCodes.USER_ALREADY_EXISTS);

      const userDb = await User.create({ name, email, password });

      return generateJwtToken(userDb);
    },

    applyUpdates: async (
      parent,
      { diff }: { diff: PersonDiff },
      context,
      info
    ): Promise<Conflicts> => {
      const dbOperations: AnyBulkWriteOperation<
        InferSchemaType<typeof Person.schema>
      >[] = [];

      diff.added
        ?.map((person) => ({
          ...person,
          _id: new mongoose.Types.ObjectId(person._id),
          userId: new mongoose.Types.ObjectId(context.userId),
        }))
        .forEach((person) =>
          dbOperations.push({
            insertOne: { document: new Person(person).toObject() },
          })
        );

      diff.updated?.forEach((personPatch) => {
        if (personPatch.txDiff?.added?.length) {
          dbOperations.push({
            updateOne: {
              filter: { _id: new mongoose.Types.ObjectId(personPatch._id) },
              update: {
                $push: {
                  txs: {
                    $each: personPatch.txDiff?.added,
                  },
                },
              },
            },
          });
        }
        if (personPatch.txDiff?.deleted?.length) {
          dbOperations.push({
            updateOne: {
              filter: { _id: new mongoose.Types.ObjectId(personPatch._id) },
              update: {
                $pull: {
                  txs: {
                    _id: {
                      $in: personPatch.txDiff?.deleted ?? [],
                    },
                  },
                },
              },
            },
          });
        }

        const personDetailsUpdates = Object.entries(personPatch).filter(
          ([key]: [keyof PersonPatch, any]) => key !== "_id" && key !== "txDiff"
        );

        if (
          personDetailsUpdates.length ||
          personPatch.txDiff?.updated?.length
        ) {
          dbOperations.push({
            updateOne: {
              filter: { _id: new mongoose.Types.ObjectId(personPatch._id) },
              update: {
                $set: Object.fromEntries([
                  ...personDetailsUpdates,
                  ...(personPatch.txDiff?.updated?.flatMap((tx) =>
                    Object.entries(tx)
                      .filter(([key]: [keyof TxPatch, any]) => key !== "_id")
                      .map(([key, value]) => [
                        `txs.$[elem${tx._id}].${key}`,
                        value,
                      ])
                  ) ?? []),
                ]),
              },
              arrayFilters: personPatch.txDiff?.updated?.map((tx) => ({
                [`elem${tx._id}._id`]: tx._id,
              })),
            },
          });
        }
      });

      if (diff.deleted) {
        dbOperations.push({
          deleteMany: {
            filter: {
              _id: {
                $in: diff.deleted.map((id) => new mongoose.Types.ObjectId(id)),
              },
            },
          },
        });
      }

      if (dbOperations.length > 0) {
        const response = await Person.collection.bulkWrite(
          dbOperations as AnyBulkWriteOperation<BSON.Document>[],
          {
            ordered: false,
          }
        );
      }

      return getConflicts(diff, context.userId);
    },
    sendPasswordResetCode: async (
      parent,
      { email, nonce }: { email: string; nonce: string },
      context,
      info
    ): Promise<number> => {
      const resetCode = randomInt(100000, 1000000).toString();
      const minute = 60 * 1000;
      const expireIn: number = Date.now() + 10 * minute;

      const user = await User.findOne({ email });
      if (!user) throw getError(ErrorCodes.USER_NOT_FOUND);

      await PasswordResetTokenModel.create({
        _id: new mongoose.Types.ObjectId(),
        resetCode: resetCode,
        userId: new mongoose.Types.ObjectId(user.id),
        expireIn: expireIn,
        nonce: nonce,
      });
      const status = await passwordResetClient.sendPasswordResetCode(
        resetCode,
        email
      );
      if (status == Status.FAILURE) {
        throw getError(ErrorCodes.ERROR_IN_SENDING_EMAIL);
      }
      return expireIn;
    },

    resetPassword: async (
      parent,
      { passwordResetInput }: { passwordResetInput: PasswordResetInput },
      context,
      info
    ): Promise<string> => {
      const { resetCode, newPassword, email, nonce } = passwordResetInput;
      const resetToken = await PasswordResetTokenModel.findOne({
        resetCode,
      });

      const cleanup = async () => {
        await resetToken?.deleteOne();
        await PasswordResetTokenModel.deleteMany({
          $expr: { $lt: [{ $toLong: "$expireIn" }, Date.now()] },
        });
      };

      try {
        if (!resetToken || resetToken!.expireIn < Date.now()) {
          throw getError(ErrorCodes.INVALID_RESET_CODE);
        }
        const user = await User.findById(resetToken.userId);
        if (!user || user.email != email || resetToken.nonce != nonce) {
          throw getError(ErrorCodes.INVALID_RESET_DATA);
        }

        user.password = encryptPassword(newPassword);
        await user.save();

        await cleanup();
        return generateJwtToken(user);
      } catch (err) {
        await cleanup();
        throw err;
      }
    },
  },
};

function encryptPassword(password: string) {
  const saltRound = 10;
  return bcrypt.hashSync(password, saltRound);
}

function generateJwtToken(
  user: InferSchemaType<typeof User.schema> & { _id: mongoose.Types.ObjectId }
) {
  const payload = { name: user.name, email: user.email };
  const jwtSecret: string = getConfig(configPath.jwt_secret);
  const jwtConfig: SignOptions = {
    subject: user._id.toString(),
    expiresIn: "1d",
  };
  return jwt.sign(payload, jwtSecret, jwtConfig);
}

/**
 * @returns all persons and transaction tags that the current user is updating but were deleted by another login
 */
async function getConflicts(
  personDiff: PersonDiff,
  userId: string
): Promise<Conflicts> {
  const conflicts: Conflicts = {};

  if (personDiff.updated?.length) {
    const personIds = personDiff.updated?.map((person) => person._id);
    const existingPersons = await Person.where("userId")
      .equals(userId)
      .where("_id")
      .in(personIds)
      .lean();

    // just get deleted persons
    const deletedPersons = personIds
      .filter(
        (id) =>
          !existingPersons.find((person) => person._id.toHexString() === id)
      )
      .map((id) => ({ _id: id, isDeleted: true }));

    // just get deleted transaction tags
    const deletedTxs = personDiff.updated
      .map((updatedPerson) => ({
        updatedPerson,
        existingPerson: existingPersons.find(
          (person) => person._id.toHexString() === updatedPerson._id
        ),
      }))
      .filter((el) => el.updatedPerson.txDiff?.updated && el.existingPerson)
      .map((el) => {
        console.log(el.existingPerson?._id, el.updatedPerson._id);
        return {
          _id: el.updatedPerson._id,
          isDeleted: false,
          txs: el.updatedPerson
            .txDiff!.updated!.filter(
              (txEl) =>
                !el.existingPerson?.txs.find((tx) => tx._id === txEl._id)
            )
            .map((txEl) => ({ _id: txEl._id, isDeleted: true })),
        };
      })
      .filter((el) => el.txs.length);

    conflicts.conflictPersons = [...deletedPersons, ...deletedTxs];
  }

  return conflicts;
}

export default queryResolvers;
