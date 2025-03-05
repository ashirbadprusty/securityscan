import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import Form from "../models/formModel.js";
import Counter from "../models/counterModel.js";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import moment from "moment";
import Admin from "../models/adminModel.js";

// Create Form
export const createForm = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      reason,
      department,
      personToMeet, 
      date,
      timeFrom,
      timeTo,
      gate,
    } = req.body;

     // Convert email to lowercase to avoid duplicates due to case sensitivity
     const normalizedEmail = email.toLowerCase();

    // Check uploaded files
    const profilePhoto = req.files?.profilePhoto?.[0]?.filename
      ? `http://localhost:5002/uploads/images/${req.files.profilePhoto[0].filename}`
      : null;

    const file = req.files?.file?.[0]?.filename
      ? `http://localhost:5002/uploads/documents/${req.files.file[0].filename}`
      : null;

    // Validate required fields
    if (
      !name ||
      !normalizedEmail ||
      !phone ||
      !reason ||
      !file ||
      !department ||
      !personToMeet ||
      !date ||
      !timeFrom ||
      !timeTo ||
      !gate
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled!" });
    }

    const newForm = new Form({
      profilePhoto,
      name,
      email: normalizedEmail,
      phone,
      reason,
      file,
      department,
      personToMeet, // Store ObjectId
      date,
      timeFrom,
      timeTo,
      gate,
    });

    await newForm.save();


    // Populate department and personToMeet before sending the email
    const populatedForm = await Form.findById(newForm._id)
      .populate("department", "name") // Fetch department name
      .populate("personToMeet", "name email"); // Fetch personToMeet's name & email


    // Send email
    await sendEmailToAdminAndPerson({
      name: populatedForm.name,
      email: populatedForm.email,
      phone: populatedForm.phone,
      reason: populatedForm.reason,
      profilePhoto: populatedForm.profilePhoto,
      file: populatedForm.file,
      department: populatedForm.department?.name || "N/A", // Use populated department name
      personToMeet: populatedForm.personToMeet
        ? {
            name: populatedForm.personToMeet.name,
            email: populatedForm.personToMeet.email,
          }
        : { name: "N/A", email: null }, // Handle missing personToMeet
      date: populatedForm.date,
      timeFrom: populatedForm.timeFrom,
      timeTo: populatedForm.timeTo,
      gate: populatedForm.gate,
    });
    res.status(201).json({
      message: "Form submitted successfully!",
      form: newForm,
    });
  } catch (error) {
    console.error("Error in createForm:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// Sends an email to the registered admin with user details
const sendEmailToAdminAndPerson = async ({
  name,
  email,
  phone,
  reason,
  profilePhoto,
  file,
  department,
  personToMeet,
  date,
  timeFrom,
  timeTo,
  gate,
}) => {
  try {
    console.log("Department",department);
    console.log("Person to meet", personToMeet);
    
    
    // Fetch the admin email from the database
    const admin = await Admin.findOne();
    const adminEmail = admin?.email || null;

    if (!adminEmail && !personToMeet?.email) {
      console.warn(
        "No admin or personToMeet email found. Skipping email notification."
      );
      return;
    }

    // Configure Nodemailer transport
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Generate email content dynamically
    const generateEmailHtml = (dashboardUrl) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
        <h2 style="text-align: center; color: #333;">New Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Department:</strong> ${department}</p>
        <p><strong>Person To Meet:</strong> ${personToMeet?.name || "N/A"}</p>
        <p><strong>Date:</strong>${date}</p> 
        <p><strong>Entry Time:</strong> ${timeFrom}</p>
        <p><strong>Exit Time:</strong> ${timeTo}</p>
        <p><strong>Gate:</strong> ${gate}</p>
        
        ${
          profilePhoto
            ? `<p><strong>Profile Photo:</strong> <a href="${profilePhoto}" target="_blank">View Photo</a></p>`
            : ""
        }
        ${
          file
            ? `<p><strong>Attached File:</strong> <a href="${file}" target="_blank">Download File</a></p>`
            : ""
        }
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${dashboardUrl}" 
             style="background-color: #007BFF; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
            View in Dashboard
          </a>
        </div>
      </div>
    `;

    // Send email to admin (Redirects to Admin Dashboard `/`)
    if (adminEmail) {
      await transporter.sendMail({
        from: `"SecurityScan" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: "New Form Submission - Action Required",
        html: generateEmailHtml("https://security.websitescheckup.in/"),
      });
      console.log("Email sent to admin successfully.");
    }

    // Send email to personToMeet (Redirects to Dept User Dashboard `/deptUserDashboard`)
    if (personToMeet?.email) {
      await transporter.sendMail({
        from: `"SecurityScan" <${process.env.EMAIL_USER}>`,
        to: personToMeet.email,
        subject: "You Have a Visitor Scheduled",
        html: generateEmailHtml(
          "https://security.websitescheckup.in/deptUserDashboard"
        ),
      });
      console.log("Email sent to personToMeet successfully.");
    }
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Get All Forms
export const getAllForms = async (req, res) => {
  try {
    // Retrieve all forms from the database
    const forms = await Form.find().populate("department personToMeet");

    res.status(200).json({ message: "All forms fetched successfully!", forms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// Get Form By ID
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

// Update status
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
      let counter = await Counter.findOneAndUpdate(
        { name: "barcodeCounter" },
        { $inc: { count: 1 } },
        { new: true, upsert: true }
      );

      const formattedSerialNumber = String(counter.count).padStart(10, "0");
      const barcodeId = `VIS${formattedSerialNumber}`;

      // ✅ Fetch `date`, `timeFrom`, and `timeTo` from the form
      const visitDate = form.date;
      const timeFrom = form.timeFrom;
      const timeTo = form.timeTo;

      // Store QR Code details including date & time validation
      const qrCodeData = JSON.stringify({
        barcodeId,
        visitDate,
        timeFrom,
        timeTo,
      });

      const qrCodeFilename = `qrCode_${barcodeId}.png`;
      const qrCodePath = path.join(qrCodeDir, qrCodeFilename);

      await QRCode.toFile(qrCodePath, qrCodeData);

      form.barcodeId = barcodeId;
      form.qrCode = `http://localhost:5002/uploads/qrCodes/${qrCodeFilename}`;
      form.qrCodeDate = visitDate;
      form.qrCodeTimeFrom = timeFrom;
      form.qrCodeTimeTo = timeTo;

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

// ✅ QR Code Validation Function
export const validateQRCode = (record) => {
  const currentDate = moment().format("YYYY-MM-DD");
  const currentTime = moment().format("HH:mm");
  if (record.qrCodeDate !== currentDate) {
    return { valid: false, message: "QR code is not valid for today." };
  }

  if (currentTime < record.qrCodeTimeFrom) {
    return { valid: false, message: "Still you have time to enter." };
  }

  if (currentTime > record.qrCodeTimeTo) {
    return { valid: false, message: "QR code is expired." };
  }

  return { valid: true, message: "QR code is valid." };
};

// Scan records
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

    // ✅ Validate QR Code Expiry
    const validationResult = validateQRCode(record);
    if (!validationResult.valid) {
      console.log(validationResult.message);

      return res.status(400).json({ message: validationResult.message });
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

// Get All scanned records
export const fetchAllScannedRecords = async (req, res) => {
  try {
    const db = mongoose.connection;
    const scannedCollection = db.collection("scanned_data");

    // Fetch all records from the scanned_data collection
    const scannedRecords = await scannedCollection
      .aggregate([
        {
          $sort: { scannedAt: -1 },
        },
        {
          $lookup: {
            from: "departments",
            localField: "scannedData.department",
            foreignField: "_id",
            as: "departmentDetails",
          },
        },
        {
          $lookup: {
            from: "deptusers",
            localField: "scannedData.personToMeet",
            foreignField: "_id",
            as: "personToMeetDetails",
          },
        },
        {
          $unwind: {
            path: "$departmentDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$personToMeetDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            barcodeId: 1,
            "scannedData.name": 1,
            "scannedData.email": 1,
            "scannedData.phone": 1,
            "scannedData.reason": 1,
            "scannedData.file": 1,
            "scannedData.profilePhoto": 1,
            "scannedData.status": 1,
            "scannedData.date": 1,
            "scannedData.timeFrom": 1,
            "scannedData.timeTo": 1,
            "scannedData.gate": 1,
            scannedAt: 1,
            entryTime: 1,
            exitTime: 1,
            department: "$departmentDetails.name", // Extract department name
            personToMeet: "$personToMeetDetails.name", // Extract person name
          },
        },
      ])
      .toArray();

    if (!scannedRecords.length) {
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

// Fetch last 5 records
export const fetchLast5ScannedRecords = async (req, res) => {
  try {
    const db = mongoose.connection;
    const scannedCollection = db.collection("scanned_data");

    const last5Records = await scannedCollection
      .aggregate([
        {
          $sort: { scannedAt: -1 },
        },
        {
          $limit: 5,
        },
        {
          $lookup: {
            from: "departments",
            localField: "scannedData.department",
            foreignField: "_id",
            as: "departmentDetails",
          },
        },
        {
          $lookup: {
            from: "deptusers",
            localField: "scannedData.personToMeet",
            foreignField: "_id",
            as: "personToMeetDetails",
          },
        },
        {
          $unwind: {
            path: "$departmentDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$personToMeetDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            barcodeId: 1,
            "scannedData.name": 1,
            "scannedData.email": 1,
            "scannedData.phone": 1,
            "scannedData.reason": 1,
            "scannedData.file": 1,
            "scannedData.profilePhoto": 1,
            "scannedData.status": 1,
            "scannedData.date": 1,
            "scannedData.timeFrom": 1,
            "scannedData.timeTo": 1,
            "scannedData.gate": 1,
            scannedAt: 1,
            entryTime: 1,
            exitTime: 1,
            department: "$departmentDetails.name", // Extract department name
            personToMeet: "$personToMeetDetails.name", // Extract person name
          },
        },
      ])
      .toArray();

    if (!last5Records.length) {
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
    // const startOfDay = new Date();
    // startOfDay.setHours(0, 0, 0, 0);

    // const endOfDay = new Date();
    // endOfDay.setHours(23, 59, 59, 999);

    // Get the current timestamp
    const currentTime = new Date();

    // Get the number of pending forms (new requests) that have NOT expired
    const newRequestsCount = await Form.countDocuments({
      status: "Pending",
      $expr: {
        $gt: [
          {
            $dateFromString: {
              dateString: {
                $concat: [
                  "$date",
                  "T",
                  { $substrCP: ["$timeTo", 0, 2] },
                  ":",
                  { $substrCP: ["$timeTo", 3, 2] },
                  ":00Z", // Ensure UTC time
                ],
              },
              format: "%Y-%m-%dT%H:%M:%SZ",
              onError: null,
              onNull: null,
            },
          },
          currentTime, // Compare with current UTC time
        ],
      },
      // createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

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

// Fetch Today visitors
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

// Count based on days and month
export const dayandMonthWiseCount = async (req, res) => {
  try {
    const db = mongoose.connection;
    const scannedCollection = db.collection("scanned_data");

    // Get start and end of the current week (Monday - Sunday)
    const startOfWeek = moment().startOf("isoWeek").toDate(); // Monday
    const endOfWeek = moment().endOf("isoWeek").toDate(); // Sunday

    // Get start and end of the current year
    const startOfYear = moment().startOf("year").toDate();
    const endOfYear = moment().endOf("year").toDate();

    // Fetch day-wise count for the current week
    const dayOfWeekCounts = await scannedCollection
      .aggregate([
        {
          $match: {
            scannedAt: { $gte: startOfWeek, $lte: endOfWeek },
          },
        },
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

    // Fetch month-wise count for the current year
    const monthOfYearCounts = await scannedCollection
      .aggregate([
        {
          $match: {
            scannedAt: { $gte: startOfYear, $lte: endOfYear },
          },
        },
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

    // Map day counts for the current week
    const dayCounts = dayNames.map((day, index) => {
      const count =
        dayOfWeekCounts.find((item) => item._id === index + 1)?.count || 0;
      return {
        day,
        count,
      };
    });

    // Map month counts for the current year
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
        dayCounts,
        monthCounts,
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

//Search users from Register Form
export const searchRegisterUser = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const users = await Form.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
      ],
    });

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Error searching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//Search users from Scanned Form
export const searchScannedUser = async (req, res) => {
  try {
    const db = mongoose.connection;
    const scannedCollection = db.collection("scanned_data");
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const users = await scannedCollection
      .find({
        $or: [
          { "scannedData.name": { $regex: query, $options: "i" } },
          { "scannedData.email": { $regex: query, $options: "i" } },
          { "scannedData.phone": { $regex: query, $options: "i" } },
          { barcodeId: { $regex: query, $options: "i" } },
        ],
      })
      .toArray();

    if (!users.length) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Error searching scanned user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
