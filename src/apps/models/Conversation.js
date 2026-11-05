const mongoose = require("../../common/init.mongo")();

const messageSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
  text: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  is_from_faq: {
    type: Boolean,
    default: false
  },
  faq_id: {
    type: mongoose.Types.ObjectId,
    ref: 'FAQ'
  }
}, { timestamps: true });

const conversationSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
  user_id: {
    type: mongoose.Types.ObjectId,
    ref: 'Users',
    required: false
  },
  session_id: {
    type: String,
    required: true
  },
  messages: [messageSchema]
}, { timestamps: true });

// Cập nhật thời gian khi có message mới
conversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const ConversationModel = mongoose.model("Conversation", conversationSchema, "conversations");
module.exports = ConversationModel;