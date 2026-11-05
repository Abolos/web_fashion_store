const mongoose = require("mongoose");
const config = require("config");
module.exports = () => {
  if (mongoose.connection.readyState === 0) {
    mongoose
      .connect(config.get("db.mongodb.uri"))
      .then(() => console.log("Connected!"))
      .catch((err) => console.error("MongoDB connection error:", err));
  }
  return mongoose;
};
