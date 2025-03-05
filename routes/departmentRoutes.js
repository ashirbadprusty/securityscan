import express from "express";
import { DeptCreate, getDept } from "../controllers/departmentController.js";

const router = express.Router();

router.post("/create", DeptCreate);
router.get("/", getDept);

export default router;
