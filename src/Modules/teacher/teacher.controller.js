import  express  from "express"
const teacher_controller = express()
import * as teacher_services from "./services/index.js"
import { authentication_middleware } from '../../Middlewares/authentication_middleware.js';
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js"
import { authorization_middleware } from "../../Middlewares/authentication_middleware.js";
import { system_role } from "../../Constants/constants.js";

const { TEACHER } = system_role


teacher_controller.use(authentication_middleware() , authorization_middleware([TEACHER]) )
teacher_controller.get(  "/get_teacher_date"   , error_handler_middleware(teacher_services.get_teacher_data)  ) 




export default teacher_controller