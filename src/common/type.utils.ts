import mongoose from "mongoose";

export type Prettify<T> = { [K in keyof T]: T[K] } & unknown;
export type FirstArgument<T extends (...args: unknown[]) => unknown> =
  T extends (arg1: infer A, ...args: unknown[]) => unknown ? A : never;

export type ModelType<T> = mongoose.Document<unknown, {}, T> &
  T &
  Required<{
    _id: mongoose.Types.ObjectId;
  }>;
