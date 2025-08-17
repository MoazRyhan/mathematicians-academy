import Assistant from "../../../DB/Models/assistant.model.js";











export const login_service = async (req, res) => {
  try {








    
    // send the data
    if (user) {
      return res
        .status(201)
        .json({
          message: " sign in is success",
          user,
          access_token: access_token,
          refresh_token: refresh_token,
        });
    } else {
      return res.status(409).json({ message: "failed to SignUp" });
    }
  } catch (error) {
    console.log("error in login ===========> ", error);
    return res.status(500).json({ message: "internal server error " });
  }
};