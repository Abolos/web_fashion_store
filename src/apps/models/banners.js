const mongoose = require("../../common/init.mongo")();
const bannersSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    image_url: {
      type: String,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
const BannersModel = mongoose.model("Banners", bannersSchema, "banners");
module.exports = BannersModel;
