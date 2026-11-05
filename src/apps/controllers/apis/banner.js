const fs = require("fs");
const path = require("path");
const BannersModel = require("../../models/banners");
exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    if (req.query.is_active) query.is_active = req.query.is_active;
    const banners = await BannersModel.find(query).sort({ _id: -1 });
    if (banners) {
      return res.status(200).json({
        status: "success",
        message: "Get all banners successfully!",
        data: banners,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "No banners found!",
        data: [],
      });
    }
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
    const banner = await BannersModel.findById(id);
    if (banner) {
      return res.status(200).json({
        status: "success",
        message: "Get banner successfully!",
        data: banner,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Banner not found!",
        data: null,
      });
    }
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
    const { body, file } = req;
    // insert db
    const banner = {
      title: body.title,
    };
    if (file) {
      // di chuyen file upload ve thu muc anh
      const image_url = "banners/" + file.originalname;
      fs.renameSync(
        file.path,
        path.resolve("src/public/uploads/images", image_url)
      );
      banner.image_url = image_url;
      const newBanner = await BannersModel.create(banner);
      return res.status(201).json({
        status: "success",
        message: "Created banner successfully!",
        data: newBanner,
      });
    }
    const newBanner = await BannersModel.create(banner);
    return res.status(201).json({
      status: "success",
      message: "Created banner successfully!",
      data: newBanner,
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
    const { body, file } = req;
    const banner = await BannersModel.findById(id);
    if (!banner) {
      return res.status(404).json({
        status: "error",
        message: "Banner not found!",
        data: null,
      });
    }
    const bannerData = {
      title: body.title || banner.title,
      is_active: body.is_active === "true" || false,
    };
    // Xử lý ảnh mới nếu có
    if (file) {
      // di chuyen file upload ve thu muc anh
      const image_url = "banners/" + file.originalname;
      fs.renameSync(
        file.path,
        path.resolve("src/public/uploads/images", image_url)
      );
      // Xóa ảnh cũ nếu tồn tại và khác ảnh mới
      if (banner.image_url != image_url) {
        const oldImagePath = path.resolve(
          "src/public/uploads/images",
          banner.image_url
        );
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
          } catch (err) {
            console.error("Error deleting old image:", err);
          }
        }
      }
      bannerData.image_url = image_url;
    } else {
      // Giữ nguyên ảnh cũ nếu không có ảnh mới
      bannerData.image_url = banner.image_url;
    }
    await BannersModel.updateOne({ _id: id }, { $set: bannerData });
    return res.status(200).json({
      status: "success",
      message: "Update banner successfully!",
      data: bannerData,
    });
  } catch (error) {
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
    const banner = await BannersModel.findById(id);
    if (banner) {
      await BannersModel.deleteOne({ _id: id });
      return res.status(200).json({
        status: "success",
        message: "Delete banner successfully!",
        data: null,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Banner not found!",
        data: null,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};
