import mongoose from "mongoose";


const Course_schema = new mongoose.Schema({

}, {timestamps :true} )







const Course_model =  mongoose.models.Courses || mongoose.model("Course" , Course_schema )





export default Course_model