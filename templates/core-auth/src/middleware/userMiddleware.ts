import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { envConfig } from "../config/config.js";
import User from "../database/models/userModel.js";

export enum Role {
  Admin = "admin",
  Customer = "customer",
  SuperAdmin = "super_admin"
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        username: string;
        email: string;
        role: string;
        password?: string;
        id: string;
      };
    }
  }
}

class UserMiddleware {
  async isUserLoggedIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tokenHeader = req.headers.authorization;
    const token = tokenHeader?.startsWith("Bearer ") ? tokenHeader.slice(7) : tokenHeader;

    if (!token) {
      res.status(403).json({ message: "Token must be provided" });
      return;
    }

    jwt.verify(token, envConfig.jwtSecret as string, async (err, result: any) => {
      if (err) {
        res.status(403).json({ message: "Invalid token !!!" });
        return;
      }

      const userData = await User.findByPk(result.userId);
      if (!userData) {
        res.status(404).json({ message: "No user with that userId" });
        return;
      }

      req.user = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role
      };

      next();
    });
  }

  accessTo(...roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = req.user?.role as Role | undefined;
      if (!userRole || !roles.includes(userRole)) {
        res.status(403).json({ message: "You dont have permission" });
        return;
      }
      next();
    };
  }
}

export default new UserMiddleware();

