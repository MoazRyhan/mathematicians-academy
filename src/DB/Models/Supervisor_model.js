import mongoose from "mongoose";

const Supervisor_schema = new mongoose.Schema({
  name: String,
  email: String,
  password: String
}, { timestamps: true });

const Supervisor_model = mongoose.models.Supervisor || mongoose.model("Supervisor", Supervisor_schema);

export default Supervisor_model;