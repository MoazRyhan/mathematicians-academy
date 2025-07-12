import express from "express"
import DataBase from "./DB/connection.js"
import router_handler from "./Utils/router_handler.utils.js"
import  dotenv  from "dotenv"


dotenv.config()



  
  const bootstrap = () =>{
    const app = express()
    

    // database
    DataBase()
    // test for production
    app.get( "/test" , async (req , res,next ) =>{ if(req.params.value == "prod" ){ return next("router") }   res.status(200).json(  {message : "hello from prod test production " ,mms:req.xhr  } )    } )



    //all the routers
    router_handler( app ,express ) 




    const server = app.listen( process.env.PORT || 3000 , (error) =>{
        // console.log( "server is running on " , process.env.PORT     );
      if (error) {
       throw error // e.g. EADDRINUSE
        }
         console.log(`Listening on =========> ${JSON.stringify(server.address())}`)
        
    })

} 


export default bootstrap


