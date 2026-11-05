const LoginHistoryAdminModel = require("../../models/login_history_admin");
const pagination = require("../../../libs/pagination");
exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    const limit = Number(req.query.limit) || 5;
    const page = Number(req.query.page) || 1;
    const skip = page * limit - limit;
    const historyAdmins = await LoginHistoryAdminModel.find(query)
      .limit(limit)
      .populate("user_id")
      .sort({ _id: -1 })
      .skip(skip);

    return res.status(200).json({
      status: "success",
      message: "Get orders successfully!",
      data: historyAdmins,
      pages: await pagination(page, limit, LoginHistoryAdminModel, query),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      massage: "Internal server error",
      error: error.massage,
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { user_id } = req.body;
    const historyAdmin = await LoginHistoryAdminModel.create({ user_id });
    return res.status(201).json({
      status: "success",
      message: "Create history admin successfully!",
      data: historyAdmin,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.massage,
    });
  }
};
