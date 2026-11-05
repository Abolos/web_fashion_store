const fs = require("fs");
const path = require("path");
const ProductVariantsModel = require("../../models/product_variants");
const mongoose = require("mongoose");
const pagination = require("../../../libs/pagination");

exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    const limit = Number(req.query.limit) || 6;
    const page = Number(req.query.page) || 1;
    const skip = page * limit - limit;
    if (req.query.size) {
      query.size = req.query.size;
    }
    if (req.query.color) {
      query.color = req.query.color;
    }
    if (req.query.stock_quantity) {
      query.stock_quantity = req.query.stock_quantity;
    }
    if (req.query.product_id) query.product_id = req.query.product_id;
    const productVariants = await ProductVariantsModel.find(query)
      .populate("product_id")
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);
    if (productVariants) {
      return res.status(200).json({
        status: "success",
        message: "Get all product variants successfully!",
        data: productVariants,
        pages: await pagination(page, limit, ProductVariantsModel, query),
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "No product variants found!",
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
    const { size, color, product_id } = req.body;
    const query = {
      size: size,
      color: color,
      product_id: product_id,
    };
    const productVariant = await ProductVariantsModel.findOne(query).populate(
      "product_id"
    );
    if (productVariant) {
      return res.status(200).json({
        status: "success",
        message: "Get product variant successfully!",
        data: productVariant,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Product variant not found!",
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

exports.getFindOneProductVariantId = async (req, res) => {
  try {
    const { id } = req.params;
    const productVariant = await ProductVariantsModel.findById(id).populate(
      "product_id"
    );
    if (productVariant) {
      return res.status(200).json({
        status: "success",
        message: "Get product variant successfully!",
        data: productVariant,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Product variant not found!",
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
    const productVariant = {
      product_id: body.product_id,
      sku: body.sku,
      size: body.size,
      color: body.color,
      color_code: body.color_code,
      stock_quantity: body.stock_quantity,
    };
    if (file) {
      // di chuyen file upload ve thu muc anh
      const image_url = "product_variants/" + file.originalname;
      fs.renameSync(
        file.path,
        path.resolve("src/public/uploads/images", image_url)
      );
      productVariant.image_url = image_url;
      const newProductVariant = await ProductVariantsModel.create(
        productVariant
      );
      return res.status(201).json({
        stutus: "success",
        message: "Created product successfully!",
        data: newProductVariant,
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

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { body, file } = req;
    const productVariant = await ProductVariantsModel.findById(id);
    if (!productVariant) {
      return res.status(404).json({
        status: "error",
        message: "Product variant not found!",
      });
    } else {
      productVariant.product_id = body.product_id || productVariant.product_id;
      productVariant.sku = body.sku || productVariant.sku;
      productVariant.size = body.size || productVariant.size;
      productVariant.color = body.color || productVariant.color;
      productVariant.color_code = body.color_code || productVariant.color_code;
      productVariant.stock_quantity =
        body.stock_quantity || productVariant.stock_quantity;
      // Xử lý ảnh mới nếu có
      if (file) {
        // Di chuyển file upload về thư mục ảnh
        const image_url = "product_variants/" + file.originalname;
        const newImagePath = path.resolve(
          "src/public/uploads/images",
          image_url
        );

        // Di chuyển file từ thư mục tạm đến thư mục đích
        fs.renameSync(file.path, newImagePath);

        // Xóa ảnh cũ nếu tồn tại
        if (productVariant.image_url != image_url) {
          const oldImagePath = path.resolve(
            "src/public/uploads/images",
            productVariant.image_url
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

        productVariant.image_url = image_url;
      } else {
        // Giữ nguyên ảnh cũ nếu không có ảnh mới
        productVariant.image_url = productVariant.image_url;
      }

      // Cập nhật sản phẩm
      await ProductVariantsModel.updateOne(
        { _id: id },
        { $set: productVariant }
      );

      return res.status(200).json({
        status: "success",
        message: "Update product successfully!",
        data: productVariant,
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

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const productVariant = await ProductVariantsModel.findById(id);
    if (productVariant) {
      await ProductVariantsModel.deleteOne({ _id: id });
      return res.status(200).json({
        status: "success",
        message: "Delete product variant successfully!",
        data: null,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Product variant not found!",
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

exports.getFindSku = async (req, res) => {
  try {
    const { product_id } = req.params;

    const uniqueSkus = await ProductVariantsModel.aggregate([
      {
        $match: {
          product_id: mongoose.Types.ObjectId(product_id), // Lọc theo product_id
        },
      },
      {
        $group: {
          _id: "$sku", // Nhóm theo sku
          productVariant: { $first: "$$ROOT" }, // Lưu thông tin của bản ghi đầu tiên với sku đó
        },
      },
      {
        $replaceRoot: { newRoot: "$productVariant" }, // Thay đổi cấu trúc để trả về thông tin đầy đủ
      },
    ]);

    return res.status(200).json({
      status: "success",
      data: uniqueSkus,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.bulkCreate = async (req, res) => {
  try {
    const { body, file } = req;
    const { product_id, color, color_code } = body;
    const variants = JSON.parse(body.variants); // Expecting array of { size, stock_quantity, sku }

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Image is required!",
      });
    }

    const image_url = "product_variants/" + file.originalname;
    const destPath = path.resolve("src/public/uploads/images", image_url);
    
    // Check if file exists, if not rename
    if (!fs.existsSync(destPath)) {
      fs.renameSync(file.path, destPath);
    } else {
      // If it already exists, we delete the temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    const productVariantsToCreate = variants.map((v) => ({
      product_id,
      sku: v.sku,
      size: v.size,
      color,
      color_code,
      stock_quantity: v.stock_quantity,
      image_url,
    }));

    const newProductVariants = await ProductVariantsModel.insertMany(
      productVariantsToCreate
    );

    return res.status(201).json({
      status: "success",
      message: `Created ${newProductVariants.length} product variants successfully!`,
      data: newProductVariants,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};
