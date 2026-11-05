const OrdersModel = require("../../models/orders");
const MailService = require("../../services/MailService");
const pagination = require("../../../libs/pagination");
exports.getfindAll = async (req, res) => {
  try {
    const query = {};
    const limit = Number(req.query.limit) || 1000;
    const page = Number(req.query.page) || 1;
    const skip = page * limit - limit;
    if (req.query.user_id) {
      query.user_id = req.query.user_id;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.payment_status) {
      query.payment_status = req.query.payment_status;
    }
    const orders = await OrdersModel.find(query)
      .populate({
        path: "items.product_variant_id",
        populate: {
          path: "product_id",
          populate: {
            path: "brand_id",
            model: "Brands",
          },
        },
      })
      .populate("coupon_id")
      .limit(limit)
      .sort({ _id: -1 })
      .skip(skip);

    return res.status(200).json({
      status: "success",
      message: "Get orders successfully!",
      data: orders,
      pages: await pagination(page, limit, OrdersModel, query),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getfindOne = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await OrdersModel.findById(id);
    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order is not found",
      });
    }
    return res.status(200).json({
      status: "success",
      message: "get order successfully!",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.create = async (req, res) => {
  try {
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

    // Send confirmation email if payment method is COD
    if (orderNew.payment_method === "COD") {
      await MailService.sendOrderConfirmation(orderNew._id);
    }

    return res.status(201).json({
      status: "success",
      message: "Create order successfully!",
      data: orderNew,
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

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req;
    const isOrder = await OrdersModel.findById(id);
    if (!isOrder) {
      return res.status(404).json({
        status: "error",
        message: "Order is not found",
      });
    }
    const order = {
      user_id: body.user_id || isOrder.user_id,
      customer_email: body.customer_email || isOrder.customer_email,
      customer_phone: body.customer_phone || isOrder.customer_phone,
      shipping_address: body.shipping_address || isOrder.shipping_address,
      coupon_id: body.coupon_id || isOrder.coupon_id,
      shipping_fee: body.shipping_fee || isOrder.shipping_fee,
      item_total: body.item_total || isOrder.item_total,
      grand_total: body.grand_total || isOrder.grand_total,
      status: body.status || isOrder.status,
      payment_method: body.payment_method || isOrder.payment_method,
      payment_status: body.payment_status || isOrder.payment_status,
      cancellation_reason:
        body.cancellation_reason || isOrder.cancellation_reason,
      items: body.items || isOrder.items,
    };

    const newOrder = await OrdersModel.findByIdAndUpdate(id, order, {
      new: true,
      runValidators: true,
    });
    return res.status(200).json({
      status: "success",
      message: "update order successfully!",
      data: newOrder,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await OrdersModel.findById(id);
    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order is not found",
      });
    }

    await OrdersModel.deleteOne({ _id: id });
    return res.status(200).json({
      status: "success",
      message: "delete order successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};
