import * as exam_services from "./services/index.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const exam_controller = Router()



exam_controller.post( "/signup"  , error_handler_middleware(exam_services.sign_up_service  ))
exam_controller.post( "/login"  , error_handler_middleware(exam_services.login_service  ))













export default exam_controller