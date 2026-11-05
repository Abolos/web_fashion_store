const mongoose = require("../../common/init.mongo")();
const couponProSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    product_id: {
      type: mongoose.Types.ObjectId,
      ref: "Products",
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    min_order_value: {
      type: Number,
    },
    usage_limit: {
      type: Number,
    },
    used_count: {
      type: Number,
      default: 0,
    },
    start_date: {
      type: Date,
    },
    end_date: {
      type: Date,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
const CouponProModel = mongoose.model("Coupon_Pros", couponProSchema, "coupon-pros");
module.exports = CouponProModel;