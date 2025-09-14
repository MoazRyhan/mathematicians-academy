import multer from "multer";
import fs from "fs"



export const Multer_host = (  allowed_extensions = [] ) => {

    try {
        const storage = multer.diskStorage({
        })
    
        const fileFilter = ( req ,file , cb ) =>{
            if (allowed_extensions.includes(file.mimetype)) {
                cb(  null /* i don't need a error back set it null */  , true)
            }else { cb(new Error("invalid extension file") , false ) }
        }
    
        const upload = multer({ fileFilter , storage})
        return upload
    } catch (error) {
        console.log(  "internal multer host middleware error" , error );
       return res.status(500).json({ message : "internal multer host middleware error " , error })
    }
} 


