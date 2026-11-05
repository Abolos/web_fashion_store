const UserModel = require("../../models/users");
const pagination = require("../../../libs/pagination");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    const limit = Number(req.query.limit) || 6;
    const page = Number(req.query.page) || 1;
    const skip = page * limit - limit;
    if (req.query.role) query.role = req.query.role;
    if (req.query.is_active) query.is_active = req.query.is_active === "true";
    const users = await UserModel.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);
    res.status(200).json({
      status: "success",
      filters: {
        role: req.query.role || null,
        is_active: req.query.is_active || null,
      },
      data: users,
      pages: await pagination(page, limit, UserModel, query),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.getFindOne = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found!",
      });
    }
    return res.status(200).json({
      status: "success",
      message: "Get user data successfully!",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { email, phone, password_hash, re_password_hash, full_name } =
      req.body;
    const { file } = req;
    // validate data
    if (!email || !phone || !password_hash || !re_password_hash || !full_name) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields!",
      });
    }
    if (password_hash !== re_password_hash) {
      return res.status(400).json({
        status: "error",
        message: "Password and re-password do not match!",
      });
    }

    if (password_hash.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters long!",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email format!",
      });
    }

    const phoneRegex = /(03|05|07|08|09|01[2|6|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid phone number format!",
      });
    }

    const isUserEmail = await UserModel.findOne({ email });
    if (isUserEmail) {
      return res.status(400).json({
        status: "error",
        message: "Email is already in use!",
      });
    }

    const isUserPhone = await UserModel.findOne({ phone });
    if (isUserPhone) {
      return res.status(400).json({
        status: "error",
        message: "Phone number is already in use!",
      });
    }

    const user = {
      email,
      phone,
      password_hash: await bcrypt.hash(password_hash, 10),
      full_name,
      role: req.body.role || "customer",
      is_active: req.body.is_active == "false" ? false : true,
    };

    if (file) {
      // di chuyen file upload ve thu muc anh
      const avatar_url = "avatars/" + file.originalname;
      fs.renameSync(
        file.path,
        path.resolve("src/public/uploads/images", avatar_url)
      );
      user.avatar_url = avatar_url;
    }
    const newUser = await UserModel.create(user);
    return res.status(201).json({
      status: "success",
      message: "User created successfully!",
      data: newUser,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, password_hash, re_password_hash, full_name } = req.body;
    const { file } = req;

    // Validate required fields (chỉ email, phone, full_name là bắt buộc)
    if (!email || !phone || !full_name) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: email, phone, full_name!",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email format!",
      });
    }

    // Validate phone format
    const phoneRegex = /(03|05|07|08|09|01[2|6|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid phone number format!",
      });
    }

    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ 
        status: "error",
        message: "User not found!" 
      });
    }

    // Tạo object update linh hoạt
    const updateData = {
      email: email,
      phone: phone,
      full_name: full_name,
    };

    // Xử lý password - chỉ validate nếu có cung cấp cả 2 trường
    if (password_hash && re_password_hash) {
      if (password_hash !== re_password_hash) {
        return res.status(400).json({
          status: "error",
          message: "Password and re-password do not match!",
        });
      }

      if (password_hash.length < 6) {
        return res.status(400).json({
          status: "error",
          message: "Password must be at least 6 characters long!",
        });
      }

      updateData.password_hash = await bcrypt.hash(password_hash, 10);
    }
    // Nếu chỉ có 1 trong 2 trường password -> lỗi
    else if (password_hash || re_password_hash) {
      return res.status(400).json({
        status: "error",
        message: "Both password and re-password are required to change password!",
      });
    }
    // Nếu không có password nào -> giữ nguyên password cũ (không cần làm gì)

    // Xử lý role và is_active nếu có (cho admin)
    if (req.body.role !== undefined) {
      updateData.role = req.body.role;
    }
    if (req.body.is_active !== undefined) {
      updateData.is_active = req.body.is_active === "true";
    }

    // Xử lý ảnh mới nếu có
    if (file) {
      const avatar_url = "avatars/" + file.originalname;
      const newImagePath = path.resolve("src/public/uploads/images", avatar_url);

      // Di chuyển file từ thư mục tạm đến thư mục đích
      fs.renameSync(file.path, newImagePath);

      // Xóa ảnh cũ nếu tồn tại và khác ảnh mới
      if (user.avatar_url && user.avatar_url !== avatar_url) {
        const oldImagePath = path.resolve(
          "src/public/uploads/images",
          user.avatar_url
        );
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
          } catch (deleteError) {
            console.error(
              "Error when removing old image:",
              deleteError.message
            );
          }
        }
      }

      updateData.avatar_url = avatar_url;
    }

    // Cập nhật user
    await UserModel.updateOne({ _id: id }, { $set: updateData });

    // Lấy user đã cập nhật
    const updatedUser = await UserModel.findById(id);

    return res.status(200).json({
      status: "success",
      message: "Cập nhật thông tin thành công!",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const isUser = await UserModel.findById(id);
    if (!isUser) {
      return res.status(400).json({
        status: "error",
        message: "User not found!",
      });
    }
    await UserModel.deleteOne({ _id: id });
    return res.status(200).json({
      status: "success",
      message: "User deleted successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};
