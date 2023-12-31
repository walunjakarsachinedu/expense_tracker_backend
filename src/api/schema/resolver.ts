import Expense from "../../db/expenses.js";
import User from "../../db/users.js";
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import {getError, ErrorCodes} from "../errors.js";
import mongoose, { sanitizeFilter } from "mongoose";
import bcrypt from "bcrypt";
import config from "config";
import {configPath, getConfig} from "../../config-path.js";


const queryResolvers = {
  Query: {
    hello : (_, args) => {
      return (args.name) ? `hello ${args.name}` : 'hi friend !!!';
    },
    user: async (parent, args, context, info) => {
      let user: any = await User.findById(context.userId).lean();
      if(!user) throw getError(ErrorCodes.USER_NOT_FOUND);
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
      const user = await User.findOne({email});
      if(!user) throw getError(ErrorCodes.INVALID_CREDENTIALS);
      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if(!isPasswordValid) throw getError(ErrorCodes.INVALID_CREDENTIALS);

      const payload = { name: user.name, email: user.email };
      const jwtSecret: string = getConfig(configPath.jwt_secret);
      const jwtConfig: SignOptions = { subject: user._id.toString(), expiresIn: "1d"};
      return jwt.sign(payload, jwtSecret, jwtConfig);
    },
    signup: async (parent, {name, email, password}, context, info) => {
      const saltRound = 10;
      password = bcrypt.hashSync(password, saltRound);
      const existingUser = await User.findOne({email});
      if(existingUser) throw getError(ErrorCodes.USER_ALREADY_EXISTS);

      const user = await User.create({name, email, password});
      delete user.password, delete user._id;
      return user;
    },
    addExpense: async (parent, args, context, info) => {
      const existingExpense = await Expense
        .where('userId').equals(context.userId)
        .where('month').equals(args.month)
        .where('year').equals(args.year);
      if(existingExpense && existingExpense.length > 0) throw getError(ErrorCodes.EXPENSE_ALREADY_EXIST);
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
      if(!expense) throw getError(ErrorCodes.EXPENSE_NOT_FOUND);
      return expense._id;
    },
    addPerson: async (parent, args, context, info) => {
      const expense = await Expense.findById(args.expenseId);
      if(!expense) throw getError(ErrorCodes.EXPENSE_NOT_FOUND);
      const person = {
        _id: new mongoose.Types.ObjectId().toString(),
        personName: args.personName,
        personExpense: []
      };
      expense.personExpenses.push(person);
      await expense.save();
      return person;
    },
    removePerson: async (parent, args, context, info) => {
      const expense = await Expense.findById(args.expenseId); 
      if(!expense) throw getError(ErrorCodes.EXPENSE_NOT_FOUND);
      const person = expense.personExpenses.find(person => person._id == args.personId);
      if(!person) throw getError(ErrorCodes.PERSON_NOT_FOUND_IN_EXPENSE);
      expense.personExpenses = expense.personExpenses.filter(person => person._id != args.personId);
      await expense.save();
      return args.expenseId; 
    },
    addPersonExpense: async (parent, args, context, info) => {
      const expense = await Expense.findById(args.expenseId); 
      if(!expense) throw getError(ErrorCodes.EXPENSE_NOT_FOUND);
      const person = expense.personExpenses.find(person => person._id == args.personId);
      if(!person) throw getError(ErrorCodes.PERSON_NOT_FOUND_IN_EXPENSE);

      const expenseTag = {
        _id: new mongoose.Types.ObjectId().toString(),
        money: args.expenseTag.money,
        tag: args.expenseTag.tag,
      }
      person.personExpense.push(expenseTag);
      await expense.save();
      return expenseTag;
    },
    removePersonExpense: async (parent, args, context, info) => {
      const expense = await Expense.findById(args.expenseId); 
      if(!expense) throw getError(ErrorCodes.EXPENSE_NOT_FOUND);
      const person = expense.personExpenses.find(person => person._id == args.personId);
      if(!person) throw getError(ErrorCodes.PERSON_NOT_FOUND_IN_EXPENSE);
      const expenseTag = person.personExpense.find(expenseTag => expenseTag._id == args.expenseTagId);
      if(!expenseTag) throw getError(ErrorCodes.EXPENSE_TAG_NOT_FOUND_IN_PERSON_EXPENSE);

      person.personExpense = person.personExpense.filter(expTag => expTag != expenseTag);
      await expense.save();
      return args.expenseId;
    },
    updatePersonExpense: async (parent, args, context, info) => {
      const expense = await Expense.findById(args.expenseId); 
      if(!expense) throw getError(ErrorCodes.EXPENSE_NOT_FOUND);
      const person = expense.personExpenses.find(person => person._id == args.personId);
      if(!person) throw getError(ErrorCodes.PERSON_NOT_FOUND_IN_EXPENSE);
      const expenseTag = person.personExpense.find(expenseTag => expenseTag._id == args.expenseTagId);
      if(!expenseTag) throw getError(ErrorCodes.EXPENSE_TAG_NOT_FOUND_IN_PERSON_EXPENSE);

      if(args.expenseTag.money) expenseTag.money = args.expenseTag.money;
      if(args.expenseTag.tag) expenseTag.tag = args.expenseTag.tag;
      await expense.save();
      return expenseTag;
    },
    updatePersonName: async (parent, args, context, info) => {
      const expense = await Expense.findById(args.expenseId); 
      if(!expense) throw getError(ErrorCodes.EXPENSE_NOT_FOUND);
      const person = expense.personExpenses.find(person => person._id == args.personId);
      if(!person) throw getError(ErrorCodes.PERSON_NOT_FOUND_IN_EXPENSE);
      person.personName = args.name;
      await expense.save();
      return args.name;
    }
  },
};


export default queryResolvers;