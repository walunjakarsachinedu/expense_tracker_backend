type Prettify<T> = { [K in keyof T]: T[K] } & unknown;
type FirstArgument<T extends (...args: unknown[]) => unknown> = T extends (
  arg1: infer A,
  ...args: unknown[]
) => unknown
  ? A
  : never;
