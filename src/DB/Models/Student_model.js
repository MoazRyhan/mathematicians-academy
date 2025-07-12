import mongoose from "mongoose";


const Student_schema = new mongoose.Schema({

}, {timestamps :true} )







const Student_model =  mongoose.models.Students || mongoose.model("Student" , Student_schema )





export default Student_model