const mongoose = require("../../common/init.mongo")();
const ordersSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Users",
    },
    customer_email: {
      type: String,
      required: true,
    },
    customer_name: {
      type: String,
      required: true,
    },
    customer_phone: {
      type: String,
      required: true,
    },
    shipping_address: {
      type: String,
      required: true,
    },
    coupon_id: {
      type: mongoose.Types.ObjectId,
      ref: "Coupons",
      default: null,
    },
    shipping_fee: {
      type: Number,
      required: true,
    },
    item_total: {
      type: Number,
      required: true,
    },
    grand_total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending", // Chờ xác nhận
        "confirmed", // Đã xác nhận
        "processing", // Đang xử lý/đóng gói
        "shipped", // Đã giao cho đơn vị vận chuyển
        "out_for_delivery", // Shipper đang giao
        "delivered", // Đã giao hàng thành công
        "cancelled", // Đã hủy
        "return_requested", // Khách yêu cầu trả hàng
        "returned", // Đã trả hàng
        "refunded", // Đã hoàn tiền
      ],
      default: "pending",
    },
    payment_method: {
      type: String,
      enum: ["COD", "MOMO", "VNPAY"],
      default: "COD",
    },
    payment_status: {
      type: String,
      enum: [
        "pending", // Đang chờ thanh toán
        "paid", // Đã thanh toán thành công
        "failed", // Thanh toán thất bại
        "refunded", // Đã hoàn tiền
        "cancelled", // Đã hủy thanh toán
      ],
      default: "pending",
    },
    cancellation_reason: {
      type: String,
      default: null,
    },
    items: [
      {
        product_variant_id: {
          type: mongoose.Types.ObjectId,
          required: true,
          ref: "Product_Variants",
        },
        quantity: {
          type: Number,
          required: true,
        }
      },
    ],
  },
  { timestamps: true }
);

const OrdersModel = mongoose.model("Orders", ordersSchema, "orders");
module.exports = OrdersModel;
