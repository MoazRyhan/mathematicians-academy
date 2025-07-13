import mongoose from "mongoose";

const Exam_schema = new mongoose.Schema({
  title: String,
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }
}, { timestamps: true });

const Exam_model = mongoose.models.Exam || mongoose.model("Exam", Exam_schema);

export default Exam_model;