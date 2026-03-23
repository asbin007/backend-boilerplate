import express from "express";
import AuthController from "../controllers/authController.js";
import userMiddleware from "../middleware/userMiddleware.js";
import errorHandler from "../services/errorHandler.js";

const router = express.Router();

router.post("/register", errorHandler(AuthController.register));
router.post("/verify-otp", errorHandler(AuthController.verifyOtp));
router.post("/resend-otp", errorHandler(AuthController.resendOtp));
router.post("/login", errorHandler(AuthController.login));
router.post("/forgot-password", errorHandler(AuthController.forgotPassword));
router.post("/reset-password", errorHandler(AuthController.resetPassword));

// Example protected route (JWT in Authorization header)
router.get("/me", userMiddleware.isUserLoggedIn.bind(userMiddleware), (req, res) => {
  res.status(200).json({ user: req.user });
});

export default router;

