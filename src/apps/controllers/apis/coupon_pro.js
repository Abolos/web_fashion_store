const CouponProModel = require("../../models/coupon-pros");

exports.getFindAllProductId = async (req, res) => {
  try {
    const query = req.params;
    if (req.query.product_id) {
      query.product_id = req.query.product_id;
    }
    if (req.query.is_active) query.is_active = req.query.is_active;
    const couponPros = await CouponProModel.find(query).sort({ _id: -1 });
    return res.status(200).json({
      status: "success",
      message: "Get coupon pros successfully!",
      data: couponPros,
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
    const couponPro = await CouponProModel.findById(id).sort({ _id: -1 });
    if (!couponPro) {
      return res.status(401).json({
        status: "error",
        message: "Coupon Pro is not found!",
      });
    }
    return res.status(200).json({
      status: "success",
      message: "Get coupon pro successfully!",
      data: couponPro,
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
    const {
      name,
      type,
      value,
      min_order_value,
      product_id,
      usage_limit,
      used_count,
      start_date,
      end_date,
      is_active,
    } = req.body;
    const couponPro = new CouponProModel({
      name,
      product_id,
      type,
      value,
      min_order_value,
      usage_limit,
      used_count,
      start_date,
      end_date,
      is_active,
    });
    await couponPro.save();
    return res.status(201).json({
      status: "success",
      message: "Create coupon pro successfully!",
      data: couponPro,
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
    const couponPro = await CouponProModel.findById(id);
    if (!couponPro) {
      return res.status(400).json({
        status: "error",
        message: "Coupon Pro is not found!",
      });
    }
    const {
      name,
      type,
      value,
      min_order_value,
      usage_limit,
      used_count,
      start_date,
      end_date,
      is_active,
    } = req.body;
    couponPro.name = name || couponPro.name;
    couponPro.type = type || couponPro.type;
    couponPro.value = value || couponPro.value;
    couponPro.min_order_value = min_order_value || couponPro.min_order_value;
    couponPro.usage_limit = usage_limit || couponPro.usage_limit;
    couponPro.used_count = used_count || couponPro.used_count;
    couponPro.start_date = start_date || couponPro.start_date;
    couponPro.end_date = end_date || couponPro.end_date;
    couponPro.is_active =
      is_active !== undefined ? is_active : couponPro.is_active;
    await couponPro.save();
    return res.status(200).json({
      status: "success",
      message: "Update coupon pro successfully!",
      data: couponPro,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const couponPro = await CouponProModel.findById(id);
    if (!couponPro) {
      return res.status(400).json({
        status: "error",
        message: "Coupon Pro is not found!",
      });
    }
    await CouponProModel.findByIdAndDelete(id);
    return res.status(200).json({
      status: "success",
      message: "Delete coupon pro successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};
