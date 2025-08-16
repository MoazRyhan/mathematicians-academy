import * as REPORT_services from "./services/index.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const REPORT_controller = Router()



REPORT_controller.post( "/signup"  , error_handler_middleware(REPORT_services.sign_up_service  ))
REPORT_controller.post( "/login"  , error_handler_middleware(REPORT_services.login_service  ))










export default REPORT_controller