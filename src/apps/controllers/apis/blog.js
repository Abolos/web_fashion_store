const BlogsModel = require("../../models/blogs");
const slug = require("slug");
const fs = require("fs");
const path = require("path");

exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    if (req.query.is_published) query.is_published = req.query.is_published;
    const blogs = await BlogsModel.find(query).sort({ _id: 1 });
    return res.status(200).json({
      status: "success",
      data: blogs,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.getFindOne = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await BlogsModel.findById(id);
    if (!blog) {
      return res.status(404).json({
        status: "error",
        message: "Blog not found!",
      });
    }
    return res.status(200).json({
      status: "success",
      message: "Get blog data successfully!",
      data: blog,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, content } = req.body;
    const { file } = req;
    if (!title || !content) {
      return res.status(400).json({
        status: "error",
        message: "Title and content are required!",
      });
    }
    const blog = {
      title,
      content,
      slug: slug(title),
    };

    if (file) {
      // di chuyen file upload ve thu muc anh
      const thumbnail_url = "blogs/" + file.originalname;
      fs.renameSync(
        file.path,
        path.resolve("src/public/uploads/images", thumbnail_url)
      );
      blog.thumbnail_url = thumbnail_url;
      const newBlog = await BlogsModel.create(blog);
      return res.status(201).json({
        status: "success",
        message: "Create blog successfully!",
        data: newBlog,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await BlogsModel.deleteOne({ _id: id });
    if (!blog) {
      return res.status(404).json({
        status: "error",
        message: "Blog not found!",
        data: null,
      });
    } else {
      return res.status(200).json({
        status: "success",
        message: "Delete blog successfully!",
        data: blog,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, is_published } = req.body;
    const { file } = req;
    const blog = await BlogsModel.findById(id);
    if (!blog) {
      return res.status(404).json({
        status: "error",
        message: "Blog not found!",
        data: null,
      });
    }
    const blogDate = {
      title: title || blog.title,
      content: content || blog.content,
      slug: slug(title) || blog.slug,
      is_published: is_published,
    };
    if (file) {
      // di chuyen file upload ve thu muc anh
      const thumbnail_url = "blogs/" + file.originalname;
      fs.renameSync(
        file.path,
        path.resolve("src/public/uploads/images", thumbnail_url)
      );
      if (blog.thumbnail_url != thumbnail_url) {
        const oldThumbnailPath = path.resolve(
          "src/public/uploads/images",
          blog.thumbnail_url
        );
        if (fs.existsSync(oldThumbnailPath)) {
          try {
            fs.unlinkSync(oldThumbnailPath);
          } catch (error) {
            console.error("Error deleting old thumbnail:", error);
          }
        }
      }
      blogDate.thumbnail_url = thumbnail_url;
    }else {
      blogDate.thumbnail_url = blog.thumbnail_url;
    }
    await BlogsModel.updateOne({ _id: id }, blogDate);
    return res.status(200).json({
      status: "success",
      message: "Update blog successfully!",
      data: blogDate,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};
