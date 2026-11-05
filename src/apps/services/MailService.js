const ejs = require("ejs");
const transporter = require("../../libs/transporter");
const path = require("path");
const OrdersModel = require("../models/orders");

class MailService {
  /**
   * Send order confirmation email to customer
   * @param {string} orderId - The ID of the order
   */
  static async sendOrderConfirmation(orderId) {
    console.log(`[MailService] === START SENDING EMAIL ===`);
    console.log(`[MailService] Order ID: ${orderId}`);
    try {
      // Fetch the order with populated fields to show product details in the email
      const order = await OrdersModel.findById(orderId)
        .populate("user_id")
        .populate({
          path: "items.product_variant_id",
          populate: {
            path: "product_id",
          },
        })
        .populate("coupon_id");

      if (!order) {
        console.error(`[MailService] ERROR: Order with ID ${orderId} not found in database.`);
        return;
      }

      console.log(`[MailService] Order found. Customer: ${order.customer_name}, Email: ${order.customer_email}`);
      console.log(`[MailService] Payment Method: ${order.payment_method}, Status: ${order.status}`);

      const templatePath = path.join(__dirname, "../views/order-confirmation.ejs");
      console.log(`[MailService] Rendering template: ${templatePath}`);
      
      const html = await ejs.renderFile(templatePath, { order });
      console.log(`[MailService] Template rendered successfully. Length: ${html.length} chars`);
      
      const mailOptions = {
        from: '"Mystery Fashion" <xintuoiquan@gmail.com>',
        to: order.customer_email,
        subject: `[Mystery Fashion] Xác nhận đơn hàng #${order._id}`,
        html,
      };

      console.log(`[MailService] Sending via transporter to ${order.customer_email}...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`[MailService] SUCCESS: Email sent! Message ID: ${info.messageId}`);
    } catch (error) {
      console.error("[MailService] CRITICAL ERROR:", error);
    }
    console.log(`[MailService] === END SENDING EMAIL ===`);
  }
}

module.exports = MailService;
