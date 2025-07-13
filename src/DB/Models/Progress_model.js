import mongoose from "mongoose";

const Progress_schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
  status: { type: String, enum: ["In Progress", "Completed"], default: "In Progress" }
}, { timestamps: true });

const Progress_model = mongoose.models.Progress || mongoose.model("Progress", Progress_schema);

export default Progress_model;