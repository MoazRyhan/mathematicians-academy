import mongoose from "mongoose";


const Teacher_schema = new mongoose.Schema({

}, {timestamps :true} )







const Teacher_model =  mongoose.models.Teachers || mongoose.model("Teacher" , Teacher_schema )





export default Teacher_model