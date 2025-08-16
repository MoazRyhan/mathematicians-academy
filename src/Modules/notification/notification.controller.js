import * as notification_services from "./services/index.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const notification_controller = Router()



notification_controller.post( "/signup"  , error_handler_middleware(notification_services.sign_up_service  ))
notification_controller.post( "/login"  , error_handler_middleware(notification_services.login_service  ))

















export default notification_controller