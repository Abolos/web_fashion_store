const mongoose = require("../../common/init.mongo")();
const addressSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
      unique: true,
    },
    recipient_name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address_line: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    // phuong xa
    ward: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);
const AddressModel = mongoose.model("Addresses", addressSchema, "addresses");
module.exports = AddressModel;
