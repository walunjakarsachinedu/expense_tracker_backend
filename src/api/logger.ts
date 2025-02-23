import {
  ApolloServerPlugin,
  BaseContext,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from "@apollo/server";

const loggerPlugin: ApolloServerPlugin<BaseContext> = {
  async requestDidStart(
    _: GraphQLRequestContext<BaseContext>
  ): Promise<GraphQLRequestListener<BaseContext>> {
    return {
      async executionDidStart() {
        return {
          willResolveField({ info }) {
            const timestamp = new Date()
              .toISOString()
              .replace("T", " ")
              .replace("Z", " UTC");
            const blue = "\x1b[34m";
            const resetColor = "\x1b[0m";
            console.log(
              `📜 [${timestamp}] Before Execution → Type: ${blue}${info.parentType.name}${resetColor}, Field: ${info.fieldName}`
            );

            const startTime = process.hrtime(); // High-resolution timer

            return (error) => {
              const [seconds, nanoseconds] = process.hrtime(startTime);
              const durationMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(
                2
              );

              const endTimestamp = new Date()
                .toISOString()
                .replace("T", " ")
                .replace("Z", " UTC");

              console.log(
                `✅ [${endTimestamp}] After Execution (${durationMs}ms) → Type: ${blue}${info.parentType.name}${resetColor}, Field: ${info.fieldName}`
              );

              if (error) {
                console.error(
                  `❌ Error in ${info.parentType.name}.${info.fieldName}:`,
                  error
                );
              }
            };
          },
        };
      },
    };
  },
};

export default loggerPlugin;
