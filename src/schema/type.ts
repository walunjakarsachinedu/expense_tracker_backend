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
    removeExpense(month: Month!, year: Int!): Expense @auth
    addPerson(expenseId: String!, personName: String!): Expense @auth
    removePerson(expenseId: String!, personId: ID!): Expense @auth
    # addPersonExpense(personId: ID!, expenseTag: ExpenseTag!): Expense @auth
    # removePersonExpense(personId: ID!, expenseTagId: ID!): Expense @auth
    # updatePersonExpense(personId: ID!, expenseTagId: ID!, expenseTag: ExpenseTag): Expense @auth
  }

  type User {
    _id: ID!
    name: String
    email: String
    password: String
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
`;

export default typeDefs;

