import { Operation } from "fast-json-patch";
import mongoose, { ObjectId } from "mongoose";

/** define type of transaction */
export enum TableType {
  Expense = "Expense",
  Income = "Income",
}

/** Represents a single transaction. */
export interface Tx {
  index: number;
  money?: string;
  tag?: string;
}

/** Structure of person used by client.  */
export interface PersonData {
  _id: string;
  /** format: MM-yyyy */
  month: string;
  type: TableType;
  index: number;
  name: string;
  // map of tx.index -> tx
  txs: Record<string, Tx>;
  txIds: number[];
  version: string;
}

/** Structure of person use for database storage. */
export interface PersonTx {
  _id: ObjectId;
  userId: mongoose.Types.ObjectId;
  /** format: MM-yyyy */
  month: string;
  type: TableType;
  index: number;
  name: string;
  txs: Tx[];
  version: string;
}

export type PersonWithoutId = Omit<PersonTx, "_id">;

/** structure of person data send by client. */
export type PersonInput = Omit<PersonWithoutId, "userId">;

export type PersonDiff = {
  added?: PersonInput[];
  updated?: {
    keys: string[];
    operations: Operation[];
  };
  deleted?: string[];
};

export type PersonDiffResponse = {
  added?: string[];
  deleted?: number;
};

export type PersonMinimal = {
  _id: string;
  version: string;
};

export type UserData = {
  _id: string;
  name: string;
  email: string;
};
