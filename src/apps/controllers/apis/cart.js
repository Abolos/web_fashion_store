const CartModel = require("../../models/carts");
const ProductVariantsModel = require("../../models/product_variants");

exports.getFindAll = async (req, res) => {
  try {
    const Query = {};
    if (req.query.user_id) {
      Query.user_id = req.query.user_id;
    }
    const carts = await CartModel.find(Query)
      .populate({
        path: "pro_variant_id",
        populate: {
          path: "product_id",
          populate: {
            path: "brand_id",
            model: "Brands", // Thay bằng tên model của brands
          },
        },
      })
      .sort({ _id: -1 });
    return res.status(200).json({
      status: "success",
      message: "Get find all carts successfully!",
      data: carts,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getFindOne = async (req, res) => {
  try {
    const { id } = req.params;
    const cart = await CartModel.findById(id);

    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Cart not found!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Get find one cart successfully!",
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { user_id, pro_variant_id, quantity } = req.body;

    if (!user_id || !pro_variant_id || !quantity) {
      return res.status(400).json({
        status: "error",
        message: "Please provide all required information!",
      });
    }

    // Thêm await và kiểm tra tồn tại
    const productVariant = await ProductVariantsModel.findById(pro_variant_id);
    if (!productVariant) {
      return res.status(404).json({
        status: "error",
        message: "Product variant not found!",
      });
    }

    // Kiểm tra số lượng tồn kho
    if (productVariant.stock_quantity < quantity) {
      return res.status(400).json({
        // 400 thay vì 401
        status: "error",
        message: "Mặt hàng hiện đã hết hàng vui lòng chọn mặt hàng khác!",
      });
    }

    const cart = {
      user_id,
      pro_variant_id,
      quantity,
    };

    const newCart = await CartModel.create(cart);

    return res.status(201).json({
      status: "success",
      message: "Created cart successfully!",
      data: newCart,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const cart = await CartModel.findById(id);
    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Cart not found!",
      });
    }
    const { user_id, pro_variant_id, quantity } = cart;
    const productVariant = await ProductVariantsModel.findById(pro_variant_id);
    if (!productVariant) {
      return res.status(404).json({
        status: "error",
        message: "Product variant not found!",
      });
    }
    await CartModel.findByIdAndDelete(id);
    return res.status(200).json({
      status: "success",
      message: "Deleted cart successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        status: "error",
        message: "Please provide quantity!",
      });
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Quantity must be a positive number!",
      });
    }

    const cart = await CartModel.findById(id);
    
    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Cart not found!",
      });
    }

    const productVariant = await ProductVariantsModel.findById(cart.pro_variant_id);
    
    if (!productVariant) {
      return res.status(404).json({
        status: "error",
        message: "Product variant not found!",
      });
    }

    if (quantity > productVariant.stock_quantity) {
      return res.status(400).json({
        status: "error",
        message: "Not enough stock available!",
      });
    }

    const updatedCart = await CartModel.findByIdAndUpdate(
      id,
      { quantity: quantity },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      status: "success",
      message: "Updated cart successfully!",
      data: updatedCart,
    });

  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.deleteCartUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "Missing user_id!",
      });
    }

    // Kiểm tra xem có giỏ hàng không
    const carts = await CartModel.find({ user_id });

    if (carts.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No carts found for this user!",
      });
    }

    // Xóa toàn bộ carts theo user_id
    await CartModel.deleteMany({ user_id });

    return res.status(200).json({
      status: "success",
      message: "All carts for this user have been deleted successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};
