import mongoose from "mongoose";
import { PAYMENT_TYPE } from "../../Constants/constants.js";

const paymentSchema = new mongoose.Schema({

  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },

  amount: { type: Number, required: true },

  paymentMethod: { type: String, enum: Object.values(PAYMENT_TYPE), required: true },

  paymentCode: { type: String },

  vodafoneCashNumber: { type: String },

  vodafoneCashImage: {
        images :{public_id : String,
        secure_url : String },
        folderId : String 
},

  isConfirmed: { type: Boolean, default: false },

  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Accountant' },

  relatedSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
}, { timestamps: true });


const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

 export default Payment