import * as admin_services from "./services/index.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const admin_controller = Router()



admin_controller.post( "/signup"  , error_handler_middleware(admin_services.sign_up_service  ))
admin_controller.post( "/login"  , error_handler_middleware(admin_services.login_service  ))



export default admin_controller