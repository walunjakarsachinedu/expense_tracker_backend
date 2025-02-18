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
    applyUpdates(diff: PersonDiff): Conflicts @auth # returns status
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
    name: String!
    txs: [Tx!]
    version: String!
  }

  type Tx {
    _id: ID!
    index: Int!
    money: Float
    tag: String
  }

  type PersonMinimal {
    _id: ID!
    version: String!
  }


  input PersonDiff {
    added: [PersonInput!]
    updated: [PersonPatch!]
    deleted: [String!]
  }

  input PersonInput {
    _id: ID!
    month: String!
    type: TableType!
    index: Int!
    name: String!
    txs: [TxInput!]!
    version: String!
  }


  input PersonPatch {
    _id: ID!
    index: Int
    name: String
    txDiff: TxDiff
    version: String!
  }
  
  input TxDiff {
    added: [TxInput!]
    updated: [TxPatch!]
    deleted: [String!]
  }


  input TxInput {
    _id: ID!
    index: Int!
    money: Float
    tag: String
  }

  input TxPatch {
    _id: ID!
    index: Int
    money: Float
    tag: String
  }

  type Conflicts {
    # Persons deleted by another login during update  
    conflictPersons: [ConflictPerson!]
  }

  type ConflictPerson {
    _id: String!
    # Indicates if the person is deleted  
    isDeleted: Boolean!
    txs: [ConflictTx!]
  }

  # Transactions deleted by another login during update  
  type ConflictTx {
    _id: String!
    # Indicates if the transaction is deleted  
    isDeleted: Boolean!
  }

`;

export default typeDefs;
