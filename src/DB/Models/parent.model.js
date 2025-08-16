import mongoose from "mongoose";

const parentSchema = new mongoose.Schema({

  parentName: { type: String} ,

  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },


  student: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],

  
}, { timestamps: true });

 const Parent = mongoose.models.Parent || mongoose.model('Parent', parentSchema);

  export default Parent