const StatisticsService = require("../../services/StatisticsService");

exports.getInventoryStats = async (req, res) => {
  try {
    const { search } = req.query;
    const data = await StatisticsService.getInventoryStats(search);
    
    return res.status(200).json({
      status: "success",
      message: "Get inventory statistics successfully!",
      data: data
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message
    });
  }
};

exports.getSalesStats = async (req, res) => {
  try {
    const { search } = req.query;
    const data = await StatisticsService.getSalesStats(search);
    
    return res.status(200).json({
      status: "success",
      message: "Get sales statistics successfully!",
      data: data
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message
    });
  }
};
