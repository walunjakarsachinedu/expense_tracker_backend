import { Operation } from "fast-json-patch";
import { ObjectId } from "mongoose";

/** define type of transaction */
export enum TableType {
  Expense = "Expense",
  Income = "Income",
}

/** Represents a single transaction. */
export interface Tx {
  _id: string;
  money?: string;
  tag?: string;
  index: number;
}

/** Sturcture of person for client use.  */
export interface PersonData {
  _id: string;
  /** format: MM-yyyy */
  month: string;
  type: TableType;
  index: number;
  name: string;
  txs: Record<string, Tx>;
  txIds: string[];
  version: string;
}

/** Structure of person for provided interaction. */
export interface PersonTx {
  _id?: ObjectId;
  month: string;
  type: TableType;
  index: number;
  name: string;
  txs: Tx[];
  version: string;
}

export type PersonDiff = {
  added: PersonTx[];
  updated: {
    keys: string[];
    operations: Operation[];
  };
  deleted: string[];
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
