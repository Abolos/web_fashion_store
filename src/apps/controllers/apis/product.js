const slug = require("slug");
const fs = require("fs");
const path = require("path");
const productsModel = require("../../models/products");
const pagination = require("../../../libs/pagination");
exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    const limit = Number(req.query.limit) || 4;
    const page = Number(req.query.page) || 1;
    const skip = page * limit - limit;
    if (req.query.is_featured) query.is_featured = req.query.is_featured;
    if (req.query.category_id) query.category_id = req.query.category_id;
    if (req.query.gender) query.gender = req.query.gender;
    if (req.query.sort) query.sort = req.query.sort;
    if (req.query.status) query.status = req.query.status;

    // Search by name
    if (req.query.q) {
      query.name = { $regex: req.query.q, $options: "i" };
    }

    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
      query.sale_price = {};
      if (req.query.minPrice) query.sale_price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.sale_price.$lte = Number(req.query.maxPrice);
    }

    const product = await productsModel
      .find(query)
      .populate("category_id")
      .populate("brand_id")
      .sort({ _id: req.query.sort || 1 })
      .skip(skip)
      .limit(limit);
    res.status(200).json({
      status: "success",
      filters: {
        is_featured: req.query.is_featured || null,
        category_id: req.query.category_id || null,
      },
      data: product,
      pages: await pagination(page, limit, productsModel, query),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getFindOne = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productsModel
      .findById(id)
      .populate("category_id")
      .populate("brand_id");
    return res.status(200).json({
      status: "success",
      message: "Get product successfully!",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { body, file } = req;

    // insert db
    const product = {
      name: body.name,
      slug: slug(body.name),
      description: body.description,
      category_id: body.category_id,
      brand_id: body.brand_id,
      gender: body.gender,
      material: body.material,
      is_featured: body.is_featured === "true" || false,
      price: Number(body.price),
      sale_price: Number(body.sale_price),
    };
    if (file) {
      // di chuyen file upload ve thu muc anh
      const image_url = "products/" + file.originalname;
      fs.renameSync(
        file.path,
        path.resolve("src/public/uploads/images", image_url)
      );
      product.image_url = image_url;
      await productsModel(product).save();
      return res.status(201).json({
        stutus: "success",
        message: "Created product successfully!",
        data: product,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const isProduct = await productsModel.findById(id);
    if (!isProduct) {
      return res.status(400).json({
        status: "error",
        message: "Not fount product",
      });
    }
    await productsModel.deleteOne({ _id: id });
    return res.status(200).json({
      status: "success",
      message: "Removed product successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { body, file } = req;

    // Tìm sản phẩm hiện tại
    const existingProduct = await productsModel.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        status: "error",
        message: "Not found this product!",
      });
    }

    // Chuẩn bị dữ liệu cập nhật
    const productData = {
      name: body.name,
      slug: slug(body.name),
      description: body.description,
      category_id: body.category_id,
      brand_id: body.brand_id,
      gender: body.gender,
      material: body.material,
      is_featured: body.is_featured === "true" || false,
      status: body.status === "true" || false,
      price: Number(body.price),
      sale_price: Number(body.sale_price),
    };

    // Xử lý ảnh mới nếu có
    if (file) {
      // Di chuyển file upload về thư mục ảnh
      const image_url = "products/" + file.originalname;
      const newImagePath = path.resolve("src/public/uploads/images", image_url);

      // Di chuyển file từ thư mục tạm đến thư mục đích
      fs.renameSync(file.path, newImagePath);

      // Xóa ảnh cũ nếu tồn tại
      if (existingProduct.image_url != image_url) {
        const oldImagePath = path.resolve(
          "src/public/uploads/images",
          existingProduct.image_url
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

      productData.image_url = image_url;
    } else {
      // Giữ nguyên ảnh cũ nếu không có ảnh mới
      productData.image_url = existingProduct.image_url;
    }

    // Cập nhật sản phẩm
    await productsModel.updateOne({ _id: id }, { $set: productData });

    return res.status(200).json({
      status: "success",
      message: "Update product successfully!",
      data: productData,
    });
  } catch (error) {
    // Nếu có lỗi và đã upload ảnh mới, xóa ảnh mới đi
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (deleteError) {
        console.error("Error when deleting new image:", deleteError.message);
      }
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};
