const mongoose = require("../../common/init.mongo")();
const couponsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
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
const CouponsModel = mongoose.model("Coupons", couponsSchema, "coupons");
module.exports = CouponsModel;
