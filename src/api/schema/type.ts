import mongoose from "mongoose";

/** define type of transaction */
export enum TableType {
  Expense = "Expense",
  Income = "Income",
}

/** Structure of person use for database storage. */
export interface PersonTx {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** format: MM-yyyy */
  month: string;
  type: TableType;
  index: number;
  name: string;
  txs: Tx[];
  version: string;
}

export type PersonVersionId = {
  _id: string;
  version: string;
};

export type ChangedPersons = {
  addedPersons: PersonTx[];
  updatedPersons: PersonTx[];
  deletedPersons: string[];
};

/** structure of person data send by client. */
export type PersonInput = Prettify<
  Omit<PersonTx, "userId" | "_id"> & { _id: string }
>;

export type Conflicts = {
  conflictPersons?: ConflictPerson[];
};

export type ConflictPerson = {
  _id: string;
  isDeleted: boolean;
  txs?: { _id: string; isDeleted: boolean }[];
};

export type PersonDiff = {
  added?: PersonInput[];
  updated?: PersonPatch[];
  deleted?: string[];
};

export type PersonPatch = {
  _id: string;
  index?: number;
  name?: string;
  txDiff?: TxDiff;
  /** required field, use for caching purpose on client */
  version: string;
};

export type TxDiff = {
  added?: Tx[];
  updated?: TxPatch[];
  deleted?: string[];
};

/** Represents a single transaction. */
export interface Tx {
  _id: string;
  index: number;
  money?: number;
  tag?: string;
}

export type TxPatch = {
  _id: string;
  index?: number;
  money?: number;
  tag?: string;
};

export type UserData = {
  _id: string;
  name: string;
  email: string;
};

//
// password reset features type

export enum Status {
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
}

export type PasswordResetToken = {
  _id: mongoose.Types.ObjectId;
  resetCode: string;
  userId: mongoose.Types.ObjectId;
  expireIn: number;
  nonce: string;
};

export type PasswordResetInput = {
  resetCode: string;
  newPassword: string;
  nonce: string;
  email: string;
};
