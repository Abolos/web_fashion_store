const mongoose = require("../../common/init.mongo")();
const productReviewsSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Products",
    },
    user_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Users",
    },
    order_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Orders",
    },
    rating: {
      type: Number,
      required: true,
    },
    comment: {
      type: String,
      default: null,
    },
    images: {
      type: [String],
      default: [],
    },
    reply_user: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);
const ProductReviewsModel = mongoose.model(
  "Product_reviews",
  productReviewsSchema,
  "product_reviews"
);
module.exports = ProductReviewsModel;
