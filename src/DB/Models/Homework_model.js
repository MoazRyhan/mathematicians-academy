import mongoose from "mongoose";

const Homework_schema = new mongoose.Schema({
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  imageUrl: String,
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Assistant" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Supervisor" },
  status: { type: String, enum: ["Pending", "Graded", "Reviewed"], default: "Pending" }
}, { timestamps: true });

const Homework_model = mongoose.models.Homework || mongoose.model("Homework", Homework_schema);

export default Homework_model;