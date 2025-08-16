import * as payment_services from "./services/index.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const payment_controller = Router()



payment_controller.post( "/signup"  , error_handler_middleware(payment_services.sign_up_service  ))
payment_controller.post( "/login"  , error_handler_middleware(payment_services.login_service  ))

















export default payment_controller