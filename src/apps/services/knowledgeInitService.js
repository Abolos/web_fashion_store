// services/knowledgeInitService.js
const ProductModel = require("../models/products");
const ProductVariantsModel = require("../models/product_variants");
const BlogModel = require("../models/blogs");
const BrandModel = require("../models/brands");
const CategoryModel = require("../models/categories");
const FAQModel = require("../models/FAQ");
const OrderModel = require("../models/orders");
const ProductSizeModel = require("../models/product-size");
const CouponsModel = require("../models/coupons");
const KnowledgeEmbedding = require("../models/KnowledgeEmbedding");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY_GEMINI);

class KnowledgeInitService {
  constructor() {
    this.isInitialized = false;
    this.initializing = false;
    this.stats = {
      products: 0,
      productVariants: 0,
      blogs: 0,
      brands: 0,
      categories: 0,
      faqs: 0,
      orders: 0,
      productSizes: 0,
      coupons: 0,
    };
  }

  /**
   * Tạo embedding cho text sử dụng Gemini - SỬA LỖI 404
   */
  async createEmbedding(text) {
    try {
      console.log("🎯 Đang tạo embedding...");

      // Sử dụng model mới nhất cho embedding
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

      const result = await model.embedContent(text.substring(0, 1000));
      return result.embedding.values;
    } catch (error) {
      console.error("❌ Lỗi tạo embedding:", error.message);

      // Thử với model khác nếu model đầu tiên lỗi
      try {
        console.log("🔄 Thử với model embedding alternative...");
        const model = genAI.getGenerativeModel({
          model: "models/gemini-embedding-001",
        });
        const result = await model.embedContent(text.substring(0, 1000));
        return result.embedding.values;
      } catch (secondError) {
        console.error("❌ Lỗi tạo embedding (lần 2):", secondError.message);
        return null;
      }
    }
  }

  /**
   * Xử lý text để tạo embedding
   */
  processTextForEmbedding(data, type) {
    switch (type) {
      case "product":
        return `Sản phẩm: ${data.name || ""}. Giá: ${data.sale_price || 0}đ. Danh mục: ${data.category || ""}. Mô tả: ${data.description || ""}. Chất liệu: ${data.material || ""}`.toLowerCase();

      case "product_variant":
        return `Biến thể sản phẩm: ${data.product_name || ""}. Size: ${data.size || ""}. Màu: ${data.color || ""}. Mã SKU: ${data.sku || ""}. Tồn kho: ${data.stock_quantity || 0}`.toLowerCase();

      case "blog":
        return `Bài viết: ${data.title || ""}. Nội dung: ${data.content || ""}`.toLowerCase();

      case "brand":
        return `Thương hiệu: ${data.name || ""}`.toLowerCase();

      case "category":
        return `Danh mục: ${data.name || ""}. Mô tả: ${data.description || ""}`.toLowerCase();

      case "faq":
        return `Câu hỏi: ${data.question || ""}. Trả lời: ${data.answer || ""}`.toLowerCase();

      case "order":
        return `Đơn hàng: ${data.order_id || ""}. Trạng thái: ${data.status || ""}. Tổng tiền: ${data.total || 0}đ`.toLowerCase();

      case "product_size":
        let sizeDetails = "";
        if (data.size_chart && data.size_chart.length > 0) {
           sizeDetails = data.size_chart.map(s => `size ${s.size_label} (cao ${s.height_range?.min || 0}-${s.height_range?.max || 250}cm, nặng ${s.weight_range?.min || 0}-${s.weight_range?.max || 200}kg)`).join(". ");
        }
        return `Tư vấn bảng size kích thước cho ${data.product_type || ""} dành cho ${data.gender === "male" ? "nam" : data.gender === "female" ? "nữ" : "unisex"} form ${data.form_type || ""}. Bảng size cụ thể: ${sizeDetails}. Ghi chú form dáng: ${(data.advice_notes || []).join(", ")}`.toLowerCase();

      case "coupon":
        return `Mã giảm giá (coupon): ${data.name || ""}. Loại: ${data.type === "percent" ? "phần trăm (%)" : "cố định"}. Giá trị giảm: ${data.value || 0}. Đơn hàng tối thiểu: ${data.min_order_value || 0}đ. Ngày bắt đầu: ${data.start_date ? new Date(data.start_date).toLocaleDateString("vi-VN") : ""}. Ngày kết thúc: ${data.end_date ? new Date(data.end_date).toLocaleDateString("vi-VN") : ""}. Lượt dùng: ${data.usage_limit || "Không giới hạn"}`.toLowerCase();

      default:
        return "";
    }
  }

  /**
   * Kiểm tra và khởi tạo nếu cần
   */
  async ensureInitialized() {
    // Nếu đang khởi tạo thì chờ
    if (this.initializing) {
      console.log("⏳ Đang khởi tạo, vui lòng đợi...");
      return false;
    }

    // Nếu đã khởi tạo rồi thì thôi
    if (this.isInitialized) {
      console.log("✅ Knowledge Base đã sẵn sàng, không cần khởi tạo lại");
      return true;
    }

    // Kiểm tra trong database
    const count = await KnowledgeEmbedding.countDocuments();
    if (count > 0) {
      console.log(`📊 Đã có ${count} embeddings trong database`);
      this.isInitialized = true;
      this.stats.total = count;
      return true;
    }

    // Chưa có dữ liệu -> khởi tạo
    console.log("🔄 Chưa có dữ liệu, bắt đầu khởi tạo...");
    return await this.initializeKnowledgeBase();
  }

  /**
   * Trích xuất keywords từ text
   */
  extractKeywords(text) {
    const stopWords = [
      "của",
      "và",
      "có",
      "được",
      "các",
      "những",
      "một",
      "cho",
      "với",
      "trong",
      "trên",
      "dưới",
      "khi",
      "vẫn",
      "lại",
      "ra",
      "vào",
      "thì",
      "mà",
      "là",
      "bị",
      "đã",
      "sẽ",
      "đang",
    ];
    return text
      .toLowerCase()
      .split(" ")
      .filter((word) => word.length > 2 && !stopWords.includes(word))
      .slice(0, 30);
  }

  /**
   * Khởi tạo knowledge base từ tất cả các bảng - GIẢM SỐ LƯỢNG API CALL
   */
  async initializeKnowledgeBase() {
    if (this.initializing) {
      console.log("⏳ Đang trong quá trình khởi tạo, vui lòng đợi...");
      return false;
    }

    this.initializing = true;
    console.log("🚀 Bắt đầu khởi tạo Knowledge Base...");

    try {
      // Xóa dữ liệu cũ
      await KnowledgeEmbedding.deleteMany({});
      console.log("✅ Đã xóa dữ liệu cũ");

      const failedQueue = [];

      // 1. Xử lý Products
      console.log("📦 Đang xử lý Products...");
      const products = await ProductModel.find({ is_active: true }).lean();

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        console.log(
          `   Đang xử lý sản phẩm ${i + 1}/${products.length}: ${product.name}`,
        );

        const processedText = this.processTextForEmbedding(product, "product");
        
        const itemData = {
          entity_type: "product",
          entity_id: product._id,
          raw_data: {
            name: product.name,
            price: product.sale_price,
            category: product.category,
            description: product.description,
            material: product.material,
            images: product.images,
          },
          processed_text: processedText,
          keywords: this.extractKeywords(
            product.name + " " + (product.category || ""),
          ),
          category: product.category,
        };

        const embedding = await this.createEmbedding(processedText);

        if (embedding) {
          itemData.embedding = embedding;
          await KnowledgeEmbedding.create(itemData);
        } else {
          failedQueue.push(itemData);
        }

        // Delay nhẹ để tránh rate limit
        if (i % 5 === 0)
          await new Promise((resolve) => setTimeout(resolve, 100));
      }
      this.stats.products = products.length;
      console.log(`✅ Đã xử lý ${products.length} sản phẩm`);

      // 2. Xử lý Product Variants
      console.log("🎨 Đang xử lý Product Variants...");
      const variants = await ProductVariantsModel.find()
        .populate("product_id")
        .lean();

      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        console.log(`   Đang xử lý biến thể ${i + 1}/${variants.length}`);

        const productName = variant.product_id?.name || "";
        const processedText = this.processTextForEmbedding(
          {
            ...variant,
            product_name: productName,
          },
          "product_variant",
        );

        const itemData = {
          entity_type: "product_variant",
          entity_id: variant._id,
          raw_data: {
            product_name: productName,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            color_code: variant.color_code,
            stock_quantity: variant.stock_quantity,
            image_url: variant.image_url,
          },
          processed_text: processedText,
          keywords: this.extractKeywords(
            `${productName} ${variant.size} ${variant.color}`,
          ),
        };

        const embedding = await this.createEmbedding(processedText);

        if (embedding) {
          itemData.embedding = embedding;
          await KnowledgeEmbedding.create(itemData);
        } else {
          failedQueue.push(itemData);
        }

        if (i % 10 === 0)
          await new Promise((resolve) => setTimeout(resolve, 100));
      }
      this.stats.productVariants = variants.length;
      console.log(`✅ Đã xử lý ${variants.length} biến thể`);

      // 3. Xử lý Blogs
      console.log("📝 Đang xử lý Blogs...");
      const blogs = await BlogModel.find({ is_published: true }).lean();

      for (let i = 0; i < blogs.length; i++) {
        const blog = blogs[i];
        console.log(`   Đang xử lý blog ${i + 1}/${blogs.length}`);

        const processedText = this.processTextForEmbedding(blog, "blog");
        
        const itemData = {
          entity_type: "blog",
          entity_id: blog._id,
          raw_data: {
            title: blog.title,
            slug: blog.slug,
            content: blog.content?.substring(0, 500),
            thumbnail: blog.thumbnail_url,
          },
          processed_text: processedText,
          keywords: this.extractKeywords(blog.title),
        };

        const embedding = await this.createEmbedding(processedText);

        if (embedding) {
          itemData.embedding = embedding;
          await KnowledgeEmbedding.create(itemData);
        } else {
          failedQueue.push(itemData);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      this.stats.blogs = blogs.length;
      console.log(`✅ Đã xử lý ${blogs.length} bài viết`);

      // 4. Xử lý Brands
      console.log("🏢 Đang xử lý Brands...");
      const brands = await BrandModel.find({ is_active: true }).lean();

      for (let i = 0; i < brands.length; i++) {
        const brand = brands[i];
        console.log(`   Đang xử lý thương hiệu ${i + 1}/${brands.length}`);

        const processedText = this.processTextForEmbedding(brand, "brand");
        
        const itemData = {
          entity_type: "brand",
          entity_id: brand._id,
          raw_data: {
            name: brand.name,
            slug: brand.slug,
            logo: brand.logo_url,
          },
          processed_text: processedText,
          keywords: this.extractKeywords(brand.name),
        };

        const embedding = await this.createEmbedding(processedText);

        if (embedding) {
          itemData.embedding = embedding;
          await KnowledgeEmbedding.create(itemData);
        } else {
          failedQueue.push(itemData);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      this.stats.brands = brands.length;
      console.log(`✅ Đã xử lý ${brands.length} thương hiệu`);

      // 5. Xử lý Categories
      console.log("📑 Đang xử lý Categories...");
      const categories = await CategoryModel.find({ is_active: true }).lean();

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        console.log(`   Đang xử lý danh mục ${i + 1}/${categories.length}`);

        const processedText = this.processTextForEmbedding(
          category,
          "category",
        );
        
        const itemData = {
          entity_type: "category",
          entity_id: category._id,
          raw_data: {
            name: category.name,
            slug: category.slug,
            description: category.description,
          },
          processed_text: processedText,
          keywords: this.extractKeywords(category.name),
        };

        const embedding = await this.createEmbedding(processedText);

        if (embedding) {
          itemData.embedding = embedding;
          await KnowledgeEmbedding.create(itemData);
        } else {
          failedQueue.push(itemData);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      this.stats.categories = categories.length;
      console.log(`✅ Đã xử lý ${categories.length} danh mục`);

      // 6. Xử lý FAQs
      console.log("❓ Đang xử lý FAQs...");
      const faqs = await FAQModel.find({ is_active: true }).lean();

      for (let i = 0; i < faqs.length; i++) {
        const faq = faqs[i];
        console.log(`   Đang xử lý FAQ ${i + 1}/${faqs.length}`);

        const processedText = this.processTextForEmbedding(faq, "faq");
        
        const itemData = {
          entity_type: "faq",
          entity_id: faq._id,
          raw_data: {
            question: faq.question,
            answer: faq.answer,
          },
          processed_text: processedText,
          keywords: this.extractKeywords(faq.question),
        };

        const embedding = await this.createEmbedding(processedText);

        if (embedding) {
          itemData.embedding = embedding;
          await KnowledgeEmbedding.create(itemData);
        } else {
          failedQueue.push(itemData);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      this.stats.faqs = faqs.length;
      console.log(`✅ Đã xử lý ${faqs.length} FAQ`);

      // 7. Xử lý Product Sizes
      console.log("📏 Đang xử lý Product Sizes...");
      const productSizes = await ProductSizeModel.find({ is_active: true }).lean();

      for (let i = 0; i < productSizes.length; i++) {
        const sizeInfo = productSizes[i];
        console.log(`   Đang xử lý Product Size ${i + 1}/${productSizes.length}`);

        const processedText = this.processTextForEmbedding(sizeInfo, "product_size");
        
        const itemData = {
          entity_type: "product_size",
          entity_id: sizeInfo._id,
          raw_data: {
            product_type: sizeInfo.product_type,
            gender: sizeInfo.gender,
            form_type: sizeInfo.form_type,
            size_chart: sizeInfo.size_chart,
            advice_notes: sizeInfo.advice_notes
          },
          processed_text: processedText,
          keywords: this.extractKeywords(`bảng size kích thước ${sizeInfo.product_type} ${sizeInfo.gender} ${sizeInfo.form_type}`),
        };

        const embedding = await this.createEmbedding(processedText);

        if (embedding) {
          itemData.embedding = embedding;
          await KnowledgeEmbedding.create(itemData);
        } else {
          failedQueue.push(itemData);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      this.stats.productSizes = productSizes.length;
      console.log(`✅ Đã xử lý ${productSizes.length} bảng size`);

      // 8. Xử lý Coupons
      console.log("🏷️ Đang xử lý Coupons...");
      const coupons = await CouponsModel.find({ is_active: true }).lean();

      for (let i = 0; i < coupons.length; i++) {
        const coupon = coupons[i];
        console.log(`   Đang xử lý coupon ${i + 1}/${coupons.length}`);

        const processedText = this.processTextForEmbedding(coupon, "coupon");
        
        const itemData = {
          entity_type: "coupon",
          entity_id: coupon._id,
          raw_data: {
            name: coupon.name,
            type: coupon.type,
            value: coupon.value,
            min_order_value: coupon.min_order_value,
            start_date: coupon.start_date,
            end_date: coupon.end_date,
            usage_limit: coupon.usage_limit,
          },
          processed_text: processedText,
          keywords: this.extractKeywords(`mã giảm giá coupon ${coupon.name}`),
        };

        const embedding = await this.createEmbedding(processedText);

        if (embedding) {
          itemData.embedding = embedding;
          await KnowledgeEmbedding.create(itemData);
        } else {
          failedQueue.push(itemData);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      this.stats.coupons = coupons.length;
      console.log(`✅ Đã xử lý ${coupons.length} coupon`);

      // Retry failed embeddings
      if (failedQueue.length > 0) {
        console.log(`⚠️ Bắt đầu cơ chế chạy lại ${failedQueue.length} mục bị lỗi (do giới hạn API)...`);
        let retryCount = 1;

        while (failedQueue.length > 0) {
          console.log(`⏳ Đang chạy lại các mục lỗi (Lần ${retryCount})... Cần xử lý: ${failedQueue.length} mục`);
          // Thời gian nghỉ để API hồi phục (khoảng 20s)
          await new Promise(resolve => setTimeout(resolve, 20000));

          const currentQueue = [...failedQueue];
          failedQueue.length = 0; // Làm trống trước khi chạy

          for (let i = 0; i < currentQueue.length; i++) {
            const item = currentQueue[i];
            console.log(`   [Lần ${retryCount}] Đang xử lý lại mục ${i + 1}/${currentQueue.length} (${item.entity_type})`);
            
            const embedding = await this.createEmbedding(item.processed_text);
            if (embedding) {
              item.embedding = embedding;
              await KnowledgeEmbedding.create(item);
            } else {
              failedQueue.push(item);
            }
            // Delay giữa các request trong hàng đợi retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          retryCount++;
        }
        console.log(`✅ Đã phục hồi và tạo thành công toàn bộ các mục bị lỗi!`);
      }

      this.isInitialized = true;
      this.initializing = false;

      console.log("🎉 Khởi tạo Knowledge Base hoàn tất!");
      console.log("📊 Thống kê:", this.stats);

      return true;
    } catch (error) {
      console.error("❌ Lỗi khởi tạo Knowledge Base:", error);
      this.initializing = false;
      return false;
    }
  }

  /**
   * Tìm kiếm ngữ nghĩa (semantic search) - KHÔNG DÙNG API
   */
  async semanticSearch(query, limit = 30) {
    try {
      // Tạo embedding cho câu query
      const queryEmbedding = await this.createEmbedding(query);
      if (!queryEmbedding) return [];

      // Lấy tất cả embeddings từ database
      const allEmbeddings = await KnowledgeEmbedding.find().lean();

      // Tính cosine similarity
      const results = allEmbeddings.map((item) => {
        const similarity = this.cosineSimilarity(
          queryEmbedding,
          item.embedding,
        );
        return { ...item, similarity };
      });

      // Sắp xếp theo similarity
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .filter((item) => item.similarity > 0.6) // Ngưỡng similarity cao hơn
        .slice(0, limit);
    } catch (error) {
      console.error("❌ Lỗi semantic search:", error);
      return [];
    }
  }

  /**
   * Tính cosine similarity
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Tìm kiếm nhanh bằng text
   */
  async textSearch(query, limit = 30) {
    try {
      return await KnowledgeEmbedding.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } },
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error("❌ Lỗi text search:", error);
      return [];
    }
  }

  /**
   * Tìm kiếm kết hợp
   */
  async hybridSearch(query, limit = 30) {
    try {
      // Chạy cả 2 phương pháp tìm kiếm
      const [semanticResults, textResults] = await Promise.all([
        this.semanticSearch(query, limit),
        this.textSearch(query, limit)
      ]);

      // Gộp kết quả và loại bỏ trùng lặp
      const combined = [...semanticResults];
      
      for (const item of textResults) {
        // Kiểm tra xem item đã có trong combined chưa
        if (!combined.some(c => c._id.toString() === item._id.toString())) {
           // Gán score cho text search result để có thể sắp xếp
           item.similarity = item.score ? item.score / 10 : 0.5;
           combined.push(item);
        }
      }

      // Sắp xếp lại theo similarity và trả về số lượng giới hạn
      return combined.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
    } catch (error) {
      console.error("❌ Lỗi hybrid search:", error);
      return [];
    }
  }

  /**
   * Lấy thống kê
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      stats: this.stats,
    };
  }

  /**
   * Kiểm tra trạng thái
   */
  async checkStatus() {
    const count = await KnowledgeEmbedding.countDocuments();
    return {
      initialized: this.isInitialized,
      total_embeddings: count,
      stats: this.stats,
    };
  }
}

module.exports = new KnowledgeInitService();
