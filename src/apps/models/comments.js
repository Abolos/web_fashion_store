const mongoose = require("../../common/init.mongo")();
const commentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    product_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Products"
    },

    reply_user: {
        type: String,
        default: null,
    }
  },
  { timestamps: true }
);

const CommentModel = mongoose.model("Comments", commentSchema, "comments");
module.exports = CommentModel;
