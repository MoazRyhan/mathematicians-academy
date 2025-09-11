import mongoose from "mongoose";
import { system_role } from "../../Constants/constants.js";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  password: { type: String, required: true },

  role: { type: String, 
    enum: Object.values(system_role) ,
    required: true },
  
  phoneNumber: { type: String , require :true },

  isActive: { type: Boolean, default: true }
  
}, { timestamps: true });

 const User = mongoose.models.User || mongoose.model('User', userSchema);
 

 export default User