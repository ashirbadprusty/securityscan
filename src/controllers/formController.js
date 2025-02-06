import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import Form from "../models/formModel.js";
import Counter from "../models/counterModel.js";
import mongoose from "mongoose";

//Create Form
export const createForm = async (req, res) => {
  try {
    const { name, email, phone, reason } = req.body;

    // Check if files are uploaded
    const profilePhoto =
      req.files["profilePhoto"] && req.files["profilePhoto"][0].path
        ? `http://localhost:5000/uploads/images/${req.files["profilePhoto"][0].filename}`
        : null;

    const file =
      req.files["file"] && req.files["file"][0].path
        ? `http://localhost:5000/uploads/documents/${req.files["file"][0].filename}`
        : null;

    if (!profilePhoto || !name || !email || !phone || !reason || !file) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const newForm = new Form({
      profilePhoto,
      name,
      email,
      phone,
      reason,
      file,
    });

    await newForm.save();

    res
      .status(201)
      .json({ message: "Form submitted successfully!", form: newForm });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

//Get All Forms
export const getAllForms = async (req, res) => {
  try {
    // Retrieve all forms from the database
    const forms = await Form.find();

    res.status(200).json({ message: "All forms fetched successfully!", forms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

//Get Form By ID
export const FormsById = async (req, res) => {
  try {
    const { formId } = req.params;

    const form = await Form.findById(formId);

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    res.status(200).json({ message: "Form fetched successfully!", form });
  } catch (error) {
    console.error("Error fetching form by ID:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// Get __dirname equivalent
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅ Ensure uploads are stored in the project root, not inside src/
const qrCodeDir = path.join(process.cwd(), "uploads", "qrCodes");

// Ensure directory exists
if (!fs.existsSync(qrCodeDir)) {
  fs.mkdirSync(qrCodeDir, { recursive: true });
}

export const updateStatus = async (req, res) => {
  try {
    const { formId } = req.params;
    const { status } = req.body;

    const validStatuses = ["Approved", "Rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value. Must be 'Approved' or 'Rejected'.",
      });
    }

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    if (form.status === status) {
      return res.status(400).json({ message: `Form is already ${status}` });
    }

    form.status = status;

    if (status === "Approved") {
      // Fetch the last barcode count from the database
      let counter = await Counter.findOneAndUpdate(
        { name: "barcodeCounter" },
        { $inc: { count: 1 } },
        { new: true, upsert: true }
      );

      const formattedSerialNumber = String(counter.count).padStart(10, "0");
      const barcodeId = `VIS${formattedSerialNumber}`;

      // Assign barcodeId to form
      form.barcodeId = barcodeId;

      // Define QR code data (store barcode ID instead of URL)
      const qrCodeData = barcodeId;

      // ✅ Ensure QR codes are stored in root uploads/qrcodes
      const qrCodeFilename = `qrCode_${barcodeId}.png`;
      const qrCodePath = path.join(qrCodeDir, qrCodeFilename);

      // Generate QR code
      await QRCode.toFile(qrCodePath, qrCodeData);

      // Store the generated QR code URL for frontend display
      form.qrCode = `http://localhost:5000/uploads/qrCodes/${qrCodeFilename}`;

      // Save the form with the QR code
      await form.save();

      return res.status(200).json({
        message: `Form ${status.toLowerCase()} successfully`,
        form,
      });
    } else {
      await form.save();
      return res.status(200).json({
        message: `Form ${status.toLowerCase()} successfully`,
        form,
      });
    }
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

//Scan records
export const scanAndStoreFullRecord = async (req, res) => {
  try {
    const { barcodeId } = req.query;

    if (!barcodeId) {
      return res
        .status(400)
        .json({ message: "barcodeId is required as a query parameter." });
    }

    // Fetch the full record from Form collection
    const record = await Form.findOne({ barcodeId });

    if (!record) {
      return res.status(404).json({ message: "QR code not found." });
    }

    const db = mongoose.connection;
    const scannedCollection = db.collection("scanned_data");

    // Check if the record was scanned before
    const existingScan = await scannedCollection.findOne({ barcodeId });

    if (existingScan) {
      // If already scanned, update exit time
      await scannedCollection.updateOne(
        { barcodeId },
        { $set: { exitTime: new Date() } }
      );
    } else {
      // First scan, set entry time
      await scannedCollection.insertOne({
        barcodeId,
        scannedData: record.toObject(),
        scannedAt: new Date(),
        entryTime: new Date(),
        exitTime: null,
      });
    }

    // Update the latest scan time in the original Form collection
    record.latestScan = new Date();
    await record.save();

    res.status(200).json({
      message: existingScan
        ? "QR code scanned again."
        : "QR code scanned successfully.",
      data: record,
    });
  } catch (error) {
    console.error("Error scanning record:", error);
    res.status(500).json({
      message: "An error occurred while scanning the QR code.",
      error: error.message,
    });
  }
};

//Get All scanned records
export const fetchAllScannedRecords = async (req, res) => {
  try {
    const db = mongoose.connection;
    const scannedCollection = db.collection("scanned_data");

    // Fetch all records from the scanned_data collection
    const scannedRecords = await scannedCollection.find().toArray();

    if (scannedRecords.length === 0) {
      return res.status(404).json({ message: "No scanned records found." });
    }

    res.status(200).json({
      message: "All scanned records fetched successfully.",
      data: scannedRecords,
    });
  } catch (error) {
    console.error("Error fetching scanned records:", error);
    res.status(500).json({
      message: "An error occurred while fetching scanned records.",
      error: error.message,
    });
  }
};

//Fetch last 5 records
export const fetchLast5ScannedRecords = async (req, res) => {
  try {
    const db = mongoose.connection;
    const scannedCollection = db.collection("scanned_data");

    // Fetch the last 5 records from scanned_data, sorted by scannedAt (latest first)
    const last5Records = await scannedCollection
      .find()
      .sort({ scannedAt: -1 }) // Sort by scannedAt, descending (latest first)
      .limit(5) // Limit the result to 5 records
      .toArray();

    if (last5Records.length === 0) {
      return res.status(404).json({ message: "No scanned records found." });
    }

    res.status(200).json({
      message: "Last 5 scanned records fetched successfully.",
      data: last5Records,
    });
  } catch (error) {
    console.error("Error fetching last 5 scanned records:", error);
    res.status(500).json({
      message: "An error occurred while fetching last 5 scanned records.",
      error: error.message,
    });
  }
};

// Fetch counts
export const reqRegCount = async (req, res) => {
  try {
    // Get the total number of forms (total visitors)
    const totalFormsCount = await Form.countDocuments();

    // Get the number of pending forms (new requests)
    const newRequestsCount = await Form.countDocuments({ status: "Pending" });

    // Send response with counts
    res.json({
      success: true,
      data: {
        totalVisitors: totalFormsCount,
        newRequests: newRequestsCount,
      },
    });
  } catch (error) {
    console.error("Error fetching form counts:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching form counts.",
    });
  }
};

//Fetch Today visitors
export const todayVisitedUsers = async (req, res) => {
  try {
    const db = mongoose.connection;
    const scannedCollection = db.collection("scanned_data");

    // Get the start and end of today's date
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Set to midnight (start of today)
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999); // Set to 11:59 PM (end of today)

    // Filter the documents to only count those that were scanned today
    const todayVisitors = await scannedCollection.countDocuments({
      scannedAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    res.json({
      success: true,
      data: {
        todayVisitors: todayVisitors,
      },
    });
  } catch (error) {
    console.error("Error fetching visitors count:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching visitors count.",
    });
  }
};

//Count based on days and month
export const dayandMonthWiseCount = async (req, res) => {
  try {
    const db = mongoose.connection;
    const scannedCollection = db.collection("scanned_data");

    const dayOfWeekCounts = await scannedCollection
      .aggregate([
        {
          $project: {
            dayOfWeek: { $dayOfWeek: "$scannedAt" },
          },
        },
        {
          $group: {
            _id: "$dayOfWeek",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const monthOfYearCounts = await scannedCollection
      .aggregate([
        {
          $project: {
            monthOfYear: { $month: "$scannedAt" },
          },
        },
        {
          $group: {
            _id: "$monthOfYear",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const dayCounts = dayNames.map((day, index) => {
      const count =
        dayOfWeekCounts.find((item) => item._id === index + 1)?.count || 0;
      return {
        day,
        count,
      };
    });

    const monthCounts = monthNames.map((month, index) => {
      const count =
        monthOfYearCounts.find((item) => item._id === index + 1)?.count || 0;
      return {
        month,
        count,
      };
    });

    res.json({
      success: true,
      data: {
        dayCounts: dayCounts,
        monthCounts: monthCounts,
      },
    });
  } catch (error) {
    console.error("Error fetching day and month-wise count:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching day and month-wise count.",
    });
  }
};
