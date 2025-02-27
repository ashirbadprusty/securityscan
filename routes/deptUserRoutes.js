import express from "express";
import {
  deptUSerLogin,
  forgotPassword,
  getAllDeptUser,
  resetPassword,
  Signup,
} from "../controllers/deptUserController.js";
import { adminMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/signup", adminMiddleware, Signup);
router.post("/login", deptUSerLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/", getAllDeptUser);

export default router;
