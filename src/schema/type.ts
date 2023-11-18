const typeDefs = `#graphql
  type Query {
    hello(name: String): String 
    user: User @auth
    expenses: [Expense]  @auth
  }

  type Mutation {
    login(email: String!, password: String!): String
    signup(name: String!, email: String!, password: String!): User
  }

  type User {
    id: ID!
    name: String
    email: String
    password: String
  }

  type Expense {
    userId: String
    date: String
    personExpenses: [PersonExpense]
  }

  type PersonExpense {
    id: ID!
    personName: String
    personExpense: [MoneyTag]
  }

  type MoneyTag {
    money: Float
    tag: String
  }
`;

export default typeDefs;

