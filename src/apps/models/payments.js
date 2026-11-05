const mongoose = require("../../common/init.mongo")();
const paymentsSchema = new mongoose.Schema({
    order_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Orders",
    },
    transaction_code : {
      type: String,
      required: true,
      unique: true,
    },
    amount : {
      type: Number,
      required: true,
    },
    method : {
      type: String,
      required: true,
    },
    status : {
      type: String,
      required: true,
    },
    payment_info : {
      type: String,
      required: true,
    },
},{timestamps: true});
const PaymentsModel = mongoose.model("Payments", paymentsSchema, "payments");
module.exports = PaymentsModel;