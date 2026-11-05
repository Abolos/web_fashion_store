const mongoose = require("../../common/init.mongo")();

const KnowledgeEmbeddingSchema = new mongoose.Schema({
  // Thông tin chung
  entity_type: { 
    type: String, 
    required: true,
    enum: ['product', 'product_variant', 'blog', 'brand', 'category', 'faq', 'order', 'product_size', 'coupon']
  },
  entity_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: 'entity_type'
  },
  
  // Dữ liệu gốc (lưu lại để dùng khi cần)
  raw_data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Text đã được xử lý để tạo embedding
  processed_text: {
    type: String,
    required: true
  },
  
  // Vector embedding (lưu dưới dạng mảng số)
  embedding: {
    type: [Number],
    required: true
  },
  
  // Metadata để search
  keywords: [String],
  category: String,
  price_range: {
    min: Number,
    max: Number
  },
  tags: [String],
  
  // Thống kê sử dụng
  view_count: { type: Number, default: 0 },
  last_accessed: Date,
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Index cho text search
KnowledgeEmbeddingSchema.index({ processed_text: 'text', keywords: 'text' });
// Index cho vector search (nếu dùng MongoDB Atlas)
// KnowledgeEmbeddingSchema.index({ embedding: "vector" });

const KnowledgeEmbedding = mongoose.model('KnowledgeEmbedding', KnowledgeEmbeddingSchema);
module.exports = KnowledgeEmbedding;