const ProductModel = require("../models/products");
const ProductVariantsModel = require("../models/product_variants");
const OrderModel = require("../models/orders");
const mongoose = require("mongoose");

class StatisticsService {
  /**
   * Thống kê tồn kho của các sản phẩm
   * @param {string} search - Từ khóa tìm kiếm tên sản phẩm
   */
  async getInventoryStats(search = "") {
    try {
      const pipeline = [
        // Nhóm theo product_id để tính tổng tồn kho
        {
          $group: {
            _id: "$product_id",
            totalStock: { $sum: "$stock_quantity" },
            skus: { $push: { sku: "$sku", size: "$size", color: "$color", stock: "$stock_quantity" } }
          }
        },
        // Join với bảng Products để lấy thông tin chi tiết
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productInfo"
          }
        },
        { $unwind: "$productInfo" },
        // Lấy thông tin cần thiết
        {
          $project: {
            _id: 1,
            totalStock: 1,
            skus: 1,
            name: "$productInfo.name",
            image_url: "$productInfo.image_url",
            price: "$productInfo.price",
            sale_price: "$productInfo.sale_price"
          }
        }
      ];

      // Thêm điều kiện tìm kiếm nếu có
      if (search) {
        pipeline.push({
          $match: {
            name: { $regex: search, $options: "i" }
          }
        });
      }

      // Sắp xếp theo tên sản phẩm
      pipeline.push({ $sort: { name: 1 } });

      return await ProductVariantsModel.aggregate(pipeline);
    } catch (error) {
      console.error("Error in getInventoryStats:", error);
      throw error;
    }
  }

  /**
   * Thống kê số lượng sản phẩm đã bán
   * @param {string} search - Từ khóa tìm kiếm tên sản phẩm
   */
  async getSalesStats(search = "") {
    try {
      const pipeline = [
        // Chỉ lấy các đơn hàng đã thanh toán (consistent với revenue report)
        {
          $match: {
            payment_status: "paid"
          }
        },
        // Unwind items để tách từng mặt hàng
        { $unwind: "$items" },
        // Join với ProductVariants để lấy product_id
        {
          $lookup: {
            from: "product_variants",
            localField: "items.product_variant_id",
            foreignField: "_id",
            as: "variant"
          }
        },
        { $unwind: "$variant" },
        // Nhóm theo product_id để tính tổng số lượng bán
        {
          $group: {
            _id: "$variant.product_id",
            totalSold: { $sum: "$items.quantity" }
          }
        },
        // Join với Products để lấy thông tin chi tiết
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productInfo"
          }
        },
        { $unwind: "$productInfo" },
        // Lấy thông tin cần thiết
        {
          $project: {
            _id: 1,
            totalSold: 1,
            name: "$productInfo.name",
            image_url: "$productInfo.image_url",
            price: "$productInfo.price",
            sale_price: "$productInfo.sale_price"
          }
        }
      ];

      // Thêm điều kiện tìm kiếm nếu có
      if (search) {
        pipeline.push({
          $match: {
            name: { $regex: search, $options: "i" }
          }
        });
      }

      // Sắp xếp theo số lượng bán giảm dần
      pipeline.push({ $sort: { totalSold: -1 } });

      return await OrderModel.aggregate(pipeline);
    } catch (error) {
      console.error("Error in getSalesStats:", error);
      throw error;
    }
  }
}

module.exports = new StatisticsService();
