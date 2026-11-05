const mongoose = require("../../common/init.mongo")();
const tokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    accessToken: {
        type: String,
        required: true,
    },
    refreshToken: {
        type: String,
        required: true,
    },
},{timestamps: true});
const TokenModel = mongoose.model("Tokens", tokenSchema, "tokens");
module.exports = TokenModel;