import bcrypt from "bcrypt";
import { envConfig } from "./config/config.js";
import User from "./database/models/userModel.js";

const adminSeeder = async () => {
  const data = await User.findOne({
    where: {
      email: envConfig.admin
    }
  });

  if (!data) {
    await User.create({
      username: envConfig.admin_username,
      email: envConfig.admin,
      password: bcrypt.hashSync(envConfig.passwordAdmin as string, 10),
      role: "admin",
      isVerified: true
    });

    console.log("Admin seeded successfully");
  } else {
    console.log("Admin already seeded");
  }
};

export default adminSeeder;

