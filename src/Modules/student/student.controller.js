import express  from "express"
const student_controller = express()
import * as student_service from "./services/index.js"
import { authentication_middleware, authorization_middleware } from '../../Middlewares/authentication_middleware.js';
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js"
import { system_role } from "../../Constants/constants.js"
const { STUDENT   } = system_role



student_controller.use(authentication_middleware() , authorization_middleware([STUDENT]) )
student_controller.get(  "/get_student_date"   , error_handler_middleware(student_service.get_student_service)  ) 
student_controller.post(  "/updata_student_date"   , error_handler_middleware(student_service.update_student_service)  ) 
student_controller.delete(  "/delete_student_account"   , error_handler_middleware(student_service.delete_student_service)  )






export default student_controller