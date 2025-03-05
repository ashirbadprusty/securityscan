import express from "express";
import {
  createUser,
  delSecurity,
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
router.get("/getAllUsers", getAllUsers);
router.get("/searchUsers", searchUser);
router.post("/forgot-password", sendPasswordResetEmail);
router.post("/reset-password/:token", resetPassword);
router.delete("/:userId", delSecurity);


export default router;
