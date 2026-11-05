const FavoritesModel = require("../../models/favorites");
const ProductsModel = require("../../models/products");

exports.getFavorites = async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "Missing user_id",
      });
    }

    const favorites = await FavoritesModel.find({ user_id })
      .populate("product_id")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: "success",
      message: "Get favorites successfully!",
      data: favorites,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.addFavorite = async (req, res) => {
  try {
    const { user_id, product_id } = req.body;

    if (!user_id || !product_id) {
      return res.status(400).json({
        status: "error",
        message: "Missing user_id or product_id",
      });
    }

    // Check if product exists
    const product = await ProductsModel.findById(product_id);
    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      });
    }

    // Check if already favorited
    const existingFavorite = await FavoritesModel.findOne({ user_id, product_id });
    if (existingFavorite) {
      return res.status(400).json({
        status: "error",
        message: "Product already in favorites",
      });
    }

    const newFavorite = await FavoritesModel.create({ user_id, product_id });

    return res.status(201).json({
      status: "success",
      message: "Added to favorites successfully!",
      data: newFavorite,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.removeFavorite = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedFavorite = await FavoritesModel.findByIdAndDelete(id);

    if (!deletedFavorite) {
      return res.status(404).json({
        status: "error",
        message: "Favorite not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Removed from favorites successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.removeFavoriteByProduct = async (req, res) => {
  try {
    const { user_id, product_id } = req.query;

    if (!user_id || !product_id) {
      return res.status(400).json({
        status: "error",
        message: "Missing user_id or product_id",
      });
    }

    const deletedFavorite = await FavoritesModel.findOneAndDelete({ user_id, product_id });

    if (!deletedFavorite) {
      return res.status(404).json({
        status: "error",
        message: "Favorite not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Removed from favorites successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};
