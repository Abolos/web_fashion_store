const ProductVariantsModel = require("../models/product_variants");

exports.deductStock = async (items) => {
    let deductedItems = [];
    try {
        for (let item of items) {
            const updatedVariant = await ProductVariantsModel.findOneAndUpdate(
                { _id: item.product_variant_id, stock_quantity: { $gte: item.quantity } },
                { $inc: { stock_quantity: -item.quantity } },
                { new: true }
            );
            
            if (!updatedVariant) {
                const err = new Error(`Sản phẩm trong đơn hàng đã hết hoặc không đủ số lượng. Vui lòng kiểm tra lại!`);
                err.isStockError = true;
                err.failedItem = item.product_variant_id;
                throw err;
            }
            deductedItems.push(item);
        }
        return true;
    } catch (error) {
        // Rollback
        for (let dItem of deductedItems) {
            await ProductVariantsModel.updateOne(
                { _id: dItem.product_variant_id },
                { $inc: { stock_quantity: dItem.quantity } }
            );
        }
        throw error;
    }
};

exports.restoreStock = async (items) => {
    for (let item of items) {
        await ProductVariantsModel.updateOne(
            { _id: item.product_variant_id },
            { $inc: { stock_quantity: item.quantity } }
        );
    }
};
