import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { Sequelize } from "sequelize-typescript";
import { envConfig } from "../config/config.js";
import User from "./models/userModel.js";

const sequelize = new Sequelize(envConfig.dbUrl as string, {
  models: [User],
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: false
});

export default sequelize;

