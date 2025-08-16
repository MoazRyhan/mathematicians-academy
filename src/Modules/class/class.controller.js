import * as class_services from "./services/index.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const class_controller = Router()



class_controller.post( "/signup"  , error_handler_middleware(class_services.sign_up_service  ))
class_controller.post( "/login"  , error_handler_middleware(class_services.login_service  ))

















export default class_controller