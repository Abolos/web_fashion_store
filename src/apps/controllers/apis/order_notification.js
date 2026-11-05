const OrderNotificationModel = require("../../models/OrderNotification");

exports.getUnread = async (req, res) => {
  try {
    const notifications = await OrderNotificationModel.find({ is_read: false })
      .sort({ createdAt: -1 })
      .limit(20);
    
    return res.status(200).json({
      status: "success",
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const page = Number(req.query.page) || 1;
    const skip = page * limit - limit;

    const notifications = await OrderNotificationModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await OrderNotificationModel.countDocuments();

    return res.status(200).json({
      status: "success",
      data: notifications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await OrderNotificationModel.findByIdAndUpdate(
      id,
      { is_read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Marked as read successfully",
      data: notification,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await OrderNotificationModel.updateMany({ is_read: false }, { is_read: true });
    return res.status(200).json({
      status: "success",
      message: "All notifications marked as read",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
