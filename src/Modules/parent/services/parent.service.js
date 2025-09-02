import User from "../../../DB/Models/user.model.js";
import Parent from "../../../DB/Models/parent.model.js";
import { decryption } from "../../../Utils/encryption.utils.js";











export const get_parent_data_service = async (req, res) => {
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


export const update_parent_service = async (req, res) => {
  try {
    const { email } = req.login_user;

    // 1️⃣ جلب الـ User من الإيميل
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // 2️⃣ جلب الـ Parent المرتبط بالـ User
    const parent = await Parent.findOne({ user: user._id });
    if (!parent) {
      return res.status(404).json({ message: "❌ Parent not found" });
    }

    // 3️⃣ البيانات المحدثة
    const { name, email: newEmail, phoneNumber, parentName } = req.body;

    let isChanged = false;
    const userUpdates = {};
    const parentUpdates = {};

    // ✅ تحديث الاسم في الـ User
    if (name && user.name !== name) {
      userUpdates.name = name;
      isChanged = true;
    }

    // ✅ تحديث الإيميل مع التأكد من عدم تكراره
    if (newEmail) {
      const normalizedEmail = newEmail.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const emailExists = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: user._id },
        });
        if (emailExists) {
          return res.status(400).json({ message: "❌ Email already in use" });
        }
        userUpdates.email = normalizedEmail;
        isChanged = true;
      }
    }

    // ✅ تحديث رقم الهاتف مع التشفير
    if (phoneNumber) {
      const decryptedPhone = await decryption({
        cipher: user.phoneNumber,
        secret_key: process.env.PHONE_ENCRYPTION_SECRET,
      });

      if (decryptedPhone !== phoneNumber) {
        const encryptedPhone = await encryption({
          value: phoneNumber,
          secret_key: process.env.PHONE_ENCRYPTION_SECRET,
        });
        userUpdates.phoneNumber = encryptedPhone;
        isChanged = true;
      }
    }

    // ✅ تحديث اسم الـ Parent
    if (parentName && parent.parentName !== parentName) {
      parentUpdates.parentName = parentName;
      isChanged = true;
    }

    if (!isChanged) {
      return res.status(400).json({
        message: "⚠️ No changes detected. Data is already up to date.",
        user,
        parent,
      });
    }

    let updatedUser = user;
    if (Object.keys(userUpdates).length > 0) {
      updatedUser = await User.findByIdAndUpdate(user._id, { $set: userUpdates }, { new: true, select: "-password" });
    }

    let updatedParent = parent;
    if (Object.keys(parentUpdates).length > 0) {
      updatedParent = await Parent.findByIdAndUpdate(parent._id, { $set: parentUpdates }, { new: true });
    }

    return res.status(200).json({
      message: "✅ Parent & User data updated successfully",
      user: updatedUser,
      parent: updatedParent,
    });

  } catch (error) {
    console.error("❌ Error in update_parent_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
  


export const delete_parent_service = async (req, res) => {
  try {
    const { _id } = req.login_user;

    // ✅ حذف الـ User
    const deletedUser = await User.findByIdAndDelete(_id);
    if (!deletedUser) {
      return res.status(404).json({ message: "❌ No account found with this ID" });
    }

    // ✅ حذف الـ Parent
    await Parent.findOneAndDelete({ user: _id });

    // ✅ لو عندك أي بيانات مرتبطة بالـ Parent ممكن تضيف حذفها هنا

    return res.status(200).json({ message: "✅ Parent account and related data deleted successfully" });

  } catch (error) {
    console.error("❌ Error in delete_parent_service:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
