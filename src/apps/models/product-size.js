const mongoose = require("../../common/init.mongo")();

const productSizeSchema = new mongoose.Schema({
    // Loại sản phẩm
    product_type: {
        type: String,
        required: true
    },
    
    // Giới tính
    gender: {
        type: String,
        enum: ["male", "female", "unisex"],
        required: true
    },
    
    // Form dáng
    form_type: {
        type: String,
        enum: ["regular", "slim", "oversize"],
        default: "regular"
    },
    
    // Bảng size theo chiều cao và cân nặng
    size_chart: [{
        size_label: {
            type: String,
            enum: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
            required: true
        },
        height_range: {
            min: { 
                type: Number, 
                default: null,
                min: 0,
                max: 250
            },
            max: { 
                type: Number, 
                default: null,
                min: 0,
                max: 250
            }
        },
        weight_range: {
            min: { 
                type: Number, 
                default: null,
                min: 0,
                max: 200
            },
            max: { 
                type: Number, 
                default: null,
                min: 0,
                max: 200
            }
        }
    }],
    
    // Số đo thực tế của sản phẩm
    measurements: {
        unit: {
            type: String,
            enum: ["cm", "inch"],
            default: "cm"
        },
        data: {
            XS: {
                type: Map,
                of: Number,
                default: {}
            },
            S: {
                type: Map,
                of: Number,
                default: {}
            },
            M: {
                type: Map,
                of: Number,
                default: {}
            },
            L: {
                type: Map,
                of: Number,
                default: {}
            },
            XL: {
                type: Map,
                of: Number,
                default: {}
            },
            XXL: {
                type: Map,
                of: Number,
                default: {}
            },
            XXXL: {
                type: Map,
                of: Number,
                default: {}
            }
        }
    },
    
    // Ghi chú tư vấn chọn size
    advice_notes: [{
        type: String,
        trim: true
    }],
    
    // Trạng thái active
    is_active: {
        type: Boolean,
        default: true
    }
    
}, { 
    timestamps: true,  // Tự động thêm created_at và updated_at
    collection: "product_sizes"  // Tên collection trong MongoDB
});

// Indexes để tối ưu truy vấn
productSizeSchema.index({ product_type: 1, gender: 1, form_type: 1 }, { unique: true });
productSizeSchema.index({ is_active: 1 });
productSizeSchema.index({ created_at: -1 });

// Virtual field cho created_at và updated_at (nếu muốn format date)
productSizeSchema.virtual('created_at_formatted').get(function() {
    return this.createdAt ? this.createdAt.toLocaleString('vi-VN') : null;
});

productSizeSchema.virtual('updated_at_formatted').get(function() {
    return this.updatedAt ? this.updatedAt.toLocaleString('vi-VN') : null;
});

// Static method: Lấy bảng size theo loại sản phẩm, giới tính và form
productSizeSchema.statics.findByProductAndGender = function(productType, gender, formType = 'regular') {
    return this.findOne({
        product_type: productType,
        gender: gender,
        form_type: formType,
        is_active: true
    }).lean();
};

// Static method: Lấy tất cả bảng size của một loại sản phẩm
productSizeSchema.statics.findAllByProductType = function(productType, isActive = true) {
    const query = { product_type: productType };
    if (isActive !== null) {
        query.is_active = isActive;
    }
    return this.find(query).sort({ gender: 1, form_type: 1 }).lean();
};

// Instance method: Lấy size đề xuất dựa trên chiều cao và cân nặng
productSizeSchema.methods.suggestSize = function(height, weight) {
    if (!height || !weight) return null;
    
    const matchedSize = this.size_chart.find(item => {
        const heightMatch = (!item.height_range.min || height >= item.height_range.min) && 
                           (!item.height_range.max || height <= item.height_range.max);
        const weightMatch = (!item.weight_range.min || weight >= item.weight_range.min) && 
                           (!item.weight_range.max || weight <= item.weight_range.max);
        return heightMatch && weightMatch;
    });
    
    return matchedSize ? matchedSize.size_label : null;
};

// Instance method: Lấy số đo cụ thể của một size
productSizeSchema.methods.getMeasurements = function(sizeLabel) {
    return this.measurements?.data?.[sizeLabel] || null;
};

// Instance method: Kiểm tra xem có hỗ trợ size không
productSizeSchema.methods.hasSize = function(sizeLabel) {
    return this.size_chart.some(item => item.size_label === sizeLabel);
};

const ProductSizeModel = mongoose.model("ProductSize", productSizeSchema, "product_sizes");

module.exports = ProductSizeModel;