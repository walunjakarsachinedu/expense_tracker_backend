const typeDefs = `#graphql
  type Query {
    hello: String
  }
  # type User {
  #   name: String
  #   email: String
  #   password: String
  # }

  # type Expense {
  #   userId: String
  #   date: String
  #   personExpenses: [
  #     {
  #       personName: String
  #       personExpense: [
  #         {
  #           money: Float
  #           tag: String
  #         }
  #       ]
  #     }
  #   ]
  # }
`;

export default typeDefs;

