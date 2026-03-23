import otpGenerator from "otp-generator";
import { Request, Response } from "express";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";

import { envConfig } from "../config/config.js";
import User from "../database/models/userModel.js";
import sendMail from "../services/sendMail.js";
import checkOtpExpiration from "../services/optExpiration.js";

function generateOtp() {
  return otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
    digits: true
  });
}

function signToken(userId: string) {
  const secret = envConfig.jwtSecret as Secret;
  const options: SignOptions = {
    expiresIn: envConfig.jwtExpiration as unknown as SignOptions["expiresIn"]
  };
  return jwt.sign({ userId }, secret, options);
}

class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password } = req.body as {
        username?: string;
        email?: string;
        password?: string;
      };

      if (!username || !email || !password) {
        res.status(400).json({ message: "Fill all the fields" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ message: "Password must be at least 6 characters long" });
        return;
      }

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        res.status(400).json({ message: "User already exists" });
        return;
      }

      const otp = generateOtp();
      const hashedPassword = bcrypt.hashSync(password, 10);

      const newUser = await User.create({
        username,
        email,
        password: hashedPassword,
        otp,
        otpGeneratedTime: Date.now().toString(),
        isVerified: false
      });

      try {
        const ok = await sendMail({
          to: email,
          subject: "Registration OTP",
          text: `Your registration OTP is: ${otp}. This OTP will expire in 10 minutes.`
        });

        if (!ok) {
          res.status(201).json({
            message: "User registered, but OTP email failed to send. You can try resending OTP.",
            userId: newUser.id,
            email: newUser.email,
            requiresOtp: true
          });
          return;
        }
      } catch (emailError) {
        console.error("OTP email sending failed:", emailError);
      }

      res.status(201).json({
        message: "User registered successfully. Please check your email for OTP.",
        userId: newUser.id,
        email: newUser.email,
        requiresOtp: true
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Internal server error", error: error?.message });
    }
  }

  static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp } = req.body as { email?: string; otp?: string };

      if (!email || !otp) {
        res.status(400).json({ message: "Email and OTP are required" });
        return;
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (user.otp !== otp) {
        res.status(400).json({ message: "Invalid OTP" });
        return;
      }

      if (!checkOtpExpiration(user.otpGeneratedTime, 600000)) {
        res.status(403).json({ message: "OTP expired. Please request a new one." });
        return;
      }

      user.isVerified = true;
      user.otp = "";
      user.otpGeneratedTime = "";
      await user.save();

      res.status(200).json({
        message: "OTP verified successfully! You can now login.",
        userId: user.id,
        email: user.email,
        isVerified: user.isVerified
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Internal server error", error: error?.message });
    }
  }

  static async resendOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body as { email?: string };

      if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const otp = generateOtp();
      user.otp = otp;
      user.otpGeneratedTime = Date.now().toString();
      await user.save();

      const ok = await sendMail({
        to: user.email,
        subject: "Resend Registration OTP",
        text: `Your OTP is: ${otp}. This OTP will expire in 10 minutes.`
      });

      if (!ok) {
        res.status(200).json({
          message: "OTP regenerated, but OTP email failed to send. Please try again.",
          requiresOtp: true
        });
        return;
      }

      res.status(200).json({
        message: "OTP resent successfully. Please check your email.",
        requiresOtp: true
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Internal server error", error: error?.message });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as { email?: string; password?: string };

      if (!email || !password) {
        res.status(400).json({ message: "Fill all the fields" });
        return;
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const isValidPassword = bcrypt.compareSync(password, user.password);
      if (!isValidPassword) {
        res.status(400).json({ message: "Invalid credentials" });
        return;
      }

      if (!user.isVerified) {
        res.status(403).json({ message: "Account not verified. Please verify OTP first." });
        return;
      }

      const token = signToken(user.id);
      res.status(200).json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Internal server error", error: error?.message });
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body as { email?: string };

      if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const otp = generateOtp();
      user.otp = otp;
      user.otpGeneratedTime = Date.now().toString();
      await user.save();

      const ok = await sendMail({
        to: user.email,
        subject: "Password Reset OTP",
        text: `Your password reset OTP is: ${otp}. It will expire in 10 minutes.`
      });

      if (!ok) {
        res.status(200).json({
          message: "Password reset OTP regenerated, but email failed to send. Please try again."
        });
        return;
      }

      res.status(200).json({ message: "Password reset OTP sent successfully." });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Internal server error", error: error?.message });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp, newPassword } = req.body as {
        email?: string;
        otp?: string;
        newPassword?: string;
      };

      if (!email || !otp || !newPassword) {
        res.status(400).json({ message: "Email, OTP and new password are required" });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ message: "Password must be at least 6 characters long" });
        return;
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (user.otp !== otp) {
        res.status(400).json({ message: "Invalid OTP" });
        return;
      }

      if (!checkOtpExpiration(user.otpGeneratedTime, 600000)) {
        res.status(403).json({ message: "OTP expired. Please request a new one." });
        return;
      }

      user.password = bcrypt.hashSync(newPassword, 10);
      user.otp = "";
      user.otpGeneratedTime = "";
      await user.save();

      res.status(200).json({ message: "Password reset successfully. You can now login." });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Internal server error", error: error?.message });
    }
  }
}

export default AuthController;

