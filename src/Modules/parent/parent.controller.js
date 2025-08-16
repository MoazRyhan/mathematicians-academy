import * as parent_services from "./services/index.js"
import { Router } from "express";
import { error_handler_middleware } from "../../Middlewares/error_handler_middleware.js";
const parent_controller = Router()



parent_controller.post( "/get_parent_data"  , error_handler_middleware(parent_services.get_parent_data  ))











export default parent_controller