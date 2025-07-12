import mongoose from "mongoose";


const Parent_schema = new mongoose.Schema({

}, {timestamps :true} )







const Parent_model =  mongoose.models.Parents || mongoose.model("Parent" , Parent_schema )





export default Parent_model