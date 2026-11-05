const mongoose = require("../../common/init.mongo")();

const favoritesSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    product_id: {
      type: mongoose.Types.ObjectId,
      ref: "Products",
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure a user can only favorite a product once
favoritesSchema.index({ user_id: 1, product_id: 1 }, { unique: true });

const favoritesModel = mongoose.model("Favorites", favoritesSchema, "favorites");
module.exports = favoritesModel;
