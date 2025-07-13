import mongoose from "mongoose";

const Teacher_schema = new mongoose.Schema({
  name: String,
  email: String,
  password: String
}, { timestamps: true });

const Teacher_model = mongoose.models.Teacher || mongoose.model("Teacher", Teacher_schema);

export default Teacher_model;