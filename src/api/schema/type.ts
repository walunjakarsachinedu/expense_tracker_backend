const typeDefs = `#graphql
  enum Month { JANUARY FEBRUARY MARCH APRIL MAY JUNE JULY AUGUST SEPTEMBER OCTOBER NOVEMBER DECEMBER }

  type Query {
    hello(name: String): String 
    user: User @auth
    expenses: [Expense]  @auth
    expenseOfMonth(month: Month!, year: Int!): Expense @auth
  }

  type Mutation {
    login(email: String!, password: String!): String
    signup(name: String!, email: String!, password: String!): User
    addExpense(month: Month!, year: Int!): Expense @auth
    removeExpense(month: Month!, year: Int!): ID @auth
    addPerson(expenseId: String!, personName: String!): PersonExpense @auth
    removePerson(expenseId: String!, personId: ID!): ID @auth
    addPersonExpense(expenseId: String!, personId: ID!, expenseTag: ExpenseTagInput!): ExpenseTag @auth
    removePersonExpense(expenseId: String!, personId: ID!, expenseTagId: ID!): ID @auth
    updatePersonExpense(expenseId: String!, personId: ID!, expenseTagId: ID!, expenseTag: ExpenseTagInput!): ExpenseTag @auth
    updatePersonName(expenseId: String!, personId: ID!, name: String!) : String @auth
  }

  type User {
    _id: ID!
    name: String
    email: String
  }

  type Expense {
    _id: ID!
    userId: String!
    month: Month!
    year: Int
    personExpenses: [PersonExpense]!
  }

  type PersonExpense {
    _id: ID
    personName: String
    personExpense: [ExpenseTag]
  }

  type ExpenseTag {
    _id: ID!
    money: Float
    tag: String
  }

  input ExpenseTagInput {
    money: Float
    tag: String
  }
`;

export default typeDefs;

