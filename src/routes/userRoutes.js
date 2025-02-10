import express from "express";
import { adminMiddleware } from "../middleware/authMiddleware.js";
import {
  createUser,
  getAllUsers,
  resetPassword,
  searchUser,
  sendPasswordResetEmail,
  userLogin,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/create", adminMiddleware, createUser);
router.post("/login", userLogin);
router.get("/getAllUsers", getAllUsers);
router.get("/searchUsers", searchUser);
router.post("/forgot-password", sendPasswordResetEmail);
router.post("/reset-password/:token", resetPassword);

export default router;
