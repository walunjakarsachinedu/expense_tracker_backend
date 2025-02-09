import bcrypt from "bcrypt";
import GraphQLJSON from "graphql-type-json";
import jwt, { SignOptions } from "jsonwebtoken";
import { AnyBulkWriteOperation, BSON } from "mongodb";
import mongoose, { InferSchemaType, Types } from "mongoose";
import { configPath, getConfig } from "../../config-path.js";
import Person from "../../db/persons.js";
import User from "../../db/users.js";
import { ErrorCodes, getError } from "../errors.js";
import {
  AddedPersonId,
  UpdatedPersonId,
  PersonDiff,
  PersonDiffResponse,
  PersonMinimal,
  PersonPatch,
  PersonTx,
  TxPatch,
  UserData,
} from "./type.js";

const queryResolvers = {
  JSON: GraphQLJSON,
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
    personsOfMonth: async (parent, args: { month: string }, context, info) => {
      const persons = await Person.where("userId")
        .equals(context.userId)
        .where("month")
        .equals(args.month)
        .select("_id version")
        .lean();
      return persons.map<PersonMinimal>((person) => ({
        _id: person._id.toString(),
        version: person.version,
      }));
    },
    persons: async (parent, { ids }, context, info) => {
      const persons: PersonTx[] = await Person.find({
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
      });
      return persons;
    },
  },
  Mutation: {
    login: async (parent, { email, password }, context, info) => {
      const user = await User.findOne({ email });
      if (!user) throw getError(ErrorCodes.INVALID_CREDENTIALS);
      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) throw getError(ErrorCodes.INVALID_CREDENTIALS);

      const payload = { name: user.name, email: user.email };
      const jwtSecret: string = getConfig(configPath.jwt_secret);
      const jwtConfig: SignOptions = {
        subject: user._id.toString(),
        expiresIn: "1d",
      };
      return jwt.sign(payload, jwtSecret, jwtConfig);
    },
    signup: async (parent, { name, email, password }, context, info) => {
      const saltRound = 10;
      password = bcrypt.hashSync(password, saltRound);
      const existingUser = await User.findOne({ email });
      if (existingUser) throw getError(ErrorCodes.USER_ALREADY_EXISTS);

      const userDb = await User.create({ name, email, password });

      const user: UserData = {
        _id: userDb._id.toString(),
        name: userDb.name,
        email: userDb.email,
      };
      return user;
    },

    applyUpdates: async (
      parent,
      { diff }: { diff: PersonDiff },
      context,
      info
    ): Promise<PersonDiffResponse> => {
      const dbOperations: AnyBulkWriteOperation<
        InferSchemaType<typeof Person.schema>
      >[] = [];

      const idMappingResult = mapTempIdsToServerIds(diff);
      diff = idMappingResult.personDiff;
      const personDiffResponse: PersonDiffResponse =
        idMappingResult.personDiffResponse;

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
      return personDiffResponse;
    },
  },
};

/**
 * Associate each entity with new id and use user provided temporary id & new id to prepare `PersonDiffResponse`.
 */
function mapTempIdsToServerIds(personDiff: PersonDiff): {
  personDiff: PersonDiff;
  personDiffResponse: PersonDiffResponse;
} {
  const personDiffResponse: PersonDiffResponse = {};

  if (personDiff.added?.length) {
    personDiffResponse.added = [];
    personDiff.added?.forEach((person) => {
      const tmpId = person._id;
      const storedId = new mongoose.Types.ObjectId();
      person._id = storedId.toHexString();

      const txs: AddedPersonId["txs"] = person.txs.map((tx) => {
        const tmpId = tx._id;
        const storedId = new mongoose.Types.ObjectId();
        tx._id = storedId.toHexString();
        return { tmpId: tmpId.toString(), storedId: storedId.toHexString() };
      });
      personDiffResponse.added?.push({
        _id: { tmpId: tmpId, storedId: storedId.toHexString() },
        txs,
      });
    });
  }

  if (personDiff.updated?.length) {
    personDiffResponse.updated = [];
    personDiff.updated.forEach((personPatch) => {
      const updatedPersonId: UpdatedPersonId = { _id: personPatch._id };
      if (personPatch.txDiff?.added?.length) {
        updatedPersonId.txs = personPatch.txDiff?.added?.map((tx) => {
          const tmpId = tx._id;
          const storedId = new mongoose.Types.ObjectId();
          tx._id = storedId.toHexString();
          return {
            tmpId: tmpId.toString(),
            storedId: storedId.toHexString(),
          };
        });
      }
      if (personPatch.txDiff?.deleted?.length) {
        updatedPersonId.deletedTxs = personPatch.txDiff.deleted;
      }
      personDiffResponse.updated!.push(updatedPersonId);
    });
  }

  if (personDiff.deleted?.length) {
    personDiffResponse.deleted = personDiff.deleted;
  }

  return { personDiff, personDiffResponse };
}

export default queryResolvers;
