const CategoriesModel = require("../../models/categories");
const slug = require("slug");
exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    if (req.query.is_active) query.is_active = req.query.is_active;
    const categories = await CategoriesModel.find(query).sort({ _id: 1 });
    if (categories) {
      return res.status(200).json({
        status: "success",
        message: "Get all categories successfully!",
        data: categories,
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
    const category = await CategoriesModel.findById(id);
    if (category) {
      return res.status(200).json({
        status: "success",
        message: "Get category successfully!",
        data: category,
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
    const { body } = req;
    const category = {
      name: body.name,
      slug: slug(body.name),
      description: body.description,
    };

    const newCategory = await CategoriesModel.create(category);
    return res.status(201).json({
      status: "success",
      message: "Create category successfully!",
      data: newCategory,
    });
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
    const { body } = req;
    const category = await CategoriesModel.findById(id);
    if (!category) {
      return res.status(404).json({
        status: "error",
        message: "Category not found!",
      });
    } else {
      category.name = body.name || category.name;
      category.slug = slug(body.name) || category.slug;
      category.description = body.description || category.description;
      category.is_active = body.is_active;
      const updatedCategory = await CategoriesModel.updateOne({ _id: id }, { $set: category });
      return res.status(200).json({
        status: "success",
        message: "Updated category successfully!",
        data: updatedCategory,
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
    const category = await CategoriesModel.findById(id);
    if (!category) {
      return res.status(404).json({
        status: "error",
        message: "Category not found!",
      });
    } else {
      await CategoriesModel.deleteOne({ _id: id });
      return res.status(200).json({
        status: "success",
        message: "Removed category successfully!",
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
