import express from "express";
import { adminLogin, adminSignup } from "../controllers/adminController.js";
import { adminMiddleware } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/signup", adminSignup);
router.post("/login", adminLogin);
router.get("/protected", adminMiddleware, (req, res) => {
  res.status(200).json({
    message: "Access granted to protected route",
    admin: req.admin, // Decoded token data
  });
});
export default router;
