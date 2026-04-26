// const mongoose = require('mongoose');

// const UserSchema = new mongoose.Schema({
//   clerkId: { type: String, required: true, unique: true },
//   email: { type: String, required: true },
//   firstName: String,
//   lastName: String,
//   appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }]
// });

// module.exports = mongoose.model('User', UserSchema);
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  clerkId: { 
    type: String, 
    required: true, 
    unique: true 
  }, // Links to the Clerk authentication ID
  email: { 
    type: String, 
    required: true 
  },
  name: String, // Combined name field used in your Navbar sync
  firstName: String,
  lastName: String,
  // Array of references to the Appointment collection
  appointments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment' 
  }] 
}, { 
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Use 'export default' for ES Modules as defined in your package.json
const User = mongoose.model('User', UserSchema);
export default User;