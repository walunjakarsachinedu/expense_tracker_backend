const typeDefs = `#graphql
  enum Month { JANUARY FEBRUARY MARCH APRIL MAY JUNE JULY AUGUST SEPTEMBER OCTOBER NOVEMBER DECEMBER }

  type Query {
    hello(name: String): String 
    user: User @auth
    expenses: [Expense]  @auth
    expenseOfMonth(month: Month!): Expense @auth
  }

  type Mutation {
    login(email: String!, password: String!): String
    signup(name: String!, email: String!, password: String!): User
    # addExpense(userId: String!, month: Month!): Expense
    # addPerson(personName: String!): PersonExpense @auth
    # removePerson(personID: ID!): PersonExpense @auth
    # addPersonExpense(personId: ID!, expenseTag: ExpenseTag!): Expense @auth
    # removePersonExpense(personId: ID!, expenseTagId: ID!): Expense @auth
    # updatePersonExpense(personId: ID!, expenseTagId: ID!, expenseTag: ExpenseTag): Expense @auth
  }

  type User {
    id: ID!
    name: String
    email: String
    password: String
  }

  type Expense {
    userId: String!
    month: Month!
    personExpenses: [PersonExpense]!
  }

  type PersonExpense {
    id: ID!
    personName: String
    personExpense: [ExpenseTag]
  }

  type ExpenseTag {
    id: ID
    money: Float
    tag: String
  }
`;

export default typeDefs;

