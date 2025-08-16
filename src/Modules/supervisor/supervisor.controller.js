import * as supervisor_services from "./services/index.js"
import  Router  from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const supervisor_controller = Router()



supervisor_controller.post( "/signup"  , error_handler_middleware(supervisor_services.sign_up_service  ))
supervisor_controller.post( "/login"  , error_handler_middleware(supervisor_services.login_service  ))









export default supervisor_controller