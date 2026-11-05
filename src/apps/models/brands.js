const mongoose = require("../../common/init.mongo")();
const brandsSchema = new mongoose.Schema(
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
    logo_url: {
      type: String,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
const brandsModel = mongoose.model("Brands", brandsSchema, "brands");
module.exports = brandsModel;
