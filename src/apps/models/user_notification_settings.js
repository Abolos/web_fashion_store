const mongoose = require("../../common/init.mongo")();
const userNotificationSettingsSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
      required: true,
      unique: true,
    },
    email_order: {
      type: Boolean,
      default: true,
    },
    email_promo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
const UserNotificationSettingModel = mongoose.model(
  "User_Notification_Settings",
  userNotificationSettingsSchema,
  "user_notification_settings"
);
module.exports = UserNotificationSettingModel;
