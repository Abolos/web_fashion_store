const multer = require("multer");
const config = require("config");

const upload = multer({
    dest: config.get("app.tmpFolder"),
    
});
module.exports = upload;
