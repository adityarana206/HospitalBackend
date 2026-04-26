// import mongoose from 'mongoose';

// const AppointmentSchema = new mongoose.Schema({
//   userId: String,
//   userEmail: String,
//   doctorName: String,
//   doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
//   appointmentDate: String,
//   paymentMethod: String,
//   status: { type: String, default: 'pending' }
// }, { timestamps: true });

// export default mongoose.model('Appointment', AppointmentSchema);
import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema({
  userId: String,
  userEmail: String,
  // ADD THESE PATIENT FIELDS:
  patientName: String, 
  patientAge: String,
  patientGender: String,
  patientMobile: String,
  // DOCTOR INFO:
  doctorName: String,
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  specialty: String, // Added to show specialty in the card
  fees: Number,      // Added to show fee amount
  appointmentDate: String,
  appointmentTime: String,
  paymentMethod: String,
  status: { type: String, default: 'Confirmed' },
  prescriptionUrl: { type: String, default: '' }
  
}, { timestamps: true });

export default mongoose.model('Appointment', AppointmentSchema);