const mongoose = require("../../common/init.mongo")();
const productsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    category_id: {
      type: mongoose.Types.ObjectId,
      ref: "Categories",
      required: true,
    },
    brand_id: {
      type: mongoose.Types.ObjectId,
      ref: "Brands",
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    material: {
      type: String,
    },
    is_featured: {
      type: Boolean,
      default: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
    image_url: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    sale_price: {
      type: Number,
      required: true,
    }
  },
  { timestamps: true }
);
const productsModel = mongoose.model("Products", productsSchema, "products");
module.exports = productsModel;
