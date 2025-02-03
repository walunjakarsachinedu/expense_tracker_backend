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
    applyUpdates(diff: PersonDiff): String @auth # returns status
  }

  type User {
    _id: ID!
    name: String
    email: String
  }

  type Person {
    _id: ID
    month: String!
    type: TableType
    index: Int
    name: String
    txs: [Tx]
    version: String
  }

  type Tx {
    _id: ID!
    money: Float
    tag: String
    index: Int
  }

  type PersonMinimal {
    _id: ID!
    version: String!
  }

  input PersonDiff {
    added: [PersonInput!]
    updated: UpdatedInput
    deleted: [String!]
  }

  input PersonInput {
    _id: ID
    month: String!
    type: TableType
    index: Int
    name: String
    txs: [TxInput] 
    version: String
  }

  input TxInput {
    _id: ID!
    money: Float
    tag: String
    index: Int
  }

  input UpdatedInput {
    keys: [String]
    operations: [JSON!]
  }
`;

export default typeDefs;
