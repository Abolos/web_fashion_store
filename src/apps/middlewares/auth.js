const jwt = require("jsonwebtoken");
const config = require("config");
const { redisClient } = require("../../common/init.redis");

exports.verifyAuthenticationCustomer = async (req, res, next) => {
  try {
    const { authorization } = req.headers;

    if (!authorization) {
      return res.status(401).json("authorization required");
    }

    const accessToken = authorization.split(" ")[1];

    // Kiểm tra token trong blacklist (redis)
    const dirtyToken = await redisClient.get(accessToken);
    if (dirtyToken) {
      return res.status(401).json("token expired");
    }

    // Xác thực JWT
    jwt.verify(
      accessToken,
      config.get("app.jwtAccessKey"),
      (error, decoded) => {
        if (error) {
          if (error.name === "TokenExpiredError") {
            return res.status(401).json("token expired");
          }
          return res.status(401).json("authorization required");
        }

        req.accessToken = accessToken;
        next();
      },
    );
  } catch (error) {
    return res.status(500).json(error.message);
  }
};
