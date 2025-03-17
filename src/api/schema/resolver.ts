import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import { AnyBulkWriteOperation, BSON } from "mongodb";
import mongoose, { InferSchemaType } from "mongoose";
import { ModelType } from "../../common/type.utils.js";
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
  PasswordResetToken,
  PersonDiff,
  PersonPatch,
  PersonVersionId,
  Status,
  TxPatch,
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
      let query = Person.where("userId")
        .equals(context.userId)
        .where("month")
        .equals(args.month);
      if (args.personVersionIds.length > 0) {
        query = query.where({
          $nor: args.personVersionIds,
        });
      }
      const persons = await query.lean();

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

      return {
        addedPersons,
        deletedPersons,
        updatedPersons,
      } satisfies ChangedPersons;
    },
  },
  Mutation: {
    /**
     * @throws `ErrorCodes.INVALID_CREDENTIALS` If email or password is invalid.
     */
    login: async (parent, { email, password }, context, info) => {
      const user = await User.findOne({ email });
      if (!user) throw getError(ErrorCodes.INVALID_CREDENTIALS);
      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) throw getError(ErrorCodes.INVALID_CREDENTIALS);

      return generateJwtToken(user);
    },
    /**
     * @throws `ErrorCodes.USER_ALREADY_EXISTS` If user with email already exists.
     */
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

    /**
     * @throws `ErrorCodes.USER_NOT_FOUND` If user with email not found.
     * @throws `ErrorCodes.ERROR_IN_SENDING_EMAIL` If error in sending reset code.
     */
    sendPasswordResetCode: async (
      parent,
      { email, nonce }: { email: string; nonce: string },
      context,
      info
    ): Promise<number> => {
      const resetCode = randomInt(100000, 1000000).toString();
      const minute = 60 * 1000;
      const after12Minute: number = Date.now() + 12 * minute;

      const user = await User.findOne({ email });
      if (!user) throw getError(ErrorCodes.USER_NOT_FOUND);

      await PasswordResetTokenModel.create({
        _id: new mongoose.Types.ObjectId(),
        resetCode: resetCode,
        userId: new mongoose.Types.ObjectId(user.id),
        expireIn: after12Minute,
        nonce: nonce,
      });
      const status = await passwordResetClient.sendPasswordResetCode(
        resetCode,
        email
      );
      if (status == Status.FAILURE) {
        throw getError(ErrorCodes.ERROR_IN_SENDING_EMAIL);
      }
      return after12Minute;
    },

    /**
     * @throws `ErrorCodes.INVALID_RESET_CODE` If code is expire or invalid.
     * @throws `ErrorCodes.INVALID_RESET_DATA` If email or nonce is incorrect.
     */
    verifyResetCode: async (
      parent,
      {
        resetCode,
        email,
        nonce,
      }: { resetCode: string; email: string; nonce: string },
      context,
      info
    ): Promise<string> => {
      const resetToken = await PasswordResetTokenModel.findOne({
        resetCode,
      });
      const user = resetToken ? await User.findById(resetToken.userId) : null;
      const cleanup = async () => {
        await PasswordResetTokenModel.deleteMany({
          $expr: { $lt: [{ $toLong: "$expireIn" }, Date.now()] },
        });
      };

      const error = validateResetToken({ resetToken, user, email, nonce });
      if (error) {
        await cleanup();
        throw getError(error);
      }
      await cleanup();

      const minute = 60 * 1000;
      const after12Minute: number = Date.now() + 12 * minute;
      const newResetCode = generateSecureResetCode();
      resetToken!.resetCode = newResetCode;
      resetToken!.expireIn = after12Minute;

      await resetToken?.save();

      return newResetCode;
    },

    /**
     * @throws `ErrorCodes.INVALID_RESET_CODE` If code is expire or invalid.
     * @throws `ErrorCodes.INVALID_RESET_DATA` If email or nonce is incorrect.
     */
    changePassword: async (
      parent,
      { passwordResetInput }: { passwordResetInput: PasswordResetInput },
      context,
      info
    ): Promise<string> => {
      const { resetCode, newPassword, email, nonce } = passwordResetInput;
      const resetToken = await PasswordResetTokenModel.findOne({
        resetCode,
      });
      const user = resetToken ? await User.findById(resetToken.userId) : null;
      const cleanup = async () => {
        await resetToken?.deleteOne();
        await PasswordResetTokenModel.deleteMany({
          $expr: { $lt: [{ $toLong: "$expireIn" }, Date.now()] },
        });
      };

      const error = validateResetToken({ resetToken, user, email, nonce });
      if (error) {
        await cleanup();
        throw getError(error);
      }
      await cleanup();

      user!.password = encryptPassword(newPassword);
      await user!.save();

      return generateJwtToken(user!);
    },
  },
};

/**
 * @throws `ErrorCodes.INVALID_RESET_CODE` If code is expire or invalid.
 * @throws `ErrorCodes.INVALID_RESET_DATA` If email or nonce is incorrect.
 */
function validateResetToken(input: {
  resetToken: ModelType<PasswordResetToken> | null;
  user: ModelType<{ name: string; email: string; password: string }> | null;
  email: string;
  nonce: string;
}): ErrorCodes | null {
  const { resetToken, user, email, nonce } = input;

  if (!resetToken || resetToken!.expireIn < Date.now()) {
    return ErrorCodes.INVALID_RESET_CODE;
  }
  if (!user || user.email != email || resetToken.nonce != nonce) {
    return ErrorCodes.INVALID_RESET_DATA;
  }
  return null;
}

/** Example output: "Xg4Z9mA2Lp"  */
function generateSecureResetCode(length = 10): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let resetCode = "";
  for (let i = 0; i < length; i++) {
    resetCode +=
      chars[crypto.getRandomValues(new Uint8Array(1))[0] % chars.length];
  }
  return resetCode;
}

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
