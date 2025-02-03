import { createGraphQLError } from "@graphql-tools/utils";
import { GraphQLError } from "graphql";

enum ErrorCodes {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  EXPENSE_ALREADY_EXIST = "EXPENSE_ALREADY_EXIST",
  EXPENSE_NOT_FOUND = "EXPENSE_NOT_FOUND",
  PERSON_NOT_FOUND_IN_EXPENSE = "PERSON_NOT_FOUND_IN_EXPENSE",
  EXPENSE_TAG_NOT_FOUND_IN_PERSON_EXPENSE = "EXPENSE_TAG_NOT_FOUND_IN_PERSON_EXPENSE",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",
}

const errorData: { [key in ErrorCodes]: { message: string; httpCode } } = {
  [ErrorCodes.INVALID_CREDENTIALS]: {
    message: "Either email or password is invalid.",
    httpCode: 401,
  },
  [ErrorCodes.USER_ALREADY_EXISTS]: {
    message: "User already exists. Please log in.",
    httpCode: 409,
  },
  [ErrorCodes.UNAUTHENTICATED]: {
    message: "Unauthorized: Token not provided or invalid token provided.",
    httpCode: 401,
  },
  [ErrorCodes.USER_NOT_FOUND]: {
    message: "User not Found.",
    httpCode: 404,
  },
  [ErrorCodes.EXPENSE_ALREADY_EXIST]: {
    message: "Expense for given month already exists.",
    httpCode: 409,
  },
  [ErrorCodes.EXPENSE_NOT_FOUND]: {
    message: "Expense not found.",
    httpCode: 404,
  },
  [ErrorCodes.PERSON_NOT_FOUND_IN_EXPENSE]: {
    message: "Person not found in expense.",
    httpCode: 404,
  },
  [ErrorCodes.EXPENSE_TAG_NOT_FOUND_IN_PERSON_EXPENSE]: {
    message: "Expense tag not found in person expenses.",
    httpCode: 404,
  },
  [ErrorCodes.TOKEN_EXPIRED]: {
    message: "Token is expired, revoke the token with login query.",
    httpCode: 401,
  },
  [ErrorCodes.INVALID_TOKEN]: {
    message: "Token is invalid. Please provide valid token.",
    httpCode: 401,
  },
};

function getError(errorCode: ErrorCodes): GraphQLError {
  const err = errorData[errorCode];
  return createGraphQLError(err.message, {
    extensions: {
      code: errorCode,
      httpStatus: err.httpCode,
    },
  });
}

export { getError, ErrorCodes };
