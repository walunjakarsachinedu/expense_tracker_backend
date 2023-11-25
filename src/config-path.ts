import config from "config";

// class added to add typesafty to getConfig function argument
class ConfigValue { 
  constructor(public value: string) {} 
}

// configuration compatible with netlify
const myConfig = {
  "mongodb.username": process.env["expense_tracker_app_mongodb_username"],
  "mongodb.password": process.env["expense_tracker_app_mongodb_password"],
  "mongodb.dbName": "expense-tracker-app-data",
  "jwt_secret": process.env["expense_tracker_app_jwt_secret"],
  "graphql.introspection": true
};


/** 
 * @param {ConfigValue} configValue - it take value from configPath object
 * */ 
function getConfig(configValue: ConfigValue): string {
  return (process.env.environment == "local") ? config.get(configValue.value) : myConfig[configValue.value] ;
}


const configPath = {
  mongodb : {
    username: new ConfigValue("mongodb.username"),
    password: new ConfigValue("mongodb.password"),
    dbName: new ConfigValue("mongodb.dbName"),
  },
  jwt_secret: new ConfigValue("jwt_secret"),
  graphql: {
    introspection: new ConfigValue("graphql.introspection"),
  }
}

export {configPath, getConfig};