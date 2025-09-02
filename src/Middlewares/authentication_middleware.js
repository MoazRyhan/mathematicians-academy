import jwt from "jsonwebtoken";
import blackList from "../DB/Models/blackList.model.js";
import User from "../DB/Models/user.model.js";




export const authentication_middleware = () => {
  return async (req, res, next) => {
    try {
      const { access_token } = req.headers;

      if (!access_token) {
        return res.status(401).json({ message: "please login first" });
      }

      // decode the data
      const decoding_access_token = jwt.verify(
        access_token,
        process.env.JWT_ACCESS_TOKEN_SECRET_KEY 
      );

      // check if in black list
      const if_black_list = blackList.findOne({
        token_id: decoding_access_token.jti,
      });
      if (!if_black_list) {
        return res
          .status(401)
          .json({ message: "this token is expired please login again" });
      }

      // console.log(decoding_access_token);
      
      // find the data
      const user = await User.findById(
        decoding_access_token.id,
        "-password -__v"
      );
      if (!user) {
        return res.status(404).json({ message: "this user is not found" });
      }
      // console.log( user._doc );

      req.login_user =  {
        ...user._doc,
        token: {
          token_id: decoding_access_token.jti,
          expiration_data: decoding_access_token.exp,
        },
      };

      next();
    } catch (error) {
      console.log(
        "internal authentication middleware error  ==========>",
        error
      );
      return res
        .status(500)
        .json({
          message: "internal authentication middleware error====>",
          error,
        });
    }
  };
};

export const authorization_middleware = (allow_role) => {
  return async (req, res, next) => {
    try {
      const { role: login_user_role } = req.login_user;

      const is_user_allowed = allow_role.includes(login_user_role);
      
      if (!is_user_allowed) {
        return res.status(401).json({ message: "unauthorized" });
      }

      next();
    } catch (error) {
      console.log("internal authorization middleware  error=====>", error);
      return res
        .status(500)
        .json({
          message: "internal authorization middleware  error====>",
          error,
        });
    }
  };
};
