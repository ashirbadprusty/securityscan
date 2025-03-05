import express from "express";
import Department from "../models/department.js";

const router = express.Router();

// Create a department
export const DeptCreate = async (req, res) => {
  try {
    const { name, adminId } = req.body;

    // Check if department already exists
    const existingDept = await Department.findOne({ name });
    if (existingDept) {
      return res.status(400).json({ message: "Department already exists" });
    }

    const department = new Department({ name, createdBy: adminId });
    await department.save();
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: "Error creating department", error });
  }
};

// Fetch all departments
export const getDept = async (req, res) => {
  try {
    const departments = await Department.find();
    res.status(200).json(departments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching departments", error });
  }
};
