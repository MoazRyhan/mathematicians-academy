import mongoose from "mongoose";

const Student_schema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Parent" }
}, { timestamps: true });

const Student_model = mongoose.models.Student || mongoose.model("Student", Student_schema);

export default Student_model;