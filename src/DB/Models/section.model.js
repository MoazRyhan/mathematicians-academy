import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  materials: [{
    type: String  // could be pdf links, docs, slides, etc.
  }],
  sessionDate: { type: Date, required: true },
  duration: { type: Number, default: 60 }, // in minutes

  // Relations
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  grade: { type: String, required: true },
  division: { type: String, required: true },

}, { timestamps: true });

const Section = mongoose.models.section || mongoose.model("Section", sectionSchema);

export default Section;
