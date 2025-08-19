import User from "../../../DB/Models/user.model.js";
import Parent from "../../../DB/Models/parent.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";











export const get_parent_data = async (req, res) => {
  try {
    // 1️⃣ Get the email of the logged-in user
    const { email } = req.login_user;

    // 2️⃣ Find the user by email
    const user = await User.findOne({ email } , "-password" );
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 3️⃣ Find the parent linked with this user
    const parent = await Parent.findOne({ user: user._id })
      .populate({ path: "student", select: "-password" });

    if (!parent) {
      return res.status(404).json({ message: "❌ Parent not found" });
    }

    // 4️⃣ Decrypt sensitive fields from User
    const decryptedUser = {
      ...user.toObject(),
      phoneNumber: user.phoneNumber
        ? await decryption({
            cipher: user.phoneNumber,
            secret_key: process.env.PHONE_ENCRYPTION_SECRET,
          })
        : null,
    };

    // 5️⃣ Prepare parent data
    const parentData = {
      ...parent.toObject(),
      // لو في أي فيلدات حساسة جوة Parent (مثلا parentPhoneNumber) ممكن نفكها هنا
    };

    // 6️⃣ Return response
    return res.status(200).json({
      message: "✅ User and Parent data retrieved successfully",
      user: decryptedUser,
      parent: parentData,
    });
  } catch (error) {
    console.log("❌ Error from get_parent_data =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



// any thing below is under testing
//===========================================
