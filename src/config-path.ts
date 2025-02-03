import config from "config";

// class added to add typesafty to getConfig function argument
class ConfigValue {
  constructor(public value: string) {}
}

/**
 * @param {ConfigValue} configValue - it take value from configPath object
 * */
function getConfig(configValue: ConfigValue): any {
  return config.get(configValue.value);
}

const configPath = {
  mongodb: {
    username: new ConfigValue("mongodb.username"),
    password: new ConfigValue("mongodb.password"),
    dbName: new ConfigValue("mongodb.dbName"),
  },
  jwt_secret: new ConfigValue("jwt_secret"),
  graphql: {
    introspection: new ConfigValue("graphql.introspection"),
  },
};

export { configPath, getConfig };
