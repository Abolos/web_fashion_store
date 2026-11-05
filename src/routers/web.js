const express = require("express");
const router = express.Router();
const config = require("config");
const authController = require("../apps/controllers/apis/auth.js");
const productController = require("../apps/controllers/apis/product");
const categoriesController = require("../apps/controllers/apis/category");
const brandsController = require("../apps/controllers/apis/brand");
const bannersController = require("../apps/controllers/apis/banner");
const productVatriantsController = require("../apps/controllers/apis/product_variant");
const productReviewsController = require("../apps/controllers/apis/product_review");
const addressController = require("../apps/controllers/apis/address");
const userController = require("../apps/controllers/apis/user");
const blogController = require("../apps/controllers/apis/blog");
const cartController = require("../apps/controllers/apis/cart.js");
const couponController = require("../apps/controllers/apis/coupon.js");
const chatController = require("../apps/controllers/apis/chat.js");
const conversationController = require("../apps/controllers/apis/conversation.js");
const faqController = require("../apps/controllers/apis/faq.js");
const couponProController = require("../apps/controllers/apis/coupon_pro.js");
const orderController = require("../apps/controllers/apis/order.js");
const commentController = require("../apps/controllers/apis/comment.js");
const paymentMoMoController = require("../apps/controllers/apis/payment_momo.js");
const paymentVNpayController = require("../apps/controllers/apis/payment_vnpay.js");
const historyAdminController = require("../apps/controllers/apis/login_history_admin.js");
const invoicesReportController = require("../apps/controllers/apis/invoices_report.js");
const productSizeController = require("../apps/controllers/apis/product-size.js");
const orderNotificationController = require("../apps/controllers/apis/order_notification.js");
const statisticsController = require("../apps/controllers/apis/statistics");
const favoriteController = require("../apps/controllers/apis/favorite.js");

// import multer
const UploadMiddleware = require("../apps/middlewares/upload");
const AuthMiddelWares = require("../apps/middlewares/auth.js");

// router of Auth
router.post("/customers/signUp", authController.signUp);
router.post("/customers/signIn", authController.signIn);
router.post("/customers/fogetPassword", authController.fogetPassword);
router.post("/customers/confirmOTP", authController.confirmOtp);
router.post("/customers/resetPassword", authController.resetPassword);
router.get(
  `/customer/test`,
  AuthMiddelWares.verifyAuthenticationCustomer,
  (req, res) => {
    return res.status(200).json("pass auth");
  },
);
router.post("/customers/siginGG", authController.loginGG);
router.post("/customers/siginFB", authController.loginFB);

router.get("/auth/refresh-token", authController.refreshToken);
router.post(
  `/use/logout`,
  AuthMiddelWares.verifyAuthenticationCustomer,
  authController.logout,
);

// router of address users
router.get("/customers/address", addressController.getFindAll);
router.get("/customers/address/:id", addressController.getFindOne);
router.post("/customers/address", addressController.create);
router.delete("/customers/address/:id", addressController.remove);
router.put("/customers/address/:id", addressController.update);

// router of users
router.get("/users", userController.getFindAll);
router.get(
  "/users/:id", userController.getFindOne,
);
router.post(
  "/users",
  UploadMiddleware.single("avatar_url"),
  userController.create,
);
router.delete("/users/:id", userController.remove);
router.put(
  "/users/:id",
  UploadMiddleware.single("avatar_url"),
  userController.update,
);

// router of products
router.get("/products", productController.getFindAll);
router.get("/products/:id", productController.getFindOne);
router.post(
  "/products",
  UploadMiddleware.single("image_url"),
  productController.create,
);
router.delete("/products/:id", productController.remove);
router.put(
  "/products/:id",
  UploadMiddleware.single("image_url"),
  productController.update,
);

// router of product variants
router.get("/productVariants", productVatriantsController.getFindAll);
router.get(
  "/productVariants/:id",
  productVatriantsController.getFindOneProductVariantId,
);
router.post("/productVariants/findOne", productVatriantsController.getFindOne);
router.post(
  "/productVariants/bulk",
  UploadMiddleware.single("image_url"),
  productVatriantsController.bulkCreate
);
router.post(
  "/productVariants",
  UploadMiddleware.single("image_url"),
  productVatriantsController.create,
);
router.delete("/productVariants/:id", productVatriantsController.remove);
router.put(
  "/productVariants/:id",
  UploadMiddleware.single("image_url"),
  productVatriantsController.update,
);
router.get(
  "/productVariants/sku/:product_id",
  productVatriantsController.getFindSku,
);

// router of product reviews
router.get("/productReviews", productReviewsController.getFindAll);
router.get("/productReviews/:id", productReviewsController.getFindOne);
router.post(
  "/productReviews",
  UploadMiddleware.any(),
  productReviewsController.create
);
router.delete("/productReviews/:id", productReviewsController.remove);
router.put(
  "/productReviews/:id",
  UploadMiddleware.any(),
  productReviewsController.update
);

// router of categories
router.get("/categories", categoriesController.getFindAll);
router.get("/categories/:id", categoriesController.getFindOne);
router.post("/categories", categoriesController.create);
router.delete("/categories/:id", categoriesController.remove);
router.put("/categories/:id", categoriesController.update);

// router of brands
router.get("/brands", brandsController.getFindAll);
router.get("/brands/:id", brandsController.getFindOne);
router.post(
  "/brands",
  UploadMiddleware.single("logo_url"),
  brandsController.create,
);
router.delete("/brands/:id", brandsController.remove);
router.put(
  "/brands/:id",
  UploadMiddleware.single("logo_url"),
  brandsController.update,
);

// router of banners
router.get("/banners", bannersController.getFindAll);
router.get("/banners/:id", bannersController.getFindOne);
router.post(
  "/banners",
  UploadMiddleware.single("image_url"),
  bannersController.create,
);
router.delete("/banners/:id", bannersController.remove);
router.put(
  "/banners/:id",
  UploadMiddleware.single("image_url"),
  bannersController.update,
);

// router of blogs
router.get("/blogs", blogController.getFindAll);
router.get("/blogs/:id", blogController.getFindOne);
router.post(
  "/blogs",
  UploadMiddleware.single("thumbnail_url"),
  blogController.create,
);
router.delete("/blogs/:id", blogController.remove);
router.put(
  "/blogs/:id",
  UploadMiddleware.single("thumbnail_url"),
  blogController.update,
);

// router of cars table
router.get("/carts", cartController.getFindAll);
router.get("/carts/:id", cartController.getFindOne);
router.post("/carts", cartController.create);
router.put("/carts/:id", cartController.update);
router.delete("/carts/:id", cartController.remove);
router.delete("/cart-user/:user_id", cartController.deleteCartUser);

// router of coupon table
router.get("/coupons", couponController.getFindAll);
router.get("/coupons/:id", couponController.getFindOne);
router.post("/coupons", couponController.create);
router.put("/coupons/:id", couponController.update);
router.delete("/coupons/:id", couponController.remove);

// api of chatbot
router.post("/send-message", chatController.sendMessage);
router.get("/conversation-history", chatController.getConversationHistory);
router.get("/conversations", chatController.getConversations);
router.get("/faqs", faqController.getFAQs);
router.get("/faqs/:id", faqController.getFindOne);
router.post("/faqs", faqController.createFAQ);
router.put("/faqs/:id", faqController.updateFAQ);
router.delete("/faqs/:id", faqController.deleteFAQ);
router.post("/knowledge/reload", chatController.reloadKnowledge);

// api of conversation CRUD
router.get("/conversation", conversationController.getFindAll);
router.get("/conversation/:id", conversationController.getFindOne);
router.post("/conversation", conversationController.create);
router.put("/conversation/:id", conversationController.update);
router.delete("/conversation/:id", conversationController.remove);

// api of coupon pros
router.get("/coupon-pros", couponProController.getFindAllProductId);
router.get("/coupon-pros/:id", couponProController.getFindOne);
router.post("/coupon-pros", couponProController.create);
router.put("/coupon-pros/:id", couponProController.update);
router.delete("/coupon-pros/:id", couponProController.delete);

// api of order
router.get("/orders", orderController.getfindAll);
router.get("/orders/:id", orderController.getfindOne);
router.post("/orders", orderController.create);
router.put("/orders/:id", orderController.update);
router.delete("/orders/:id", orderController.remove);

// api of comments
router.get("/comments", commentController.getFindAll);
router.get("/comments/:id", commentController.getFindOne);
router.post("/comments", commentController.create);
router.put("/comments/:id", commentController.update);
router.delete("/comments/:id", commentController.remove);

// api payment momo/vnpay
router.post("/payment-momo", paymentMoMoController.paymentMoMo);
router.get("/check-payment-momo", paymentMoMoController.checkPaymentMomo);
router.post("/create-qr-vnpay", paymentVNpayController.createQR);
router.get("/check-payment-vnpay", paymentVNpayController.checkPaymentVNpay);

// api history login admin
router.get("/history-admins", historyAdminController.getFindAll);
router.post("/history-admins", historyAdminController.create);

// api order notifications
router.get("/order-notifications/unread", orderNotificationController.getUnread);
router.get("/order-notifications", orderNotificationController.getAll);
router.put("/order-notifications/mark-all-read", orderNotificationController.markAllAsRead);
router.put("/order-notifications/:id/read", orderNotificationController.markAsRead);


// api invoices_report
router.get("/report-chart", invoicesReportController.getReportChart);
router.get("/total-revenue", invoicesReportController.getTotalRevenue);
router.get("/invoices", invoicesReportController.getInvoices);

// api statistics
router.get("/statistics/inventory", statisticsController.getInventoryStats);
router.get("/statistics/sales", statisticsController.getSalesStats);

// api of product size

router.get("/product-size", productSizeController.getFindAll);
router.get("/product-size/types", productSizeController.getProductTypes);
router.get("/product-size/filter", productSizeController.getFindByFilter);
router.get("/product-size/gender/:gender", productSizeController.getByGender);
router.get("/product-size/:id", productSizeController.getFindOne);

// POST routes
router.post("/product-size/", productSizeController.create);
router.post("/product-size/suggest", productSizeController.suggestSize);
router.post("/product-size/bulk", productSizeController.bulkCreate);

// PUT routes
router.put("/product-size/:id", productSizeController.update);
router.put("/product-size/:id/restore", productSizeController.restore);

// DELETE routes
router.delete("/product-size/:id", productSizeController.remove);
router.delete("/product-size/:id/soft", productSizeController.softDelete);

// api of favorites
router.get("/favorites", favoriteController.getFavorites);
router.post("/favorites", favoriteController.addFavorite);
router.delete("/favorites/:id", favoriteController.removeFavorite);
router.delete("/favorites-by-product", favoriteController.removeFavoriteByProduct);

module.exports = router;
