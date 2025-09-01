import Accountant from "../../../DB/Models/accountant.model.js";
import User from "../../../DB/Models/user.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";





export const get_accountant_data_service = async (req, res) => {
  try {
    // 1️⃣ Get the email of the logged-in user
    const { email } = req.login_user;

    // 2️⃣ Find the user by email
    const user = await User.findOne({ email }, "-password");
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 3️⃣ Find the accountant linked with this user
    const accountant = await Accountant.findOne({ user: user._id })
    .populate({
    path: "admin",
    select: "_id user", // جيب فقط الـ user من الـ Admin
    populate: {
      path: "user", // الـ user اللي جوه الـ Admin
      select: "name email", // هنا بنجيب الاسم والإيميل
    },
  })
  .populate("payments"); // جلب تفاصيل الدفعات

    if (!accountant) {
      return res.status(404).json({ message: "❌ Accountant not found" });
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

    // 5️⃣ Prepare accountant data
    const accountantData = {
      ...accountant.toObject(),
    };

    // 6️⃣ Return response
    return res.status(200).json({
      message: "✅ User and Accountant data retrieved successfully",
      user: decryptedUser,
      accountant: accountantData,
    });
  } catch (error) {
    console.error("❌ Error from get_accountant_data =====>", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ============= all the other APIS is in payments for the admin and the accountant