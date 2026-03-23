import http from "node:http";
import { envConfig } from "./src/config/config.js";
import app from "./src/app.ts";
import sequelize from "./src/database/connection.js";
import adminSeeder from "./src/adminSeeder.js";
import superAdminSeeder from "./src/superAdminSeeder.js";

function startServer() {
  const host = process.env.HOST || "0.0.0.0";
  const port = envConfig.port || 3000;

  try {
    console.log("Starting server...");
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

    const server = http.createServer(app);

    server.listen(Number(port), host, async () => {
      console.log(`Server is running on port ${port}`);

      // Wait for database sync to complete
      if (envConfig.databaseUrl) {
        try {
          await sequelize.authenticate();
          console.log("✅ Database connection verified");

          await sequelize.sync({ force: false, alter: false });
          console.log("✅ Database synchronized successfully");

          await adminSeeder();
          await superAdminSeeder();
        } catch (error: any) {
          console.error("Error syncing database:", error);

          // If tables already exist, continue (common with sync/seed in dev)
          if (error?.name === "SequelizeUniqueConstraintError") {
            console.log("⚠️ Database seed continued despite unique constraints...");
          } else if (error?.parent?.code === "23505") {
            console.log("⚠️ Database seed continued despite unique constraints...");
          } else {
            if (process.env.NODE_ENV === "production") {
              console.log("Continuing without database sync in production...");
            } else {
              throw error;
            }
          }
        }
      } else {
        console.log("Skipping database sync - no database connection");
      }
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

// For production deployment
startServer();

// Export for serverless deployment
export default startServer;

