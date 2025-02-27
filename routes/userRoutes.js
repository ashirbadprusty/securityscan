import express from "express";
import {
  createUser,
  getAllUsers,
  resetPassword,
  searchUser,
  sendPasswordResetEmail,
  userLogin,
} from "../controllers/userController.js";
import { adminMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", adminMiddleware, createUser);
router.post("/login", userLogin);
router.get("/getAllUsers",adminMiddleware, getAllUsers);
router.get("/searchUsers", searchUser);
router.post("/forgot-password", sendPasswordResetEmail);
router.post("/reset-password/:token", resetPassword);


export default router;
