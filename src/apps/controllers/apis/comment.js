const CommentModel = require("../../models/comments");
const pagination = require("../../../libs/pagination");
exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    const limit = Number(req.query.limit) || 4;
    const page = Number(req.query.page) || 1;
    const skip = page * limit - limit;
    if (req.query.product_id) {
      query.product_id = req.query.product_id;
    }
    if (req.query.user_id) {
      query.user_id = req.query.user_id;
    }
    const comments = await CommentModel.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .populate("user_id")
      .populate("product_id")
      .skip(skip);

    return res.status(200).json({
      status: "success",
      message: "Get comments successfully!",
      data: comments,
      pages: await pagination(page, limit, CommentModel, query),
    });
  } catch (error) {
    return res.status(500).json({
      status: error,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getFindOne = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await CommentModel.findById(id);
    if (!comment) {
      return res.status(404).json({
        status: "error",
        message: "Comment not found!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "get comment successfully!",
      data: comment,
    });
  } catch (error) {
    return res.status(500).json({
      status: error,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { body } = req;
    const comment = {
      user_id: body.user_id,
      content: body.content,
      product_id: body.product_id,
    };
    const newComment = await CommentModel.create(comment);
    return res.status(201).json({
      status: "success",
      message: "Create comment successfully!",
      data: newComment,
    });
  } catch (error) {
    return res.status(500).json({
      status: error,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const isComment = await CommentModel.findById(id);
    if (!isComment) {
      return res.status(404).json({
        status: "error",
        message: "Comment not found!",
      });
    }
    const { body } = req;
    const comment = {
      user_id: body.user_id || isComment.user_id,
      content: body.content || isComment.content,
      product_id: body.product_id || isComment.product_id,
      reply_user: body.reply_user || isComment.reply_user,
    };
    const newComment = await CommentModel.findByIdAndUpdate(id, comment, {
      new: true,
      runValidators: true,
    });
    return res.status(201).json({
      status: "success",
      message: "update comment successfully!",
      data: newComment,
    });
  } catch (error) {
    return res.status(500).json({
      status: error,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await CommentModel.findById(id);
    if (!comment) {
      return res.status(404).json({
        status: "error",
        message: "Comment not found!",
      });
    }
    await CommentModel.deleteOne({_id: id})
    return res.status(200).json({
      status: "success",
      message: "delete comment successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: error,
      message: "Internal server error",
      error: error.message,
    });
  }
};
