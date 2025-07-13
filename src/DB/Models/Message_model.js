import mongoose from "mongoose";

const Message_schema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String
}, { timestamps: true });

const Message_model = mongoose.models.Message || mongoose.model("Message", Message_schema);

export default Message_model;