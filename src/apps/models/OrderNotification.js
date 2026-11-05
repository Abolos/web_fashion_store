const mongoose = require("../../common/init.mongo")();

const orderNotificationSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Types.ObjectId,
      ref: "Orders",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    customer_email: {
      type: String,
      required: true,
    },
    is_read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const OrderNotificationModel = mongoose.model(
  "OrderNotifications",
  orderNotificationSchema,
  "order_notifications"
);

module.exports = OrderNotificationModel;
