






export const authentication_middleware = () =>{
    return async ( req , res , next ) =>{

        try {
            const { access_token } = req.headers

            
            next()
        } catch (error) {
            console.log(  "internal authentication middleware error  ==========>" , error );
            res.status(500).json({ message : "internal authentication middleware error====>" , error })
        }

    }
}



export const authorization_middleware = (allow_role) =>{
    return async ( req , res , next ) =>{
 
        try {
            
            next()
        } catch (error) {
            console.log(  "internal authorization middleware  error=====>" , error );
            res.status(500).json({ message : "internal authorization middleware  error====>" , error })
        }

    }
}