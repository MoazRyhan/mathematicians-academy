import auth_controller from "../modules/auth/auth_controller.js"





const router_handler = async (app , express  ) => {


    app.use( express.json() )

    app.use( "/auth" ,  auth_controller )





    app.use(  '/{*any}', (req , res ) => {  
        res.status(404).json( { message : " this Router is not found " } )
     }  )

}












export default router_handler