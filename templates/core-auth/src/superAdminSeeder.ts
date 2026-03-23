import bcrypt from "bcrypt";
import { envConfig } from "./config/config.js";
import User from "./database/models/userModel.js";

const superAdminSeeder = async () => {
  const data = await User.findOne({
    where: {
      email: envConfig.superAdminEmail || "superadmin@nike.com"
    }
  });

  if (!data) {
    await User.create({
      username: envConfig.superAdminUsername || "superadmin",
      email: envConfig.superAdminEmail || "superadmin@nike.com",
      password: bcrypt.hashSync(envConfig.superAdminPassword || "superadmin123", 10),
      role: "super_admin",
      isVerified: true
    });

    console.log("Super Admin seeded successfully");
  } else {
    console.log("Super Admin already seeded");
  }
};

export default superAdminSeeder;

