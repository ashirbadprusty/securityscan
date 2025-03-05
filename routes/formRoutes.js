import express from "express";
import {
  createForm,
  FormsById,
  getAllForms,
  scanAndStoreFullRecord,
  updateStatus,
  fetchAllScannedRecords,
  fetchLast5ScannedRecords,
  reqRegCount,
  todayVisitedUsers,
  dayandMonthWiseCount,
  searchRegisterUser,
  searchScannedUser,
} from "../controllers/formController.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.post(
  "/submit",
  upload.fields([{ name: "profilePhoto" }, { name: "file" }]),
  createForm
);
router.get("/allForms", getAllForms);
router.get("/getForm/:formId", FormsById);
router.patch("/statusUpdate/:formId", updateStatus);
router.post("/scan", scanAndStoreFullRecord);
router.get("/getAllScannedData", fetchAllScannedRecords);
router.get("/last5records", fetchLast5ScannedRecords);
router.get("/reqRegCount", reqRegCount);
router.get("/todayVistedUsers", todayVisitedUsers);
router.get("/stats", dayandMonthWiseCount);
router.get("/searchRegUser", searchRegisterUser);
router.get("/searchScannedUser", searchScannedUser);

export default router;
