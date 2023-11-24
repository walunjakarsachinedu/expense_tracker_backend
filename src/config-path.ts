import config from 'config';

const configPath = {
  mongodb : {
    username: "mongodb.username",
    password: "mongodb.password",
    dbName: "mongodb.dbName"
  },
  jwt_secret: "jwt_secret",
  graphql: {
    introspection: "graphql.introspection"
  }
}


/** 
 * @param {string} configPath - takes path to configuration from configPath object
 * */ 
function getConfig(configPath: string): string {
  return config.get(configPath);
}


export {configPath, getConfig};