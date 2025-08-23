import mongoose from "mongoose";
import { PAYMENT_TYPE } from "../../Constants/constants.js";

const paymentSchema = new mongoose.Schema({

  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },

  amount: { type: Number , default : 0 },

  paymentMethod: { type: String, enum: Object.values(PAYMENT_TYPE), required: true },

  // if vode
  vodafoneCashNumber: { type: String },
  
  vodafoneCashImage: {
    images :{public_id : String,
      secure_url : String },
      folderId : String 
    },
  //if code 
  paymentCode: {  type: mongoose.Schema.Types.ObjectId, ref: 'PaymentCode'  },

  isConfirmed: { type: Boolean, default: false },

  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Accountant' },

  relatedSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },

  sessionsCount :{ type: Number }

}, { timestamps: true });


const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

 export default Payment