const mongoose = require("../../common/init.mongo")();
const shipmentsSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Orders",
    },
    shipping_unit: {
      type: String,
      required: true,
    },
    shipping_code: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    shipped_at: {
      type: Date,
    },
    estimated_delivery: {
      type: Date,
    },
  },
  { timestamps: true }
);
const ShipmentsModel = mongoose.model(
  "Shipments",
  shipmentsSchema,
  "shipments"
);
module.exports = ShipmentsModel;
