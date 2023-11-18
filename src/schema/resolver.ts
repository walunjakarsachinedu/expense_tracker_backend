import Expense from "../config/db/expenses.js";
import User from "../config/db/users.js";
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import GraphqlErrors from "../config/api/errors.js";

const queryResolvers = {
  Query: {
    hello : (_, args) => {
      return (args.name) ? `hello ${args.name}` : 'hi friend !!!';
    },
    user: async (parent, args, context, info) => {
      const userId = context.user.sub;
      let user: any = userId ? await User.findById(userId).lean() : null;
      if(!user) throw GraphqlErrors.USER_NOT_FOUND;

      delete user["password"];
      return user;
    },
    expenses: async (parent, args, context, info) => {
      const userId = context.user.sub;
      return userId ? await Expense.where('userId').equals(userId) : null;
    } 
  },
  Mutation: {
    login: async (parent, {email, password}, context, info) => {
      const user = await User.findOne({email, password});
      if(!user) throw GraphqlErrors.INVALID_CREDENTIALS;

      const payload = { name: user.name, email: user.email };
      const secret_key: Secret = "**** my_secret_key ****";
      const config: SignOptions = { subject: user._id.toString(), expiresIn: "1d"};
      return jwt.sign(payload, secret_key, config);
    },
    signup: async (parent, {name, email, password}, context, info) => {
      const existingUser = await User.findOne({email, password});
      if(existingUser) throw GraphqlErrors.USER_ALREADY_EXISTS;

      const user = await User.create({name, email, password});
      user.id = user._id;
      delete user.password;
      delete user.id;
      return user;
    },
  }
};


export default queryResolvers;