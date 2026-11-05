const mongoose = require("../../common/init.mongo")();
const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    slug: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    thumbnail_url: {
        type: String,
    },
    is_published: {
        type: Boolean,
        default: true,
    },
}, {timestamps: true});

const BlogsModel = mongoose.model("Blogs", blogSchema, "blogs");
module.exports = BlogsModel;