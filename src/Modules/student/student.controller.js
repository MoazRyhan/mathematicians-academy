import express  from "express"
const student_controller = express()
import * as student_service from "./services/index.js"
import { authentication_middleware, authorization_middleware } from '../../Middlewares/authentication_middleware.js';
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js"
import { ImageExtensions, system_role } from "../../Constants/constants.js"
import { Multer_host } from "../../Middlewares/multer_middleware.js";
const { STUDENT } = system_role



student_controller.use(authentication_middleware() , authorization_middleware([STUDENT]) )
student_controller.get(  "/get_student_data"   , error_handler_middleware(student_service.get_student_service)  ) 
student_controller.post(  "/updata_student_data"   , error_handler_middleware(student_service.update_student_service)  ) 
student_controller.delete(  "/delete_student_account"   , error_handler_middleware(student_service.delete_student_service)  )


student_controller.post(  "/make_session_payment"  , Multer_host( ImageExtensions ).array("VodeImage" , 1 )  , error_handler_middleware(student_service.make_payment_service)  ) 
student_controller.get(  "/watch_session_video/:sessionId"   , error_handler_middleware(student_service.watch_session_video_service)  ) 
student_controller.get(  "/get_payment_history"   , error_handler_middleware(student_service.get_payment_history_service)  ) 
student_controller.get("/get_sessions_list", error_handler_middleware(student_service.get_Student_Sessions_service)  ) 
student_controller.get("/get_accessible_session", error_handler_middleware(student_service.get_Accessible_Sessions_service)  ) 




export default student_controller