const {
  VNPay,
  ignoreLogger,
  ProductCode,
  VnpLocale,
  dateFormat,
} = require("vnpay");
const OrdersModel = require("../../models/orders");
const MailService = require("../../services/MailService");
const { apiBE, apiFE } = require("../../../common/redirect.api");

exports.createQR = async (req, res) => {
  try {
    const vnpay = new VNPay({
      tmnCode: "FIAFY5X6",
      secureSecret: "NQ7MSOIT1IE2O09PKQPYC4YDR42TMQ3O",
      vnpayHost: "https://sandbox.vnpayment.vn",
      testMode: true,
      hashAlgorithm: "SHA512",
      loggerFn: ignoreLogger,
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { body } = req;
    const order = {
      user_id: body.user_id,
      customer_email: body.customer_email,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone,
      shipping_address: body.shipping_address,
      coupon_id: body.coupon_id,
      shipping_fee: body.shipping_fee,
      item_total: body.item_total,
      grand_total: body.grand_total,
      items: body.items,
    };
    if (body.payment_method) {
      order.payment_method = body.payment_method;
    }

    const StockService = require("../../services/StockService");
    await StockService.deductStock(body.items);

    const orderNew = await OrdersModel.create(order);
    // Create notification for admin
    const OrderNotificationModel = require("../../models/OrderNotification");
    await OrderNotificationModel.create({
      order_id: orderNew._id,
      message: `Có một đơn hàng mới từ ${orderNew.customer_email}`,
      customer_email: orderNew.customer_email,
    });
    const vnpayRes = await vnpay.buildPaymentUrl({
      vnp_Amount: Number(orderNew.grand_total), // Số tiền thanh toán (đơn vị: VNĐ)
      vnp_IpAddr: "127.0.0.1", // Địa chỉ IP của khách hàng
      vnp_TxnRef: orderNew._id, // Mã tham chiếu giao dịch (unique)
      vnp_OrderInfo: orderNew._id, // Thông tin đơn hàng
      vnp_OrderType: ProductCode.Other, // Loại hàng hóa
      vnp_ReturnUrl: `${apiBE}/api/v1/check-payment-vnpay`, // URL callback
      vnp_Locale: VnpLocale.VN, // Ngôn ngữ hiển thị ('vn' hoặc 'en'),
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(tomorrow),
    });

    return res.status(201).json({
      status: "success",
      message: "create qr successfully!",
      data: vnpayRes,
    });
  } catch (error) {
    if (error.isStockError) {
      return res.status(400).json({
        status: "error",
        message: error.message,
        failedItem: error.failedItem,
      });
    }
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.checkPaymentVNpay = async (req, res) => {
  try {
    const data = req.query;
    const id = data.vnp_TxnRef?.trim();

    // Kiểm tra mã phản hồi từ VNPay
    const responseCode = data.vnp_ResponseCode;

    if (responseCode === "00") {
      // Thanh toán thành công
      const order = {
        status: "confirmed",
        payment_status: "paid",
        grand_total: Number(data.vnp_Amount) / 100,
      };

      const newOrder = await OrdersModel.findByIdAndUpdate(id, order, {
        new: true,
        runValidators: true,
      });

      // Send confirmation email
      await MailService.sendOrderConfirmation(newOrder._id);

      // Trả về HTML thay vì JSON
      const successHTML = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Thanh toán thành công</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background-color: #f5f5f5;
                }
                .container {
                    text-align: center;
                    padding: 40px;
                    background-color: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .success-icon {
                    color: #28a745;
                    font-size: 60px;
                    margin-bottom: 20px;
                }
                h1 {
                    color: #28a745;
                    margin-bottom: 10px;
                }
                .order-info {
                    text-align: left;
                    margin: 20px 0;
                    padding: 15px;
                    background-color: #f8f9fa;
                    border-radius: 5px;
                }
                .button {
                    display: inline-block;
                    padding: 12px 30px;
                    background-color: #007bff;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 20px;
                }
                .button:hover {
                    background-color: #0056b3;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✓</div>
                <h1>Thanh toán thành công!</h1>
                <p>Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đã được xác nhận.</p>
                
                <div class="order-info">
                    <p><strong>Mã đơn hàng:</strong> ${newOrder._id}</p>
                    <p><strong>Số tiền:</strong> ${newOrder.grand_total.toLocaleString(
                      "vi-VN"
                    )} VNĐ</p>
                    <p><strong>Trạng thái:</strong> Đã thanh toán</p>
                </div>
                
                <p>Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.</p>
            </div>
            <script>
                // Tự động redirect sau 5 giây
                setTimeout(() => {
                    window.location.href = "${apiFE}/orders";
                }, 3000);
            </script>
        </body>
        </html>
      `;

      return res.status(200).send(successHTML);
    } else {
      // Thanh toán thất bại
      const order = await OrdersModel.findById(id);
      if (order && order.payment_status === "pending") {
        const StockService = require("../../services/StockService");
        await StockService.restoreStock(order.items);
      }
      
      const newOrder = await OrdersModel.findByIdAndUpdate(id, {
        status: "cancelled",
        payment_status: "failed",
      });
      const failHTML = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Thanh toán thất bại</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background-color: #f5f5f5;
                }
                .container {
                    text-align: center;
                    padding: 40px;
                    background-color: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .fail-icon {
                    color: #dc3545;
                    font-size: 60px;
                    margin-bottom: 20px;
                }
                h1 {
                    color: #dc3545;
                    margin-bottom: 10px;
                }
                .button {
                    display: inline-block;
                    padding: 12px 30px;
                    background-color: #6c757d;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 20px;
                }
                .button:hover {
                    background-color: #5a6268;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="fail-icon">✗</div>
                <h1>Thanh toán thất bại!</h1>
                <p>Giao dịch không thành công. Vui lòng thử lại.</p>
                <p>Mã lỗi: ${responseCode}</p>
                <p>Thông tin: ${
                  data.vnp_ResponseMessage || "Không có thông tin thêm"
                }</p>
            </div>
        </body>
        </html>
      `;

      return res.status(200).send(failHTML);
    }
  } catch (error) {
    // Trả về HTML error page
    const errorHTML = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Lỗi hệ thống</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #f5f5f5;
              }
              .container {
                  text-align: center;
                  padding: 40px;
                  background-color: white;
                  border-radius: 10px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              }
              .error-icon {
                  color: #ffc107;
                  font-size: 60px;
                  margin-bottom: 20px;
              }
              h1 {
                  color: #ffc107;
                  margin-bottom: 10px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="error-icon">⚠️</div>
              <h1>Đã xảy ra lỗi!</h1>
              <p>Xin lỗi, đã có lỗi xảy ra trong quá trình xử lý.</p>
              <p>Vui lòng liên hệ bộ phận hỗ trợ hoặc thử lại sau.</p>
          </div>
      </body>
      </html>
    `;

    return res.status(500).send(errorHTML);
  }
};
