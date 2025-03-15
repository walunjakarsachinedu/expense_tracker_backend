const typeDefs = `#graphql
  scalar JSON

  enum TableType { Expense, Income } 

  type Query {
    hello(name: String): String 
    user: User @auth
    changedPersons(month: String!, personVersionIds: [PersonVersionId!]!): ChangedPersons! @auth
  }

  type Mutation {
    login(email: String!, password: String!): String
    signup(name: String!, email: String!, password: String!): String
    applyUpdates(diff: PersonDiff): Conflicts @auth # returns status
    sendPasswordResetCode(email: String!, nonce: String!): String # return expiration timestamp
    verifyResetCode(resetCode: String!, email: String!, nonce: String!): String # returns new reset code 
    resetPassword(passwordResetInput: PasswordResetInput): String # return token
  }

  input PasswordResetInput {
    resetCode: String!
    newPassword: String! 
    nonce: String!
    email: String!
  }

  type User {
    _id: ID!
    name: String!
    email: String!
  }

  type ChangedPersons {
    addedPersons: [Person!]!
    updatedPersons: [Person!]!
    deletedPersons: [String!]!
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

  input PersonVersionId {
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
