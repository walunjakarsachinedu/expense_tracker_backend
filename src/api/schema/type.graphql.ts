const typeDefs = `#graphql
  scalar JSON

  enum TableType { Expense, Income, UpcomingExpense } 

  type Query {
    hello(name: String): String 
    user: User @auth
  }

  type Mutation {
    # auth related
    login(email: String!, password: String!): String
    signup(name: String!, email: String!, password: String!): String
    # syncing changes related
    syncChanges(diff: MonthDiff, month: String!, currentState: CurrentState): Changes! @auth
    # password reset features related
    sendPasswordResetCode(email: String!, nonce: String!): String # return expiration timestamp
    verifyResetCode(resetCode: String!, email: String!, nonce: String!): String # returns new reset code 
    changePassword(passwordResetInput: PasswordResetInput): String # return token
  }

  type Changes {
    conflictsPersons: [ConflictPerson!]! 
    changedPersons: ChangedPersons!
    monthlyNotes: MonthlyNotes
  }

  type MonthlyNotes {
    _id: ID!
    notes: String!
    version: String!
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
    performedAt: Int
  }

  input VersionId {
    _id: ID!
    version: String!
  }


  input MonthDiff {
    added: [PersonInput!]
    updated: [PersonPatch!]
    deleted: [String!]
    monthlyNotes: MonthlyNotesInput
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
    performedAt: Int
  }

  input TxPatch {
    _id: ID!
    index: Int
    money: Float
    tag: String
    performedAt: Int
  }

  input MonthlyNotesInput {
    _id: ID!
    notes: String!
    version: String!
  }

  input CurrentState {
    personVersionIds: [VersionId!]!
    monthlyNotesVersionId: VersionId
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
