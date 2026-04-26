
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary'; // Added Cloudinary
import fileUpload from 'express-fileupload'; // Added File Upload middleware

import Doctor from './models/Doctor.js';
import Appointment from './models/appointmentSchema.js';
import User from './models/User.js';

import ServiceBooking from './models/ServiceBooking.js';

import Service from './models/Service.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CLOUDINARY CONFIGURATION ---
cloudinary.config({ 
  cloud_name: 'dqljwkiyo', 
  api_key: '618767924698894', 
  api_secret: '3f6RXKXfkowH-cHV9n_PSsvp5Js' 
});

app.use(fileUpload({ useTempFiles: true })); // Required to handle image files
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Razorpay Initialization
const razorpay = new Razorpay({
  key_id: 'rzp_test_eWbSbu5AuEM5Ey', 
  key_secret: 'tBff6amDLXeNGSEphKN81tfZ',
});

// --- PAYMENT ROUTES ---

// 1. Create Razorpay Order
app.get('/api/test-server', (req, res) => {
  res.send("Server is reaching the routes correctly!");
});
app.post('/api/create-order', async (req, res) => {
  try {
    const options = {
      amount: req.body.amount * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json(order); 
  } catch (err) {
    console.error("Razorpay Order Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Verify Payment Signature
app.post('/api/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  const hmac = crypto.createHmac('sha256', 'tBff6amDLXeNGSEphKN81tfZ');
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generatedSignature = hmac.digest('hex');

  if (generatedSignature === razorpay_signature) {
    res.json({ status: "success" });
  } else {
    res.status(400).json({ status: "failure" });
  }
});
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Connection Error:", err));

// --- DOCTOR & APPOINTMENT ROUTES ---

app.get('/api/doctors', async (req, res) => {
  try {
    const doctors = await Doctor.find(); 
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get('/api/doctors/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let doctor = await Doctor.findOne({ name: { $regex: new RegExp("^" + identifier + "$", "i") } });
    if (!doctor && mongoose.Types.ObjectId.isValid(identifier)) doctor = await Doctor.findById(identifier);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const newAppointment = new Appointment(req.body);
    await newAppointment.save();
    res.status(201).json({ message: "Appointment saved!" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/appointments/user/:clerkId', async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.params.clerkId });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

app.put('/api/appointments/:id', async (req, res) => {
  try {
    const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Update failed" });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) return res.status(404).json({ message: "Not found" });
    const aptDate = new Date(appointment.appointmentDate);
    const diffInHours = (aptDate - new Date()) / (1000 * 60 * 60);
    let fineCharged = diffInHours < 24;
    await Appointment.findByIdAndDelete(id);
    res.json({ message: "Cancelled", fineCharged });
  } catch (err) {
    res.status(500).json({ error: "Cancellation failed" });
  }
});
// --- backend/server.js ---
app.put('/api/admin/appointments/complete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id, 
      { status: "Completed" }, 
      { new: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    res.json({ message: "Appointment marked as completed!", updatedAppointment });
  } catch (err) {
    res.status(500).json({ error: "Failed to update appointment status" });
  }
});

app.post('/api/admin/appointments/:id/prescription', async (req, res) => {
  try {
    if (!req.files || !req.files.prescription) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const file = req.files.prescription;
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: 'medicare_prescriptions',
      resource_type: 'raw',
      format: 'pdf'
    });
    const updated = await Appointment.findByIdAndUpdate(
      req.params.id,
      { prescriptionUrl: result.secure_url },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Appointment not found" });
    res.json({ success: true, prescriptionUrl: result.secure_url });
  } catch (err) {
    console.error("Prescription upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- SERVICE ROUTES ---

app.post('/api/services/book', async (req, res) => {
  try {
    const newService = new ServiceBooking(req.body);
    await newService.save();
    res.status(201).json({ message: "Service booked successfully!" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/services/user/:clerkId', async (req, res) => {
  try {
    const services = await ServiceBooking.find({ userId: req.params.clerkId });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

app.put('/api/services/:id', async (req, res) => {
  try {
    const updated = await ServiceBooking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Update failed" });
  }
});

// --- ADMIN DASHBOARD ANALYTICS ---
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const completedApts = await Appointment.countDocuments({ status: "Completed" });
    const canceledApts = await Appointment.countDocuments({ status: "Cancelled" });

    const appointments = await Appointment.find({ status: "Confirmed" });
    const totalEarnings = appointments.length * 1000; 

    res.json({
      totalDoctors,
      totalUsers,
      totalAppointments,
      totalEarnings,
      completed: completedApts,
      canceled: canceledApts
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

app.get('/api/admin/doctors-list', async (req, res) => {
  try {
    const doctors = await Doctor.find();
    
    const doctorsWithStats = await Promise.all(doctors.map(async (doc) => {
      const appointments = await Appointment.find({ doctorName: doc.name });
      const completedCount = appointments.filter(a => a.status === "Completed").length;
      const canceledCount = appointments.filter(a => a.status === "Cancelled").length;
      
      return {
        ...doc._doc,
        appointmentsCount: appointments.length,
        completedCount,
        canceledCount,
        totalEarnings: completedCount * (doc.fees || 1000) 
      };
    }));

    res.json(doctorsWithStats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch doctors list" });
  }
});

// --- UPDATED ADD DOCTOR ROUTE ---
app.post('/api/admin/add-doctor', async (req, res) => {
  try {
    let imageUrl = "";

    // Upload to Cloudinary if image exists
    if (req.files && req.files.image) {
      const file = req.files.image;
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: 'medicare_doctors',
      });
      imageUrl = result.secure_url;
    }

    const newDoctor = new Doctor({
      ...req.body,
      imageUrl, // Use the Cloudinary URL
      appointmentsCount: 0,
      completedCount: 0,
      canceledCount: 0,
      totalEarnings: 0
    });
    await newDoctor.save();
    res.status(201).json({ message: "Doctor added successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add doctor." });
  }
});

app.get('/api/admin/doctors-list', async (req, res) => {
  try {
    const doctors = await Doctor.find(); 
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch doctors from database" });
  }
});
// --- server.js ---
app.get('/api/admin/all-appointments', async (req, res) => {
  try {
    // Fetch all appointments and sort by most recent date
    const appointments = await Appointment.find().sort({ appointmentDate: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all appointments" });
  }
});
// --- server.js ---
app.get('/api/admin/service-stats', async (req, res) => {
  try {
    const allServices = await Service.find({});
    const allBookings = await ServiceBooking.find({});

    // Calculate Global Stats for the top bubbles
    const stats = {
      totalServices: allServices.length,
      totalAppointments: allBookings.length,
      totalEarning: allBookings
        .filter(b => b.status === "Completed")
        .reduce((sum, b) => sum + (Number(b.price) || 0), 0),
      completed: allBookings.filter(b => b.status === "Completed").length,
      canceled: allBookings.filter(b => b.status === "Cancelled").length
    };

    // Map stats to each specific service for the table
    const serviceList = allServices.map(service => {
      const relatedBookings = allBookings.filter(b => b.serviceName === service.name);
      return {
        ...service._doc,
        appointments: relatedBookings.length,
        completed: relatedBookings.filter(b => b.status === "Completed").length,
        canceled: relatedBookings.filter(b => b.status === "Cancelled").length,
        earning: relatedBookings
          .filter(b => b.status === "Completed")
          .reduce((sum, b) => sum + (Number(b.price) || 0), 0)
      };
    });

    res.json({ stats, serviceList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/admin/add-service', async (req, res) => {
  try {
    let imageUrl = "";

    // 1. Handle Image Upload to Cloudinary
    if (req.files && req.files.image) {
      const file = req.files.image;
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: 'medicare_services',
      });
      imageUrl = result.secure_url;
    }

    // 2. Parse JSON strings back into arrays
    const instructions = req.body.instructions ? JSON.parse(req.body.instructions) : [];
    const slots = req.body.slots ? JSON.parse(req.body.slots) : [];

    // 3. Create and Save the Service
    const newService = new Service({
      name: req.body.name,
      price: Number(req.body.price),
      availability: req.body.availability || "Available",
      description: req.body.description,
      imageUrl: imageUrl,
      instructions: instructions,
      slots: slots
    });

    await newService.save();
    res.status(201).json({ success: true, message: "Service added successfully!" });
  } catch (err) {
    console.error("Add Service Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// --- backend/server.js ---


app.get('/api/admin/all-services', async (req, res) => {
  try {
    // Fetch all services and sort them by the most recently added
    const services = await Service.find({}).sort({ createdAt: -1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});
app.get('/api/admin/service-appointments', async (req, res) => {
  try {
    // Fetch all service bookings, sorted by date
    const bookings = await ServiceBooking.find({}).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch service appointments" });
  }
});
// --- backend/server.js ---
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;

  const AUTHORIZED_ADMIN = process.env.ADMIN_EMAIL || "admin@medicare.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

  if (email.trim() === AUTHORIZED_ADMIN.trim() && password.trim() === ADMIN_PASSWORD.trim()) {
    res.json({ 
      success: true, 
      message: "Admin Authenticated",
      token: "admin-secure-session-token"
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: "Unauthorized: Only the official Admin can enter." 
    });
  }
});
// --- backend/server.js ---
// --- backend/server.js ---
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // This creates "2026-03-20"
      const dateString = date.toISOString().split('T')[0]; 
      
      // Debug: Log what the server is searching for
      console.log("Searching for date:", dateString);

      const count = await Appointment.countDocuments({
        // We use a Regex to match the date regardless of exact string matches
        appointmentDate: { $regex: dateString } 
      });

      last7Days.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        appointments: count
      });
    }
    res.json(last7Days);
  } catch (err) {
    console.error("Analytics Error:", err);
    res.status(500).json({ error: "Analytics failed" });
  }
});
// --- backend/server.js ---
// --- backend/server.js ---
app.post('/api/ai/symptom-checker', async (req, res) => {
  try {
    const { symptoms } = req.body;
    
    // 1. Safety Check for API Key
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ ERROR: GEMINI_API_KEY is missing from .env");
      return res.status(500).json({ error: "Server Configuration Error" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a professional medical triage assistant. 
    User Symptoms: "${symptoms}"
    Task: Suggest the most relevant medical department and urgency level.
    Requirement: Return ONLY a valid JSON object. No conversation, no backticks.
    Format: { "department": "Name", "explanation": "Reason", "urgency": "Low/Medium/High" }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // 2. Advanced JSON Cleaning (Prevents the 500 Error if AI adds text around JSON)
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const jsonString = text.substring(jsonStart, jsonEnd);

    if (!jsonString) throw new Error("AI failed to return JSON");

    const finalData = JSON.parse(jsonString);
    console.log("✅ AI Analysis Success:", finalData.department);
    res.json(finalData);

  } catch (err) {
    console.error("❌ AI ROUTE CRASHED:", err.message);
    
    // 3. Graceful Fallback (Prevents the 500 error on Frontend)
    res.status(200).json({ 
      department: "General Medicine", 
      explanation: "We're experiencing high traffic. Please consult a General Physician for initial screening.", 
      urgency: "Medium" 
    });
  }
});
// --- backend/server.js ---
// --- backend/server.js ---
app.post('/api/users/sync', async (req, res) => {
  try {
    const { clerkId, email, name, imageUrl } = req.body;

    // 1. Validation: Prevent the crash if Clerk data is missing
    if (!clerkId) {
      console.error("Sync blocked: No clerkId provided");
      return res.status(400).json({ error: "Missing Clerk ID" });
    }

    // 2. Optimized Query: Fixes the Mongoose warning and the timeout
    const user = await User.findOneAndUpdate(
  { clerkId },
  { $set: { email, name, imageUrl } },
  { 
    upsert: true, 
    returnDocument: 'after',
    maxTimeMS: 10000 // Give up after 10 seconds instead of crashing the socket
  }
);

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("User Sync Error Detail:", err);
    res.status(500).json({ error: "Server Database Error", message: err.message });
  }
});
const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

