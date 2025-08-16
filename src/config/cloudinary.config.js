import { v2 as cloudinaryV2 } from 'cloudinary';







export const cloudinary =  ( ) =>{
    // Configuration
    cloudinaryV2.config({ 
        cloud_name: process.env.CLOUDINARY_NAME, 
        api_key: process.env.API_KEY, 
        api_secret: process.env.API_SECURE // Click 'View API Keys' above to copy your API secret
    });

    return cloudinaryV2
}






