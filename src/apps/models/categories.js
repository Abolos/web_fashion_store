const mongoose = require("../../common/init.mongo")();
const categoriesSchema = new mongoose.Schema(
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
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
const CategoriesModel = mongoose.model(
  "Categories",
  categoriesSchema,
  "categories"
);
module.exports = CategoriesModel;
