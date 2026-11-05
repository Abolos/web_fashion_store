const express = require("express");
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const session = require("express-session");
const { connectionRedis } = require("../common/init.redis");
connectionRedis();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const config = require("config");
// app.use(
//   cors({
//     origin: "http://localhost:5173", // URL frontend của bạn
//     credentials: true, // QUAN TRỌNG: Cho phép gửi cookie
//   })
// );

// MỚI (cho phép cả localhost và Vercel)
const allowedOrigins = [
  "http://localhost:5173",
  "https://mystery-fashion-store-vn.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Cho phép request không có origin (như từ Postman, mobile app)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.set("trust proxy", 1); // Trust proxy for secure cookies over proxy (e.g. Cloud Run)
app.use(
  session({
    secret: "fashtion123",
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: process.env.NODE_ENV === "production", 
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    },
  })
);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  config.get("app.prefixApiVersion"),
  require(`${__dirname}/../routers/web`)
);
app.use("/static", express.static(config.get("app.staticFolder")));
module.exports = app;
