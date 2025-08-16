import * as assistant_services from "./services/index.js"
import  Router  from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const assistant_controller = Router()



assistant_controller.post( "/signup"  , error_handler_middleware(assistant_services.sign_up_service  ))
assistant_controller.post( "/login"  , error_handler_middleware(assistant_services.login_service  ))












export default assistant_controller