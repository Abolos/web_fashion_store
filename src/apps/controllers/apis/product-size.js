const ProductSizeModel = require("../../models/product-size");
const mongoose = require("mongoose");
const pagination = require("../../../libs/pagination");

// GET ALL - Lấy danh sách bảng size (có phân trang và filter)
exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    const limit = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;
    const skip = page * limit - limit;
    
    // Filters
    if (req.query.product_type) {
      query.product_type = req.query.product_type;
    }
    if (req.query.gender) {
      query.gender = req.query.gender;
    }
    if (req.query.form_type) {
      query.form_type = req.query.form_type;
    }
    if (req.query.is_active !== undefined) {
      query.is_active = req.query.is_active === 'true';
    }
    
    const productSizes = await ProductSizeModel.find(query)
      .sort({ product_type: 1, gender: 1, form_type: 1 })
      .skip(skip)
      .limit(limit);
      
    if (productSizes && productSizes.length > 0) {
      return res.status(200).json({
        status: "success",
        message: "Get all product sizes successfully!",
        data: productSizes,
        pages: await pagination(page, limit, ProductSizeModel, query),
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "No product sizes found!",
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

// GET ONE - Lấy một bảng size theo ID
exports.getFindOne = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid ID format!",
        data: null,
      });
    }
    
    const productSize = await ProductSizeModel.findById(id);
    
    if (productSize) {
      return res.status(200).json({
        status: "success",
        message: "Get product size successfully!",
        data: productSize,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Product size not found!",
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

// GET BY FILTER - Lấy bảng size theo product_type, gender và form_type
exports.getFindByFilter = async (req, res) => {
  try {
    const { product_type, gender, form_type } = req.query;
    
    if (!product_type || !gender) {
      return res.status(400).json({
        status: "error",
        message: "product_type and gender are required!",
        data: null,
      });
    }
    
    const query = {
      product_type: product_type,
      gender: gender,
      is_active: true
    };
    
    if (form_type) {
      query.form_type = form_type;
    }
    
    const productSize = await ProductSizeModel.findOne(query);
    
    if (productSize) {
      return res.status(200).json({
        status: "success",
        message: "Get product size successfully!",
        data: productSize,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Product size not found!",
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

// SUGGEST SIZE - Gợi ý size dựa trên chiều cao và cân nặng
exports.suggestSize = async (req, res) => {
  try {
    const { product_type, gender, form_type, height, weight } = req.body;
    
    if (!product_type || !gender || !height || !weight) {
      return res.status(400).json({
        status: "error",
        message: "product_type, gender, height and weight are required!",
        data: null,
      });
    }
    
    const query = {
      product_type: product_type,
      gender: gender,
      form_type: form_type || 'regular',
      is_active: true
    };
    
    const productSize = await ProductSizeModel.findOne(query);
    
    if (!productSize) {
      return res.status(404).json({
        status: "error",
        message: "Size chart not found!",
        data: null,
      });
    }
    
    const suggestedSize = productSize.suggestSize(Number(height), Number(weight));
    
    if (suggestedSize) {
      const measurements = productSize.getMeasurements(suggestedSize);
      
      return res.status(200).json({
        status: "success",
        message: "Size suggested successfully!",
        data: {
          suggested_size: suggestedSize,
          measurements: measurements,
          size_chart: productSize.size_chart,
          advice_notes: productSize.advice_notes
        },
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Cannot suggest size for given height and weight!",
        data: {
          size_chart: productSize.size_chart,
          advice_notes: productSize.advice_notes
        },
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

// CREATE - Tạo mới bảng size
exports.create = async (req, res) => {
  try {
    const { body } = req;
    
    // Validate required fields
    if (!body.product_type || !body.gender) {
      return res.status(400).json({
        status: "error",
        message: "product_type and gender are required!",
        data: null,
      });
    }
    
    // Kiểm tra xem đã tồn tại bảng size chưa
    const existingSize = await ProductSizeModel.findOne({
      product_type: body.product_type,
      gender: body.gender,
      form_type: body.form_type || 'regular'
    });
    
    if (existingSize) {
      return res.status(400).json({
        status: "error",
        message: "Size chart already exists for this product type, gender and form type!",
        data: null,
      });
    }
    
    // Tạo mới bảng size
    const productSizeData = {
      product_type: body.product_type,
      gender: body.gender,
      form_type: body.form_type || 'regular',
      size_chart: body.size_chart || [],
      measurements: body.measurements || { unit: 'cm', data: {} },
      advice_notes: body.advice_notes || [],
      is_active: body.is_active !== undefined ? body.is_active : true
    };
    
    const newProductSize = await ProductSizeModel.create(productSizeData);
    
    return res.status(201).json({
      status: "success",
      message: "Created product size successfully!",
      data: newProductSize,
    });
    
  } catch (error) {
    // Xử lý lỗi unique index
    if (error.code === 11000) {
      return res.status(400).json({
        status: "error",
        message: "Size chart already exists for this product type, gender and form type!",
        error: error.message,
      });
    }
    
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

// UPDATE - Cập nhật bảng size
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid ID format!",
        data: null,
      });
    }
    
    const productSize = await ProductSizeModel.findById(id);
    
    if (!productSize) {
      return res.status(404).json({
        status: "error",
        message: "Product size not found!",
        data: null,
      });
    }
    
    // Kiểm tra trùng lặp nếu thay đổi product_type, gender hoặc form_type
    if (body.product_type || body.gender || body.form_type) {
      const checkQuery = {
        product_type: body.product_type || productSize.product_type,
        gender: body.gender || productSize.gender,
        form_type: body.form_type || productSize.form_type,
        _id: { $ne: id }
      };
      
      const existingSize = await ProductSizeModel.findOne(checkQuery);
      
      if (existingSize) {
        return res.status(400).json({
          status: "error",
          message: "Another size chart already exists with these parameters!",
          data: null,
        });
      }
    }
    
    // Cập nhật các trường
    const updateData = {};
    
    if (body.product_type !== undefined) updateData.product_type = body.product_type;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.form_type !== undefined) updateData.form_type = body.form_type;
    if (body.size_chart !== undefined) updateData.size_chart = body.size_chart;
    if (body.measurements !== undefined) updateData.measurements = body.measurements;
    if (body.advice_notes !== undefined) updateData.advice_notes = body.advice_notes;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    
    const updatedProductSize = await ProductSizeModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    return res.status(200).json({
      status: "success",
      message: "Update product size successfully!",
      data: updatedProductSize,
    });
    
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: "error",
        message: "Size chart already exists for this product type, gender and form type!",
        error: error.message,
      });
    }
    
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

// DELETE - Xóa bảng size (Hard delete)
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid ID format!",
        data: null,
      });
    }
    
    const productSize = await ProductSizeModel.findById(id);
    
    if (productSize) {
      await ProductSizeModel.deleteOne({ _id: id });
      
      return res.status(200).json({
        status: "success",
        message: "Delete product size successfully!",
        data: null,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Product size not found!",
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

// SOFT DELETE - Xóa mềm (set is_active = false)
exports.softDelete = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid ID format!",
        data: null,
      });
    }
    
    const productSize = await ProductSizeModel.findById(id);
    
    if (productSize) {
      productSize.is_active = false;
      await productSize.save();
      
      return res.status(200).json({
        status: "success",
        message: "Soft delete product size successfully!",
        data: null,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Product size not found!",
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

// RESTORE - Khôi phục bảng size đã xóa mềm
exports.restore = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid ID format!",
        data: null,
      });
    }
    
    const productSize = await ProductSizeModel.findById(id);
    
    if (productSize) {
      productSize.is_active = true;
      await productSize.save();
      
      return res.status(200).json({
        status: "success",
        message: "Restore product size successfully!",
        data: productSize,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Product size not found!",
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

// BULK CREATE - Tạo nhiều bảng size cùng lúc
exports.bulkCreate = async (req, res) => {
  try {
    const { sizes } = req.body;
    
    if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "sizes array is required!",
        data: null,
      });
    }
    
    const results = await ProductSizeModel.insertMany(sizes, { ordered: false });
    
    return res.status(201).json({
      status: "success",
      message: `Created ${results.length} product sizes successfully!`,
      data: results,
    });
    
  } catch (error) {
    // Xử lý lỗi khi có duplicate
    if (error.writeErrors) {
      return res.status(207).json({
        status: "partial",
        message: `Created with some errors. ${error.insertedDocs.length} succeeded, ${error.writeErrors.length} failed.`,
        data: {
          succeeded: error.insertedDocs,
          failed: error.writeErrors.map(e => e.errmsg)
        },
      });
    }
    
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

// GET ALL PRODUCT TYPES - Lấy danh sách các loại sản phẩm
exports.getProductTypes = async (req, res) => {
  try {
    const types = await ProductSizeModel.distinct('product_type');
    
    return res.status(200).json({
      status: "success",
      message: "Get product types successfully!",
      data: types,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

// GET SIZE CHART BY GENDER - Lấy tất cả bảng size theo giới tính
exports.getByGender = async (req, res) => {
  try {
    const { gender } = req.params;
    const { is_active } = req.query;
    
    const query = { gender: gender };
    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }
    
    const sizes = await ProductSizeModel.find(query)
      .sort({ product_type: 1, form_type: 1 });
    
    return res.status(200).json({
      status: "success",
      message: `Get ${gender} size charts successfully!`,
      data: sizes,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};