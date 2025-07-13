import mongoose from "mongoose";

const Parent_schema = new mongoose.Schema({
  name: String,
  email: String,
  password: String
}, { timestamps: true });

const Parent_model = mongoose.models.Parent || mongoose.model("Parent", Parent_schema);

export default Parent_model;