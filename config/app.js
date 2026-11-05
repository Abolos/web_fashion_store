module.exports = {
  port: process.env.SERVER_PORT || 8000,
  prefixApiVersion: process.env.PREFIX_API_VERSION || "/api/v1",
  jwtAccessKey: process.env.JWT_ACCESS_KEY || "fashion-access-key",
  jwtRefreshKey: process.env.JWT_REFRESH_KEY || "fashion-refresh-key",
  tmpFolder: `${__dirname}/../src/tmp`,
  staticFolder: `${__dirname}/../src/public`,
};
