import mongoose from 'mongoose';
import Doctor from './models/Doctor.js'; // Note the .js extension is required in ESM

const doctors = [
  { name: "Mri", specialty: "Pediatrics", experience: 5, imageUrl: "/images/doctor1.jpg" },
  { name: "Kevin", specialty: "Brain", experience: 12, imageUrl: "/images/doc2.jpg" },
  { name: "Sarah", specialty: "Cardiology", experience: 8, imageUrl: "/images/doc3.jpeg" },
  { name: "Robert", specialty: "Orthopedic", experience: 15, imageUrl: "/images/doc4.jpeg" }
];

const seedDB = async () => {
  try {
    // Replace with your actual MongoDB URI
    await mongoose.connect('mongodb://127.0.0.1:27017/hms_db'); 
    
    await Doctor.deleteMany({}); 
    console.log("Old data cleared.");

    await Doctor.insertMany(doctors); 
    console.log("Database Seeded successfully!");

  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    mongoose.connection.close();
  }
};

seedDB();