const mongoose = require("../../common/init.mongo")();
const cartsSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    pro_variant_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Product_Variants",
    },
    quantity: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);
const CartModel = mongoose.model("Carts", cartsSchema, "carts");
module.exports = CartModel;
