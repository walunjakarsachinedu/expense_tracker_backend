const typeDefs = `#graphql
  scalar JSON

  enum TableType { Expense, Income } 

  type Query {
    hello(name: String): String 
    user: User @auth
    personsOfMonth(month: String!): [PersonMinimal!]! @auth
    persons(ids: [String]): [Person!]! @auth
  }

  type Mutation {
    login(email: String!, password: String!): String
    signup(name: String!, email: String!, password: String!): User
    applyUpdates(diff: PersonDiff): PersonDiffResponse @auth # returns status
  }

  type User {
    _id: ID!
    name: String!
    email: String!
  }

  type Person {
    _id: ID!
    month: String!
    type: TableType!
    index: Int!
    name: String
    txs: [Tx]!
    version: String!
  }

  type Tx {
    index: Int!
    money: Float
    tag: String
  }

  type PersonMinimal {
    _id: ID!
    version: String!
  }

  type PersonDiffResponse {
    # list of ids of person in same order of person provided in input
    added: [String!]
    deleted: Int
  }

  input PersonDiff {
    added: [PersonInput!]
    updated: UpdatedInput
    deleted: [String!]
  }

  input PersonInput {
    month: String!
    type: TableType!
    index: Int!
    name: String!
    txs: [TxInput]!
    version: String!
  }

  input TxInput {
    index: Int!
    money: Float
    tag: String
  }

  input UpdatedInput {
    keys: [String]
    operations: [JSON!]
  }
`;

export default typeDefs;
