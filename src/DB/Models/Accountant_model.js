import mongoose from "mongoose";

const Accountant_schema = new mongoose.Schema({
  name: String,
  email: String,
  password: String
}, { timestamps: true });

const Accountant_model = mongoose.models.Accountant || mongoose.model("Accountant", Accountant_schema);

export default Accountant_model;