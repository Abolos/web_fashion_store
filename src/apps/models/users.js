const mongoose = require("../../common/init.mongo")();
const userSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    email: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    password_hash: {
      type: String,
      default: null,
    },
    full_name: {
      type: String,
      default: null,
    },
    avatar_url: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      default: 'customer',
      enum: ['customer', 'admin', 'staff', "shipper"]
    }, 
    otp_verify: {
      type: Number,
      default: null,
    },   
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const UserModel = mongoose.model("Users", userSchema, "users");
module.exports = UserModel;
