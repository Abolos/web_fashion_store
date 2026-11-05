const fs = require("fs");
const path = require("path");
const ProductReviewsModel = require("../../models/product_reviews");
exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    if (req.query.user_id) {
      query.user_id = req.query.user_id;
    }
    if (req.query.product_id) {
      query.product_id = req.query.product_id;
    }
    const productReviews = await ProductReviewsModel.find(query)
      .populate("user_id")
      .populate("product_id")
      .sort({ _id: -1 });
    if (productReviews) {
      return res.status(200).json({
        status: "success",
        message: "Get all product reviews successfully!",
        data: productReviews,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "No product reviews found!",
        data: [],
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

exports.getFindOne = async (req, res) => {
  try {
    const { id } = req.params;
    const productReview = await ProductReviewsModel.findById(id);
    if (productReview) {
      return res.status(200).json({
        status: "success",
        message: "Get product review successfully!",
        data: productReview,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Product review not found!",
        data: null,
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

exports.create = async (req, res) => {
  try {
    const { user_id, order_id } = req.body;
    let ratings = req.body.ratings;
    
    if (typeof ratings === "string") {
      ratings = JSON.parse(ratings);
    }

    for (let i = 0; i < ratings.length; i++) {
      let rating = ratings[i].rating;
      let comment = ratings[i].comment;
      let product_id = ratings[i].product_id;
      
      const imageUrls = [];
      if (req.files) {
        const imageFiles = req.files.filter(f => f.fieldname === `images_${i}`);
        for (const file of imageFiles) {
          const uploadDir = path.resolve("src/public/uploads/images/reviews");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const uniqueName = Date.now() + '-' + file.originalname;
          const image_url = "reviews/" + uniqueName;
          fs.renameSync(
            file.path,
            path.resolve("src/public/uploads/images", image_url)
          );
          imageUrls.push(image_url);
        }
      }

      const evaluate = {
        product_id,
        order_id,
        user_id,
        rating,
        comment,
        images: imageUrls
      };
      await ProductReviewsModel.create(evaluate);
    }
    return res.status(201).json({
      status: "success",
      message: "Create product review successfully!",
    });
  } catch (error) {
    fs.writeFileSync("log.txt", error.stack || error.message);
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
    const { body } = req;
    const productReview = await ProductReviewsModel.findById(id);
    if (!productReview) {
      return res.status(404).json({
        status: "error",
        message: "Product review not found!",
        data: null,
      });
    }
    productReview.product_id = body.product_id || productReview.product_id;
    productReview.user_id = body.user_id || productReview.user_id;
    productReview.order_id = body.order_id || productReview.order_id;
    productReview.rating = body.rating || productReview.rating;
    productReview.comment = body.comment || productReview.comment;
    productReview.reply_user = body.reply_user || productReview.reply_user;
    
    // Xử lý ảnh giữ lại
    let keptImages = productReview.images;
    if (body.kept_images) {
      keptImages = typeof body.kept_images === "string" ? JSON.parse(body.kept_images) : body.kept_images;
    }
    
    // Xử lý ảnh mới upload
    const newImageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadDir = path.resolve("src/public/uploads/images/reviews");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const uniqueName = Date.now() + '-' + file.originalname;
        const image_url = "reviews/" + uniqueName;
        fs.renameSync(
          file.path,
          path.resolve("src/public/uploads/images", image_url)
        );
        newImageUrls.push(image_url);
      }
    }
    
    // Cập nhật mảng ảnh (nếu form không gửi kept_images thì giữ nguyên mảng cũ)
    if (body.kept_images || req.files) {
      productReview.images = [...keptImages, ...newImageUrls];
    }

    const updatedProductReview = await productReview.save();
    return res.status(200).json({
      status: "success",
      message: "Update product review successfully!",
      data: updatedProductReview,
    });
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
    const productReview = await ProductReviewsModel.findById(id);
    if (!productReview) {
      return res.status(404).json({
        status: "error",
        message: "Product review not found!",
        data: null,
      });
    }
    await ProductReviewsModel.findByIdAndDelete(id);
    return res.status(200).json({
      status: "success",
      message: "Delete product review successfully!",
      data: null,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};
