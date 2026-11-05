const mongoose = require("../../common/init.mongo")();
const loginHistoryAdminSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Users",
    },
  },
  { timestamps: true }
);
const LoginHistoryAdminModel = mongoose.model(
  "Login_History_Admin",
  loginHistoryAdminSchema,
  "Login_history_admin"
);
module.exports = LoginHistoryAdminModel;
