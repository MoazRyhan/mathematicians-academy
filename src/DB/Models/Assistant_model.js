import mongoose from "mongoose";

const Assistant_schema = new mongoose.Schema({
  name: String,
  email: String,
  password: String
}, { timestamps: true });

const Assistant_model = mongoose.models.Assistant || mongoose.model("Assistant", Assistant_schema);

export default Assistant_model;