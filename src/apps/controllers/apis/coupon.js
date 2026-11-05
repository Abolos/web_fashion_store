const CouponsModel = require("../../models/coupons");
exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    if (req.query.is_active) query.is_active = req.query.is_active;
    const coupons = await CouponsModel.find(query).sort({ _id: -1 });
    return res.status(200).json({
      status: "success",
      message: "Get coupons successfully!",
      data: coupons,
    });
  } catch (error) {
    return status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getFindOne = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await CouponsModel.findById(id).sort({ _id: -1 });
    if (!coupon) {
      return res.status(401).json({
        status: "error",
        message: "Coupon is not found!",
      });
    }
    return res.status(200).json({
      status: "success",
      message: "Get coupon successfully!",
      data: coupon,
    });
  } catch (error) {
    return status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await CouponsModel.findById(id);
    if (!coupon) {
      return res.status(400).json({
        status: "error",
        message: "Coupon is not found!",
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

    const couponUpdate = {
      name: name || coupon.name,
      type: type || coupon.type,
      value: value || coupon.value,
      min_order_value: min_order_value || coupon.min_order_value,
      usage_limit: usage_limit || coupon.usage_limit,
      used_count: used_count || coupon.used_count,
      start_date: start_date || coupon.start_date,
      end_date: end_date || coupon.end_date,
      is_active: is_active,
    };

    const updateCoupon = await CouponsModel.findByIdAndUpdate(
      id, 
      couponUpdate,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      status: "success",
      message: "Update coupon successfully!",
      data: updateCoupon,
    });
  } catch (error) {
    return status(500).json({
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
      usage_limit,
      start_date,
      end_date,
    } = req.body;
    if (
      !name ||
      !type ||
      !value ||
      !min_order_value ||
      !usage_limit ||
      !start_date ||
      !end_date
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please fill in all fields!",
      });
    }

    const coupon = await CouponsModel.create({
      name,
      type,
      value,
      min_order_value,
      usage_limit,
      start_date,
      end_date,
    });

    return res.status(201).json({
      status: "success",
      message: "Create coupon successfully!",
      data: coupon,
    });
  } catch (error) {
    return status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await CouponsModel.findById(id);
    if (!coupon) {
      return res.status(400).json({
        status: "error",
        message: "Coupon not found!",
      });
    }

    await CouponsModel.deleteOne({ _id: id });
    return res.status(200).json({
      status: "success",
      message: "Delete coupon successfully!",
    });
  } catch (error) {
    return status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};
