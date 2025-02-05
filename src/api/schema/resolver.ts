import bcrypt from "bcrypt";
import GraphQLJSON from "graphql-type-json";
import jwt, { SignOptions } from "jsonwebtoken";
import mongoose, { Types } from "mongoose";
import personUtils from "../../common/personUtils.js";
import { configPath, getConfig } from "../../config-path.js";
import Person from "../../db/persons.js";
import User from "../../db/users.js";
import { ErrorCodes, getError } from "../errors.js";
import {
  PersonData,
  PersonDiff,
  PersonDiffResponse,
  PersonMinimal,
  PersonTx,
  PersonWithoutId,
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
      const updates: {
        added?: PersonWithoutId[];
        deleted?: PersonDiff["deleted"];
        updated?: PersonTx[];
      } = {};

      if (diff.added) {
        updates.added = diff.added.map((person) => {
          return {
            ...person,
            userId: new mongoose.Types.ObjectId(context.userId),
          };
        });
      }
      if (diff.deleted) {
        updates.deleted = diff.deleted;
      }
      if (diff.updated) {
        const persons: PersonTx[] = await Person.find({
          _id: { $in: diff.updated.keys.map((id) => new Types.ObjectId(id)) },
        });
        updates.updated = personUtils
          .applyChanges({
            persons,
            operations: diff.updated.operations,
          })
          .map((person) =>
            personUtils.personToPersonTx(person, context.userId)
          );
      }

      const dbOperations: FirstArgument<typeof Person.collection.bulkWrite> =
        [];
      updates.added?.forEach((person) =>
        dbOperations.push({
          insertOne: { document: new Person(person).toObject() },
        })
      );
      updates.updated?.forEach((person) =>
        dbOperations.push({
          replaceOne: {
            filter: {
              _id: new mongoose.Types.ObjectId(person._id),
            },
            replacement: new Person(person).toObject(),
          },
        })
      );
      if (updates.deleted) {
        dbOperations.push({
          deleteMany: {
            filter: {
              _id: {
                $in: updates.deleted.map(
                  (id) => new mongoose.Types.ObjectId(id)
                ),
              },
            },
          },
        });
      }

      if (dbOperations.length > 0) {
        const response = await Person.collection.bulkWrite(dbOperations, {
          ordered: false,
        });
        return {
          added:
            updates.added && updates.added.length
              ? response.insertedIds
                ? Object.keys(response.insertedIds)
                    .sort((a, b) => Number(a) - Number(b))
                    .map((index) => response.insertedIds[index])
                : []
              : undefined,
          deleted:
            updates.deleted && updates.deleted.length
              ? response.deletedCount ?? 0
              : undefined,
        };
      }
      return { added: [], deleted: 0 };
    },
  },
};

export default queryResolvers;
