import { MapperKind, getDirective, mapSchema } from "@graphql-tools/utils";
import { GraphQLSchema } from "graphql";
import { getError, ErrorCodes } from "../errors.js";

function authDirective(directiveName: string) {
  return {
    authDirectiveTypeDefs: `#graphql
      directive @${directiveName}(name: String) on OBJECT | FIELD_DEFINITION
    `,
    authDirectiveTransformerFunction: (schema: GraphQLSchema) => {
      return mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (
          fieldConfig,
          fieldName,
          typeName,
          schema
        ) => {
          const authDir = getDirective(schema, fieldConfig, directiveName);
          if (!authDir) return fieldConfig;
          const resolver = fieldConfig.resolve;
          fieldConfig.resolve = (source, args, context, info) => {
            if (context.tokenError) throw context.tokenError;
            if (!context.user) throw getError(ErrorCodes.UNAUTHENTICATED);
            return resolver?.(source, args, context, info);
          };
          return fieldConfig;
        },
      });
    },
  };
}

export default authDirective;
