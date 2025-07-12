import CryptoJS from "crypto-js";



export const encryption =  async ( { value , secret_key }={} ) =>{
    return CryptoJS.AES.encrypt( JSON.stringify( {value} ) , secret_key ).toString()
}


export const decryption = async ( {cipher , secret_key } ={} ) =>{

    return CryptoJS.AES.decrypt( cipher , secret_key ).toString(CryptoJS.enc.Utf8)
}