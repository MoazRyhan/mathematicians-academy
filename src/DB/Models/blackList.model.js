import mongoose from "mongoose";


 const black_list_schema = new mongoose.Schema({

    token_id : {  type : String , require : true , unique : true},
    expiration_data : {  type : String , require : true }


},{timestamp:true}  )




const blackList = mongoose.models.blackList || mongoose.model("blackList" , black_list_schema)


export default blackList 