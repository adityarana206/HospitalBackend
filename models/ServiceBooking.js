// import mongoose from 'mongoose';

// const serviceBookingSchema = new mongoose.Schema({
//   userId: { type: String, required: true },
//   serviceName: { type: String, required: true },
//   patientName: { type: String, required: true },
//   patientAge: { type: Number, required: true },
//   patientMobile: { type: String, required: true },
//   appointmentDate: { type: String, required: true },
//   appointmentTime: { type: String, required: true },
//   status: { type: String, default: "Scheduled" }
// }, { timestamps: true });

// const ServiceBooking = mongoose.model('ServiceBooking', serviceBookingSchema);
// export default ServiceBooking;
import mongoose from 'mongoose';

const serviceBookingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  serviceName: { type: String, required: true },
  // ADDED: Price and Image fields to populate the Dashboard
  price: { type: Number, required: true }, 
  imageUrl: { type: String }, 
  patientName: { type: String, required: true },
  patientAge: { type: Number, required: true },
  patientMobile: { type: String, required: true },
  appointmentDate: { type: String, required: true },
  appointmentTime: { type: String, required: true },
  status: { type: String, default: "Scheduled" }
}, { timestamps: true });

const ServiceBooking = mongoose.model('ServiceBooking', serviceBookingSchema);
export default ServiceBooking;