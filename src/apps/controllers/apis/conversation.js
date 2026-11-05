const ConversationModel = require("../../models/Conversation");
const pagination = require("../../../libs/pagination");

// Lấy tất cả Conversations
exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    const limit = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;
    const skip = page * limit - limit;

    // Lọc theo user_id nếu có
    if (req.query.user_id) {
      query.user_id = req.query.user_id;
    }
    
    // Lọc theo session_id nếu có
    if (req.query.session_id) {
      query.session_id = req.query.session_id;
    }

    const conversations = await ConversationModel.find(query)
      .populate("user_id", "full_name email avatar_url")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      status: "success",
      data: { conversations },
      pages: await pagination(page, limit, ConversationModel, query),
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách Conversation:", error);
    res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Lấy chi tiết một Conversation
exports.getFindOne = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await ConversationModel.findById(id).populate(
      "user_id",
      "full_name email avatar_url"
    );
    
    if (!conversation) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy Conversation!",
      });
    }
    
    return res.status(200).json({
      status: "success",
      message: "Lấy chi tiết conversation thành công!",
      data: conversation,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Tạo một Conversation
exports.create = async (req, res) => {
  try {
    const { user_id, session_id, messages } = req.body;

    if (!session_id) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu session_id",
      });
    }

    const conversation = new ConversationModel({
      user_id: user_id || null,
      session_id,
      messages: messages || [],
    });

    await conversation.save();

    res.status(201).json({
      status: "success",
      message: "Thêm thành công!",
      data: { conversation },
    });
  } catch (error) {
    console.error("Lỗi tạo Conversation:", error);
    res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Cập nhật Conversation
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const conversation = await ConversationModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate("user_id", "full_name email avatar_url");

    if (!conversation) {
      return res.status(404).json({
        status: "error",
        message: "Conversation không tồn tại",
      });
    }

    res.json({
      status: "success",
      message: "Cập nhật thành công!",
      data: { conversation },
    });
  } catch (error) {
    console.error("Lỗi cập nhật Conversation:", error);
    res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Xóa Conversation
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await ConversationModel.findById(id);
    if (!conversation) {
      return res.status(404).json({
        status: "error",
        message: "Conversation không tồn tại",
      });
    }
    await ConversationModel.deleteOne({ _id: id });
    return res.status(200).json({
      status: "success",
      message: "Xóa Conversation thành công",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: error.message,
    });
  }
};
