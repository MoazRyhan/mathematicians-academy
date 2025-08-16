import multer from "multer";
import fs from "fs"



// to ways to store 
// diskStorage    memoryStorage

export const Multer_local = ( destination_path = "general" , allowed_extensions = [] ) => {

    try {
        
    const main_path = `Assets/${destination_path}`
    if (!fs.existsSync(main_path)) {
        fs.mkdirSync(main_path , {recursive:true} )
    }

    const storage = multer.diskStorage({

        destination:function (req , file ,cb ) {
            
            cb(null /* i don't need a error back set it null */  , main_path)
        },
        filename: function (req , file , cb) {
            // console.log(file); /*  here is before parsing the data */
            
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9 )
            cb(null /* i don't need a error back set it null */ , uniqueSuffix + '-' + file.originalname)
        }


    })

    const fileFilter = ( req ,file , cb ) =>{
        if (allowed_extensions.includes(file.mimetype)) {
            cb(  null /* i don't need a error back set it null */  , true)
        }else { cb(new Error("invalid extension file") , false ) }
    }

    const upload = multer({ fileFilter , storage})
    return upload
} catch (error) {
    console.log(  "internal multer local middleware error" , error );
   return res.status(500).json({ message : "internal multer local middleware error " , error })
}
} 



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


