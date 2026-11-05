const mongoose = require("../../common/init.mongo")();
const productVariantsSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Products",
    },
    sku: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    color_code: {
      type: String,
    },
    stock_quantity: {
      type: Number,
      default: 0,
    },
    image_url: {
      type: String,
    },
  },
  { timestamps: true }
);
const ProductVariantsModel = mongoose.model(
  "Product_Variants",
  productVariantsSchema,
  "product_variants"
);
module.exports = ProductVariantsModel;
