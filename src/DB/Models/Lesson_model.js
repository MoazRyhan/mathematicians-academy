import mongoose from "mongoose";

const Lesson_schema = new mongoose.Schema({
  title: String,
  videoUrl: String,
  pdfUrl: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }
}, { timestamps: true });

const Lesson_model = mongoose.models.Lesson || mongoose.model("Lesson", Lesson_schema);

export default Lesson_model;