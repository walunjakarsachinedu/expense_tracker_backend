import { createGraphQLError } from '@graphql-tools/utils';
import { GraphQLError } from 'graphql';

enum ErrorCodes {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  EXPENSE_ALREADY_EXIST = "EXPENSE_ALREADY_EXIST",
  EXPENSE_NOT_FOUND = "EXPENSE_NOT_FOUND",
  PERSON_NOT_FOUND_IN_EXPENSE = "PERSON_NOT_FOUND_IN_EXPENSE",
  EXPENSE_TAG_NOT_FOUND_IN_PERSON_EXPENSE = "EXPENSE_TAG_NOT_FOUND_IN_PERSON_EXPENSE",
  TOKEN_EXPIRED = "TOKEN_EXPIRED"
  
}


const GraphqlErrors: { [key in ErrorCodes]: GraphQLError } = {
  [ErrorCodes.INVALID_CREDENTIALS]: createGraphQLError("Either email or password is invalid.", { extensions: { code: ErrorCodes.INVALID_CREDENTIALS } }),
  [ErrorCodes.USER_ALREADY_EXISTS]: createGraphQLError("User already exists. Please log in.", { extensions: { code: ErrorCodes.USER_ALREADY_EXISTS } }),
  [ErrorCodes.UNAUTHENTICATED]: createGraphQLError("Unauthorized: Token not provided or invalid token provided.", { extensions: { code: ErrorCodes.UNAUTHENTICATED } }),
  [ErrorCodes.USER_NOT_FOUND]: createGraphQLError('User not Found.', { extensions: { code: ErrorCodes.USER_NOT_FOUND } }),
  [ErrorCodes.EXPENSE_ALREADY_EXIST]: createGraphQLError("Expense for given month already exists.", { extensions: { code: ErrorCodes.EXPENSE_ALREADY_EXIST } }),
  [ErrorCodes.EXPENSE_NOT_FOUND]: createGraphQLError("Expense not found.", { extensions: { code: ErrorCodes.EXPENSE_NOT_FOUND } }),
  [ErrorCodes.PERSON_NOT_FOUND_IN_EXPENSE]: createGraphQLError("Person not found in expense.", { extensions: { code: ErrorCodes.PERSON_NOT_FOUND_IN_EXPENSE } }),
  [ErrorCodes.EXPENSE_TAG_NOT_FOUND_IN_PERSON_EXPENSE]: createGraphQLError("Expense tag not found in person expenses.", { extensions: { code: ErrorCodes.EXPENSE_TAG_NOT_FOUND_IN_PERSON_EXPENSE } }),
  [ErrorCodes.TOKEN_EXPIRED]: createGraphQLError("Token is expired, revoke the token with login query.", { extensions: { code: ErrorCodes.TOKEN_EXPIRED } }),
};

export default GraphqlErrors;