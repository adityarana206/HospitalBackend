import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true // Prevents duplicate service names
  },
  price: { 
    type: Number, 
    required: true 
  },
  availability: { 
    type: String, 
    default: "Available" 
  },
  description: { 
    type: String 
  },
  imageUrl: { 
    type: String // Stores the Cloudinary URL
  },
  instructions: { 
    type: [String], // Array for the point-wise instructions
    default: []
  },
  slots: { 
    type: [String], // Array for the schedule/time slots
    default: []
  }
}, { timestamps: true });

const Service = mongoose.model('Service', serviceSchema);
export default Service;