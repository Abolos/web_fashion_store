const FAQModel = require("../../models/FAQ");
const ProductModel = require("../../models/products");
const ProductVariantsModel = require("../../models/product_variants");
const OrderModel = require("../../models/orders");
const BlogModel = require("../../models/blogs");
const BrandModel = require("../../models/brands");
const CategoryModel = require("../../models/categories");
const ConversationModel = require("../../models/Conversation");
const KnowledgeInitService = require("../../services/knowledgeInitService");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY_GEMINI);

// ==================== BIẾN TOÀN CỤC ====================
let isKnowledgeReady = false;

// ==================== KHỞI TẠO KHI SERVER START ====================
const initializeKnowledge = async () => {
  console.log("🚀 Kiểm tra Knowledge Base...");
  try {
    // DÙNG ensureInitialized THAY VÌ initializeKnowledgeBase
    const success = await KnowledgeInitService.ensureInitialized();
    if (success) {
      isKnowledgeReady = true;
      console.log("✅ Knowledge Base đã sẵn sàng!");
    } else {
      console.log("⚠️ Knowledge Base chưa sẵn sàng");
    }
  } catch (error) {
    console.error("❌ Lỗi kiểm tra Knowledge Base:", error.message);
  }
};

initializeKnowledge();

// ==================== HÀM TIỆN ÍCH ====================
const normalizeVietnamese = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?;:'"(){}[\]\\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const tokenizeVietnamese = (text) => {
  const normalized = normalizeVietnamese(text);
  return normalized.split(" ").filter((word) => word.length > 1);
};

const calculateSimilarity = (tokens1, tokens2) => {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  let matchCount = 0;
  for (const token1 of tokens1) {
    for (const token2 of tokens2) {
      if (
        token1 === token2 ||
        token1.includes(token2) ||
        token2.includes(token1)
      ) {
        matchCount++;
        break;
      }
    }
  }

  const unionSize = new Set([...tokens1, ...tokens2]).size;
  return matchCount / unionSize;
};

// ==================== TÌM KIẾM TRONG DATABASE TRUYỀN THỐNG ====================

/**
 * Tìm kiếm sản phẩm trực tiếp trong database
 */
const searchProductsDirectly = async (question) => {
  try {
    console.log("🔍 Tìm kiếm sản phẩm trực tiếp...");

    // Tách từ khóa và loại bỏ từ nhiễu
    const stopwords = ["giá", "của", "là", "bao", "nhiêu", "tiền", "thế", "nào", "có", "không", "cho", "mình", "hỏi", "sản", "phẩm", "thì"];
    const keywords = question
      .toLowerCase()
      .split(" ")
      .filter((w) => w.length > 1 && !stopwords.includes(w));

    if (keywords.length === 0) return [];

    // Tìm kiếm sản phẩm theo TẤT CẢ các từ khóa (AND) thay vì BẤT KỲ từ khóa nào (OR)
    const andConditions = keywords.map(kw => ({
      $or: [
        { name: { $regex: kw, $options: "i" } },
        { description: { $regex: kw, $options: "i" } },
        { category: { $regex: kw, $options: "i" } },
      ]
    }));

    // Tìm kiếm sản phẩm
    const products = await ProductModel.find({
      is_active: true,
      $and: andConditions
    })
      .limit(30)
      .lean();

    if (products.length > 0) {
      console.log(`✅ Tìm thấy ${products.length} sản phẩm trực tiếp`);
      return products.map((p) => ({
        type: "product",
        name: p.name,
        price: p.sale_price,
        description: p.description,
        category: p.category,
      }));
    }

    return [];
  } catch (error) {
    console.error("Lỗi tìm kiếm trực tiếp:", error);
    return [];
  }
};

/**
 * Tìm kiếm FAQ trực tiếp
 */
exports.findInFAQ = async (question) => {
  try {
    console.log("🔍 Tìm kiếm FAQ cho:", question);

    const questionTokens = tokenizeVietnamese(question);

    if (questionTokens.length === 0) {
      console.log("⚠️ Câu hỏi không có từ khóa quan trọng");
      return null;
    }

    const allFAQs = await FAQModel.find({ is_active: true });

    if (allFAQs.length === 0) {
      console.log("📭 Không có FAQ nào trong database");
      return null;
    }

    let bestMatch = null;
    let highestScore = 0;
    const matches = [];

    for (const faq of allFAQs) {
      const faqTokens = tokenizeVietnamese(faq.question);
      const similarity = calculateSimilarity(questionTokens, faqTokens);

      matches.push({
        question: faq.question,
        similarity,
        answer: faq.answer,
      });

      if (similarity > highestScore && similarity > 0.3) {
        highestScore = similarity;
        bestMatch = faq;
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);

    if (bestMatch) {
      console.log(`✅ Tìm thấy FAQ khớp: ${bestMatch.question}`);
      console.log(`📊 Similarity score: ${(highestScore * 100).toFixed(1)}%`);

      return {
        answer: bestMatch.answer,
        is_from_faq: true,
        faq_id: bestMatch._id,
        similarity_score: highestScore,
      };
    }

    console.log("❌ Không tìm thấy FAQ phù hợp");
    return null;
  } catch (error) {
    console.error("Lỗi tìm kiếm FAQ:", error);
    return null;
  }
};

// ==================== TÌM KIẾM TRONG KNOWLEDGE BASE (RAG) ====================

/**
 * Tìm kiếm thông tin từ knowledge base
 */
const searchKnowledge = async (question) => {
  try {
    console.log("🔍 Tìm kiếm trong Knowledge Base...");

    // Kiểm tra knowledge đã sẵn sàng chưa
    const status = await KnowledgeInitService.checkStatus();
    if (status.total_embeddings === 0) {
      console.log(
        "⏳ Knowledge Base chưa có dữ liệu, chuyển sang tìm kiếm trực tiếp...",
      );

      // Fallback: tìm kiếm trực tiếp trong database
      const directProducts = await searchProductsDirectly(question);
      if (directProducts.length > 0) {
        return {
          products: directProducts,
          source: "direct_database",
        };
      }
      return null;
    }

    // Sử dụng hybrid search để tìm kết quả tốt nhất
    const results = await KnowledgeInitService.hybridSearch(question, 30);

    if (results.length > 0) {
      console.log(`✅ Tìm thấy ${results.length} kết quả liên quan`);

      // Nhóm kết quả theo loại
      const grouped = {
        products: [],
        product_variants: [],
        product_sizes: [],
        blogs: [],
        brands: [],
        categories: [],
        faqs: [],
        orders: [],
        coupons: [],
        source: "knowledge_base",
      };

      results.forEach((result) => {
        const entityType = result.entity_type;
        let key = entityType + "s";

        // Xử lý số nhiều đặc biệt
        if (entityType === "category") key = "categories";
        if (entityType === "faq") key = "faqs";
        if (entityType === "product_size") key = "product_sizes";

        if (grouped[key]) {
          grouped[key].push({
            ...result.raw_data,
            similarity: result.similarity || 0,
            entity_id: result.entity_id,
          });
        }
      });

      return grouped;
    }

    console.log("❌ Không tìm thấy kết quả phù hợp trong Knowledge Base");

    // Fallback: tìm kiếm trực tiếp
    const directProducts = await searchProductsDirectly(question);
    if (directProducts.length > 0) {
      return {
        products: directProducts,
        source: "direct_database",
      };
    }

    return null;
  } catch (error) {
    console.error("Lỗi tìm kiếm knowledge:", error);

    // Fallback khi có lỗi
    const directProducts = await searchProductsDirectly(question);
    if (directProducts.length > 0) {
      return {
        products: directProducts,
        source: "direct_database",
      };
    }
    return null;
  }
};

/**
 * Xây dựng context từ kết quả tìm kiếm
 */
const buildContextFromKnowledge = (knowledge) => {
  if (!knowledge) return "";

  let context = "📚 THÔNG TIN TỪ HỆ THỐNG (DỮ LIỆU THỰC TẾ):\n\n";

  if (knowledge.source === "direct_database") {
    context += "📦 SẢN PHẨM (tìm thấy trực tiếp):\n";
  }

  // Sản phẩm
  if (knowledge.products?.length > 0) {
    context += "📦 SẢN PHẨM:\n";
    knowledge.products.forEach((p, i) => {
      context += `${i + 1}. ${p.name || p.product_name || "Sản phẩm"}\n`;
      context += `   💰 Giá: ${p.price?.toLocaleString() || "Liên hệ"}đ\n`;
      if (p.description)
        context += `   📝 Mô tả: ${p.description.substring(0, 100)}...\n`;
      if (p.category) context += `   🏷️ Danh mục: ${p.category}\n`;
      context += "\n";
    });
  }

  // Biến thể sản phẩm
  if (knowledge.product_variants?.length > 0) {
    context += "🎨 CHI TIẾT SẢN PHẨM:\n";
    knowledge.product_variants.forEach((v, i) => {
      context += `${i + 1}. ${v.product_name || "Sản phẩm"}\n`;
      if (v.size) context += `   📏 Size: ${v.size}\n`;
      if (v.color) context += `   🎨 Màu: ${v.color}\n`;
      if (v.stock_quantity !== undefined)
        context += `   📦 Tồn kho: ${v.stock_quantity}\n`;
      context += "\n";
    });
  }

  // Product Sizes
  if (knowledge.product_sizes?.length > 0) {
    context += "📏 BẢNG SIZE SẢN PHẨM:\n";
    knowledge.product_sizes.forEach((s, i) => {
      let genderText = s.gender === 'male' ? 'Nam' : s.gender === 'female' ? 'Nữ' : 'Unisex';
      context += `${i + 1}. Bảng size ${s.product_type} - Giới tính: ${genderText} - Form: ${s.form_type}\n`;
      if (s.advice_notes && s.advice_notes.length > 0) {
        context += `   Ghi chú dáng: ${s.advice_notes.join(", ")}\n`;
      }
      if (s.size_chart) {
         s.size_chart.forEach(chart => {
            if(chart.size_label) {
               context += `   - Size ${chart.size_label}: Cao ${chart.height_range?.min || 0}-${chart.height_range?.max || 250}cm, Nặng ${chart.weight_range?.min || 0}-${chart.weight_range?.max || 200}kg\n`;
            }
         });
      }
      context += "\n";
    });
  }

  // Blog
  if (knowledge.blogs?.length > 0) {
    context += "📝 BÀI VIẾT:\n";
    knowledge.blogs.forEach((b, i) => {
      context += `${i + 1}. ${b.title}\n`;
      if (b.content) context += `   📖 ${b.content.substring(0, 150)}...\n`;
      context += "\n";
    });
  }

  // FAQ
  if (knowledge.faqs?.length > 0) {
    context += "❓ FAQ:\n";
    knowledge.faqs.forEach((f, i) => {
      context += `${i + 1}. Q: ${f.question}\n`;
      context += `   A: ${f.answer}\n\n`;
    });
  }

  // Coupons
  if (knowledge.coupons?.length > 0) {
    context += "🏷️ MÃ GIẢM GIÁ (COUPON):\n";
    knowledge.coupons.forEach((c, i) => {
      context += `${i + 1}. Mã: ${c.name}\n`;
      context += `   Giá trị giảm: ${c.type === 'percent' ? c.value + '%' : c.value.toLocaleString() + 'đ'}\n`;
      if (c.min_order_value) context += `   Đơn tối thiểu: ${c.min_order_value.toLocaleString()}đ\n`;
      if (c.end_date) context += `   Hạn sử dụng: ${new Date(c.end_date).toLocaleDateString('vi-VN')}\n`;
      context += "\n";
    });
  }

  return context;
};

// ==================== GEMINI RESPONSE (RAG) ====================

/**
 * Gọi Gemini với context từ knowledge base
 */
exports.getGeminiResponse = async (question, userId = null, recentHistory = []) => {
  try {
    console.log("🤖 Gọi Gemini với RAG (Retrieval Augmented Generation)...");

    // Tìm kiếm trong knowledge base
    const knowledge = await searchKnowledge(question);
    const context = buildContextFromKnowledge(knowledge);

    if (!context) {
      console.log("❌ Không có context từ RAG, trả về tin nhắn gợi ý thay vì gọi Gemini.");
      return {
        text: "Xin lỗi, hiện tại tôi chưa có thông tin cụ thể về vấn đề mà bạn đang quan tâm. Tuy nhiên, nếu bạn cần tư vấn trực tiếp, vui lòng gọi đến hotline 0396865585 để được hỗ trợ tốt nhất, hoặc bạn có thể tiếp tục tham khảo các sản phẩm khác trên website Mystery Fashion Store nhé!",
        has_knowledge: false,
        knowledge_source: null,
        knowledge_summary: null,
      };
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    let prompt = `Bạn là trợ lý ảo của cửa hàng thời trang online "Mystery Fashion Store" bạn sẽ đóng vai là nhân viên của của hàng và trả lời ngắng gọn đúng trọng tâm, tránh dài dòng tới khách hàng. 

THÔNG TIN CỬA HÀNG:
- Tên: Mystery Fashion Store
- Người sáng lập: Trần Thế Quân
- Chuyên bán thời trang nam, nữ, phụ kiện
- Hotline: 0396865585
- Email: mysterysupport@gmail.com

Địa chỉ: 98 Dương Quảng Hàm, Quan Hoa, Cầu Giấy, Hà Nội.
Chính sách: Miễn phí vận chuyển toàn quốc cho đơn hàng trên 300.000 VNĐ. Đổi trả trong vòng 7 ngày kể từ ngày nhận hàng.
Chú ý: (Không được trả lời ngoài phạm vi của cửa hàng tôi, ví dụ như hỏi về chính sách của cửa hàng khác, địa chỉ cửa hàng khác,.... Đặc biệt không tiết lộ số lượng tồn kho cho khách hàng, nếu khách hàng hỏi tới số lượng sản phẩm thì phải đưa kèm thông báo "Số lượng sản phẩm có hạn, quý khách vui lòng đặt hàng sớm để không bỏ lỡ sản phẩm ưng ý. Số lượng cu thể bao nhiêu trong không tôi không thể tiết lộ do đây là thông tin nội bộ của cửa hàng")
`;

    prompt += `DỮ LIỆU THỰC TẾ TỪ HỆ THỐNG:\n${context}\n\n`;

    if (recentHistory && recentHistory.length > 0) {
      prompt += `LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY NHẤT (dùng để hiểu rõ hơn về ngữ cảnh nếu khách hàng đang hỏi tiếp về chủ đề trước đó):\n`;
      recentHistory.forEach(msg => {
        prompt += `${msg.sender === 'user' ? 'Khách hàng' : 'Trợ lý'}: ${msg.text}\n`;
      });
      prompt += `\n`;
    }

    prompt += `NHIỆM VỤ: Dựa vào dữ liệu thực tế trên và lịch sử trò chuyện (nếu có), hãy tư vấn và trả lời câu hỏi mới nhất của khách hàng một cách chi tiết, chính xác và chuyên nghiệp.\n\n`;

    prompt += `CÂU HỎI MỚI NHẤT: "${question}"\n\nHÃY TRẢ LỜI (bằng tiếng Việt, thân thiện, tự nhiên):`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return {
      text: response.text(),
      has_knowledge: !!knowledge,
      knowledge_source: knowledge?.source || null,
      knowledge_summary: knowledge
        ? {
            products: knowledge.products?.length || 0,
            variants: knowledge.product_variants?.length || 0,
            blogs: knowledge.blogs?.length || 0,
            faqs: knowledge.faqs?.length || 0,
            coupons: knowledge.coupons?.length || 0,
            source: knowledge.source || "knowledge_base",
          }
        : null,
    };
  } catch (error) {
    console.error("❌ Lỗi Gemini:", error);
    return {
      text: `Xin chào! Tôi là trợ lý ảo của Mystery Fashion Store. Hiện tại tôi đang gặp sự cố kỹ thuật. Bạn vui lòng thử lại sau hoặc gọi hotline 0396865585 để được hỗ trợ trực tiếp nhé! Cảm ơn bạn đã quan tâm đến Mystery! 💝`,
      has_knowledge: false,
      error: true,
    };
  }
};

// ==================== API ENDPOINTS ====================

/**
 * Gửi tin nhắn và nhận phản hồi
 */
exports.sendMessage = async (req, res) => {
  try {
    const { message, session_id, user_id } = req.body;

    console.log("📨 Nhận tin nhắn:", {
      message: message?.substring(0, 50),
      session_id,
      user_id,
    });

    if (!message || !session_id) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu message hoặc session_id",
      });
    }

    let queryFilter;
    if (user_id) {
       queryFilter = {
           $or: [
               { user_id: user_id },
               { session_id: session_id, user_id: null }
           ]
       };
    } else {
       queryFilter = { session_id: session_id, user_id: null };
    }

    // Tìm hoặc tạo conversation
    let conversation = await ConversationModel.findOne(queryFilter).sort({ updatedAt: -1 });

    if (!conversation) {
      conversation = new ConversationModel({
        user_id: user_id || null,
        session_id,
        messages: [],
      });
    } else {
      // Cập nhật lại user_id nếu trước đó chat khi chưa đăng nhập
      if (user_id && !conversation.user_id) {
        conversation.user_id = user_id;
      }
    }

    // Thêm tin nhắn user
    conversation.messages.push({
      text: message,
      sender: "user",
      timestamp: new Date(),
    });

    // ƯU TIÊN 1: Kiểm tra FAQ trước (nhanh nhất)
    let faqResponse = await exports.findInFAQ(message);
    let botMessage;

    if (faqResponse && faqResponse.similarity_score > 0.5) {
      console.log("✅ Sử dụng câu trả lời từ FAQ");
      botMessage = {
        text: faqResponse.answer,
        sender: "bot",
        is_from_faq: true,
        method: "faq",
        timestamp: new Date(),
      };
    } else {
      // ƯU TIÊN 2: Sử dụng RAG với Gemini và Knowledge Base
      console.log("🔄 Sử dụng RAG với Gemini và Knowledge Base...");
      
      // Lấy 3 câu hỏi trước đó (bao gồm cả câu trả lời của bot, tối đa 6 tin nhắn gần nhất) không tính tin nhắn mới thêm
      const recentHistory = conversation.messages.slice(0, -1).slice(-6);
      
      const geminiResult = await exports.getGeminiResponse(message, user_id, recentHistory);

      botMessage = {
        text: geminiResult.text,
        sender: "bot",
        is_from_faq: false,
        method: "rag",
        has_knowledge: geminiResult.has_knowledge,
        knowledge_source: geminiResult.knowledge_source,
        knowledge_summary: geminiResult.knowledge_summary,
        timestamp: new Date(),
      };
    }

    conversation.messages.push(botMessage);
    conversation.updatedAt = new Date();

    await conversation.save();

    console.log("✅ Gửi phản hồi thành công");
    console.log("📝 Phương pháp:", botMessage.method);
    if (botMessage.has_knowledge) {
      console.log("📊 Knowledge source:", botMessage.knowledge_source);
      console.log("📊 Knowledge summary:", botMessage.knowledge_summary);
    }

    res.json({
      status: "success",
      data: {
        bot_message: botMessage.text,
        method: botMessage.method,
        is_from_faq: botMessage.is_from_faq,
        has_knowledge: botMessage.has_knowledge,
        knowledge_summary: botMessage.knowledge_summary,
        conversation_id: conversation._id,
      },
    });
  } catch (error) {
    console.error("❌ Lỗi send-message:", error);
    res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: error.message,
    });
  }
};

/**
 * Lấy lịch sử hội thoại
 */
exports.getConversationHistory = async (req, res) => {
  try {
    const { session_id, user_id } = req.query;

    if (!user_id && !session_id) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu session_id hoặc user_id",
      });
    }

    let query;
    if (user_id) {
       query = {
           $or: [
               { user_id: user_id },
               { session_id: session_id, user_id: null }
           ]
       };
    } else {
       query = { session_id: session_id, user_id: null };
    }
    
    const conversation = await ConversationModel.findOne(query)
      .sort({ updatedAt: -1 })
      .limit(1);

    if (conversation && user_id && !conversation.user_id) {
       conversation.user_id = user_id;
       await conversation.save();
    }

    if (!conversation) {
      return res.json({
        status: "success",
        data: { messages: [] },
      });
    }

    res.json({
      status: "success",
      data: {
        messages: conversation.messages,
        conversation_id: conversation._id,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy lịch sử:", error);
    res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách conversations
 */
exports.getConversations = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu user_id",
      });
    }

    const conversations = await ConversationModel.find({ user_id })
      .sort({ updatedAt: -1 })
      .select("_id session_id updatedAt messages")
      .limit(20);

    res.json({
      status: "success",
      data: { conversations },
    });
  } catch (error) {
    console.error("Lỗi lấy conversations:", error);
    res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: error.message,
    });
  }
};

/**
 * Lấy thống kê Knowledge Base
 */
exports.getKnowledgeStats = async (req, res) => {
  try {
    const status = await KnowledgeInitService.checkStatus();
    res.json({
      status: "success",
      data: {
        ...status,
        is_ready: isKnowledgeReady,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

/**
 * Khởi tạo lại Knowledge Base
 */
exports.reloadKnowledge = async (req, res) => {
  try {
    // Trả về ngay lập tức
    res.json({
      status: "success",
      message: "Đang bắt đầu khởi tạo lại Knowledge Base...",
    });

    // Chạy ngầm
    isKnowledgeReady = false;
    const success = await KnowledgeInitService.initializeKnowledgeBase();
    isKnowledgeReady = success;
  } catch (error) {
    // Không cần xử lý vì đã trả response
  }
};

/**
 * Tìm kiếm sản phẩm (API riêng)
 */
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu từ khóa tìm kiếm",
      });
    }

    const products = await searchProductsDirectly(q);

    res.json({
      status: "success",
      data: {
        products,
        count: products.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
