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
      let user: any = await User.findById(context.userId).lean();
      if(!user) throw GraphqlErrors.USER_NOT_FOUND;
      delete user["password"];
      return user;
    },
    expenses: async (parent, args, context, info) => {
      const expenses = await Expense.where('userId').equals(context.userId);
      return expenses;
    },
    expenseOfMonth: async (parent, args, context, info) => {
      const expense = await Expense
        .where('userId').equals(context.userId)
        .where('month').equals(args.month)
        .where('year').equals(args.year);
      return expense && expense?.length > 0 ? expense[0] : null;
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
      delete user.password, delete user._id;
      return user;
    },
    addExpense: async (parent, args, context, info) => {
      const existingExpense = await Expense
        .where('userId').equals(context.userId)
        .where('month').equals(args.month)
        .where('year').equals(args.year);
      if(existingExpense && existingExpense.length > 0) throw GraphqlErrors.EXPENSE_ALREADY_EXIST;
      const expense = await Expense.create({
        userId: context.userId,
        month: (<String>args.month).toUpperCase(),
        year: args.year,
        personExpenses: [],
      }); 
      return expense;
    },
    removeExpense: async (parent, args, context, info) => {
      const expense = await Expense.findOneAndDelete({
        'userId': context.userId,
        'month': args.month,
        'year': args.year,
      }).lean();
      return expense;
    }
  }
};


export default queryResolvers;