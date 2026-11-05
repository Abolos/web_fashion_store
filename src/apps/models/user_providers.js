const mongoose = require("../../common/init.mongo")();
const userProviderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId(),
    },
    provider: {
      type: String,
      required: true,
    },
    provider_id: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);
const UserProviderModel = mongoose.model(
  "User_Providers",
  userProviderSchema,
  "user_providers"
);
module.exports = UserProviderModel;
