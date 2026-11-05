const https = require("https");
const crypto = require("crypto");
const OrdersModel = require("../../models/orders");
const MailService = require("../../services/MailService");
const { apiBE, apiFE } = require("../../../common/redirect.api");

exports.paymentMoMo = async (req, res) => {
  try {
    const { body } = req;

    /* ================== 1. VALIDATE ================== */
    if (!body.items || !body.grand_total) {
      return res.status(400).json({
        status: "error",
        message: "Missing order data",
      });
    }

    /* ================== 2. CREATE ORDER (PENDING) ================== */
    const StockService = require("../../services/StockService");
    await StockService.deductStock(body.items);

    const orderData = {
      user_id: body.user_id,
      customer_email: body.customer_email,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone,
      shipping_address: body.shipping_address,
      coupon_id: body.coupon_id || null,
      shipping_fee: body.shipping_fee,
      item_total: body.item_total,
      grand_total: body.grand_total,
      items: body.items,
      payment_method: body.payment_method || "MOMO",
      payment_status: "pending",
    };

    const orderNew = await OrdersModel.create(orderData);
    // Create notification for admin
    const OrderNotificationModel = require("../../models/OrderNotification");
    await OrderNotificationModel.create({
        order_id: orderNew._id,
        message: `Có một đơn hàng mới từ ${orderNew.customer_email}`,
        customer_email: orderNew.customer_email,
    });

    /* ================== 3. MOMO CONFIG ================== */
    const accessKey = "F8BBA842ECF85";
    const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const partnerCode = "MOMO";
    const requestType = "payWithMethod";

    const orderId = `${orderNew._id}`;
    const requestId = orderId;
    const amount = String(body.grand_total);
    const orderInfo = `Thanh toán đơn hàng #${orderNew._id}`;
    const redirectUrl = `${apiBE}/api/v1/check-payment-momo`;
    const ipnUrl = `${apiBE}/api/v1/check-payment-momo`;
    const extraData = "";

    /* ================== 4. SIGNATURE ================== */
    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    /* ================== 5. REQUEST BODY ================== */
    const requestBody = JSON.stringify({
      partnerCode,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType,
      extraData,
      autoCapture: true,
      lang: "vi",
      signature,
    });

    /* ================== 6. CALL MOMO ================== */
    const options = {
      hostname: "test-payment.momo.vn",
      port: 443,
      path: "/v2/gateway/api/create",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    const momoReq = https.request(options, (momoRes) => {
      let data = "";

      momoRes.on("data", (chunk) => (data += chunk));

      momoRes.on("end", async () => {
        const result = JSON.parse(data);

        if (result.resultCode !== 0) {
          const updatedOrder = await OrdersModel.findByIdAndUpdate(orderNew._id, {
            payment_status: "failed",
          });
          if (updatedOrder && updatedOrder.payment_status === "pending") {
              await StockService.restoreStock(updatedOrder.items);
          }

          return res.status(400).json({
            status: "error",
            message: result.message,
          });
        }

        return res.status(200).json({
          status: "success",
          payUrl: result.payUrl,
          order_id: orderNew._id,
        });
      });
    });

    momoReq.on("error", async () => {
      const updatedOrder = await OrdersModel.findByIdAndUpdate(orderNew._id, {
        payment_status: "failed",
      });
      if (updatedOrder && updatedOrder.payment_status === "pending") {
          await StockService.restoreStock(updatedOrder.items);
      }

      return res.status(500).json({
        status: "error",
        message: "MoMo request failed",
      });
    });

    momoReq.write(requestBody);
    momoReq.end();
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
      message: error.message,
    });
  }
};

exports.checkPaymentMomo = async (req, res) => {
  try {
    const data = req.query;
    const id = data.orderId?.trim();
    if (data.resultCode == '0') {
      const order = {
        status: "confirmed",
        payment_status: "paid",
      };
      const newOrder = await OrdersModel.findByIdAndUpdate(id, order, {
        new: true,
        runValidators: true,
      });

      // Send confirmation email
      await MailService.sendOrderConfirmation(newOrder._id);

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
                }, 5000);
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
