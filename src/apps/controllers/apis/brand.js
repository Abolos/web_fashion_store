const slug = require("slug");
const fs = require("fs");
const path = require("path");
const brandsModel = require("../../models/brands");
exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    if (req.query.is_active) query.is_active = req.query.is_active;
    const brands = await brandsModel.find(query).sort({ _id: -1 });
    if (brands) {
      return res.status(200).json({
        status: "success",
        message: "Get all brands successfully!",
        data: brands,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "No brands found!",
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
    const brand = await brandsModel.findById(id);
    if (brand) {
      return res.status(200).json({
        status: "success",
        message: "Get brand successfully!",
        data: brand,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Brand not found!",
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
    const brand = {
      name: body.name,
      slug: slug(body.name),
    };
    if (file) {
      // di chuyen file upload ve thu muc anh
      const logo_url = "brands/" + file.originalname;
      fs.renameSync(
        file.path,
        path.resolve("src/public/uploads/images", logo_url)
      );
      brand.logo_url = logo_url;
      const newBrand = await brandsModel.create(brand);
      return res.status(201).json({
        status: "success",
        message: "Created brand successfully!",
        data: newBrand,
      });
    }
    const newBrand = await brandsModel.create(brand);
    return res.status(201).json({
      status: "success",
      message: "Created brand successfully!",
      data: newBrand,
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

    // Tìm sản phẩm hiện tại
    const existingBrand = await brandsModel.findById(id);
    if (!existingBrand) {
      return res.status(404).json({
        status: "error",
        message: "Not found this brand!",
      });
    }

    // Chuẩn bị dữ liệu cập nhật
    const brandData = {
      name: body.name,
      slug: slug(body.name),
      is_active: body.is_active === "true" || false,
    };

    // Xử lý ảnh mới nếu có
    if (file) {
      // Di chuyển file upload về thư mục ảnh
      const logo_url = "brands/" + file.originalname;
      const newImagePath = path.resolve("src/public/uploads/images", logo_url);

      // Di chuyển file từ thư mục tạm đến thư mục đích
      fs.renameSync(file.path, newImagePath);

      // Xóa ảnh cũ nếu tồn tại
      if (existingBrand.logo_url != logo_url) {
        const oldImagePath = path.resolve(
          "src/public/uploads/images",
          existingBrand.logo_url
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

      brandData.logo_url = logo_url;
    } else {
      // Giữ nguyên ảnh cũ nếu không có ảnh mới
      brandData.logo_url = existingBrand.logo_url;
    }
    await brandsModel.updateOne({ _id: id }, { $set: brandData });

    return res.status(200).json({
      status: "success",
      message: "Update brand successfully!",
      data: brandData,
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
    const brand = await brandsModel.findById(id);
    if (brand) {
      await brandsModel.findByIdAndDelete(id);
      return res.status(200).json({
        status: "success",
        message: "Deleted brand successfully!",
        data: null,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Brand not found!",
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
