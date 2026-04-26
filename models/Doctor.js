// const mongoose = require('mongoose');

// const DoctorSchema = new mongoose.Schema({
//   name: String,
//   specialty: String,
//   experience: Number,
//   imageUrl: String,
//   fees: { type: Number, default: 1000 },
//   availability: [String] // Array of dates
// });

// module.exports = mongoose.model('Doctor', DoctorSchema);
import mongoose from 'mongoose';

const DoctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialty: { type: String, required: true },
  experience: Number,
  imageUrl: String,
  fees: { type: Number, default: 1000 }
});

export default mongoose.model('Doctor', DoctorSchema);