import * as accountant_services from "./services/index.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const accountant_controller = Router()



accountant_controller.post( "/signup"  , error_handler_middleware(accountant_services.sign_up_service  ))
accountant_controller.post( "/login"  , error_handler_middleware(accountant_services.login_service  ))

















export default accountant_controller