import express  from "express"
const student_controller = express()
import * as student_service from "./services/index.js"
import { Multer_host, Multer_local } from "../../Middlewares/multer_middleware.js"
import { ImageExtensions } from "../../Constants/constants.js"
import { authentication_middleware } from '../../Middlewares/authentication_middleware.js';
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js"




student_controller.use(authentication_middleware())
student_controller.get(  "/get_student_data"   , error_handler_middleware(student_service.get_student_data)  ) 
student_controller.post(  "/updata_student_data"   , error_handler_middleware(student_service.update_student_data)  ) 


student_controller.patch(  "/upload_cloud_profile_image"  , Multer_host( ImageExtensions ).single("image") , error_handler_middleware(student_service.upload_cloud_profile_image)  )
student_controller.put(  "/upload_cloud_cover_images"  , Multer_host( ImageExtensions ).array("images" ,5 ) , error_handler_middleware(student_service.upload_cloud_cover_images)  )
student_controller.delete(  "/delete_student_account"   , error_handler_middleware(student_service.delete_student_account)  )






export default student_controller