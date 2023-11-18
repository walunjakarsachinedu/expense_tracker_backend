import { createGraphQLError } from '@graphql-tools/utils';
import { GraphQLError } from 'graphql';

enum ErrorCodes {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  EXPENSE_ALREADY_EXIST = "EXPENSE_ALREADY_EXIST"
}


const GraphqlErrors: { [key in ErrorCodes]: GraphQLError } = {
  [ErrorCodes.INVALID_CREDENTIALS]: createGraphQLError("Either email or password is invalid.", { extensions: { code: ErrorCodes.INVALID_CREDENTIALS } }),
  [ErrorCodes.USER_ALREADY_EXISTS]: createGraphQLError("User already exists. Please log in.", { extensions: { code: ErrorCodes.USER_ALREADY_EXISTS } }),
  [ErrorCodes.UNAUTHENTICATED]: createGraphQLError("Unauthorized: Token not provided or invalid token provided.", { extensions: { code: ErrorCodes.UNAUTHENTICATED } }),
  [ErrorCodes.USER_NOT_FOUND]: createGraphQLError('User not Found.', { extensions: { code: ErrorCodes.USER_NOT_FOUND } }),
  [ErrorCodes.EXPENSE_ALREADY_EXIST]: createGraphQLError("Expense for given month already exists.", { extensions: { code: ErrorCodes.EXPENSE_ALREADY_EXIST } }),
};

export default GraphqlErrors;