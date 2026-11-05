const mongoose = require("../../common/init.mongo")();

const faqSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "general",
    },
    created_by: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Tạo index để tìm kiếm nhanh
faqSchema.index({ question: "text", answer: "text" });

const FAQModel = mongoose.model("FAQ", faqSchema, "faqs");
module.exports = FAQModel;
