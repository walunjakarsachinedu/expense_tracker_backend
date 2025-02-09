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

export type PersonMinimal = {
  _id: string;
  version: string;
};

/** structure of person data send by client. */
export type PersonInput = Prettify<
  Omit<PersonTx, "userId" | "_id"> & { _id: string }
>;

export type PersonDiffResponse = {
  added?: AddedPersonId[];
  updated?: UpdatedPersonId[];
  deleted?: string[];
};

export type AddedPersonId = {
  _id: StoredId;
  txs: StoredId[];
};

export type UpdatedPersonId = {
  _id: string;
  txs?: StoredId[];
  deletedTxs?: string[];
};

export type StoredId = {
  // tmporary id send by user to create an entity
  tmpId: string;
  // id use by server to store an entity
  storedId: string;
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
  money?: string;
  tag?: string;
}

export type TxPatch = {
  _id: string;
  index?: number;
  money?: string;
  tag?: string;
};

export type UserData = {
  _id: string;
  name: string;
  email: string;
};
