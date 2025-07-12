import mongoose from "mongoose";


const Assistant_schema = new mongoose.Schema({

}, {timestamps :true} )







const Assistant_model =  mongoose.models.Assistants || mongoose.model("Assistant" , Assistant_schema )





export default Assistant_model