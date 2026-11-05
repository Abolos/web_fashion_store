const FAQModel = require("../../models/FAQ");
const pagination = require("../../../libs/pagination");

// Lấy tất cả FAQ
exports.getFAQs = async (req, res) => {
  try {
    const query = {};
    const limit = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;
    const skip = page * limit - limit;
    query.is_active = true;
    const faqs = await FAQModel.find(query)
      .select("question answer category")
      .sort({ createdAt: -1 });

    res.json({
      status: "success",
      data: { faqs },
      pages: await pagination(page, limit, FAQModel, query),
    });
  } catch (error) {
    console.error("Lỗi lấy FAQ:", error);
    res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: error.message,
    });
  }
};

exports.getFindOne = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQModel.findById(id);
    return res.status(200).json({
      status: "success",
      message: "Get faq successfully!",
      data: faq,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Thêm FAQ mới
exports.createFAQ = async (req, res) => {
  try {
    const { question, answer, category } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu question hoặc answer",
      });
    }

    const faq = new FAQModel({
      question,
      answer,
      category: category || "general",
    });

    await faq.save();

    res.status(201).json({
      status: "success",
      data: {
        faq: {
          _id: faq._id,
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi thêm FAQ:", error);
    res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Cập nhật FAQ
exports.updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, is_active } = req.body;

    const faq = await FAQModel.findByIdAndUpdate(
      id,
      { question, answer, category, is_active },
      { new: true, runValidators: true }
    );

    if (!faq) {
      return res.status(404).json({
        status: "error",
        message: "FAQ không tồn tại",
      });
    }

    res.json({
      status: "success",
      data: { faq },
    });
  } catch (error) {
    console.error("Lỗi cập nhật FAQ:", error);
    res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Xóa FAQ (soft delete)
exports.deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQModel.findById(id);
    if (!faq) {
      return res.status(404).json({
        status: "error",
        message: "FAQ không tồn tại",
      });
    }
    await FAQModel.deleteOne({ _id: id });
    return res.status(200).json({
      status: "success",
      message: "Xóa FAQ thành công",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: error.message,
    });
  }
};
