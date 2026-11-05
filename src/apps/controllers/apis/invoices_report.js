const OrdersModel = require("../../models/orders");
const UsersModel = require("../../models/users");
const pagination = require("../../../libs/pagination");
exports.getReportChart = async (req, res) => {
  try {
    const {
      year = new Date().getFullYear(),
      groupBy = "month", // month, quarter, week
      payment_method, // filter theo phương thức thanh toán
      start_date, // ngày bắt đầu tùy chỉnh
      end_date, // ngày kết thúc tùy chỉnh
    } = req.query;

    // Tạo điều kiện filter
    const matchConditions = {
      payment_status: "paid",
      //   status: { $in: ["delivered", "processing", "shipped"] },
    };

    // Xử lý filter theo thời gian
    let dateFilter = {};
    if (start_date && end_date) {
      dateFilter.createdAt = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    } else {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${parseInt(year) + 1}-01-01T00:00:00.000Z`);
      dateFilter.createdAt = { $gte: start, $lt: end };
    }

    // Filter theo phương thức thanh toán nếu có
    if (payment_method) {
      matchConditions.payment_method = payment_method;
    }

    // Merge conditions
    Object.assign(matchConditions, dateFilter);

    // Tạo pipeline aggregate dựa trên groupBy
    let groupStage;
    let labels = [];

    switch (groupBy) {
      // case "quarter":
      //   groupStage = { $quarter: "$createdAt" };
      //   labels = ["Quý 1", "Quý 2", "Quý 3", "Quý 4"];
      //   break;
      case "quarter":
        groupStage = {
          $switch: {
            branches: [
              { case: { $lte: [{ $month: "$createdAt" }, 3] }, then: 1 },
              { case: { $lte: [{ $month: "$createdAt" }, 6] }, then: 2 },
              { case: { $lte: [{ $month: "$createdAt" }, 9] }, then: 3 },
            ],
            default: 4
          }
        };
        labels = ["Quý 1", "Quý 2", "Quý 3", "Quý 4"];
        break;
      case "week":
        groupStage = { $week: "$createdAt" };
        // Tạo labels cho 52 tuần hoặc tùy thuộc vào năm
        labels = Array.from({ length: 52 }, (_, i) => `Tuần ${i + 1}`);
        break;
      default: // month
        groupStage = { $month: "$createdAt" };
        labels = [
          "Tháng 1",
          "Tháng 2",
          "Tháng 3",
          "Tháng 4",
          "Tháng 5",
          "Tháng 6",
          "Tháng 7",
          "Tháng 8",
          "Tháng 9",
          "Tháng 10",
          "Tháng 11",
          "Tháng 12",
        ];
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: groupStage,
          totalIncome: { $sum: "$grand_total" },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: "$grand_total" },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const result = await OrdersModel.aggregate(pipeline);

    // Xử lý dữ liệu để đảm bảo đủ số lượng phần tử
    const dataLength = groupBy === "quarter" ? 4 : groupBy === "week" ? 52 : 12;
    const incomeData = Array(dataLength).fill(0);
    const orderCountData = Array(dataLength).fill(0);
    const avgOrderValueData = Array(dataLength).fill(0);

    result.forEach((item) => {
      const index = item._id - 1; // Vì tháng/quý/tuần bắt đầu từ 1
      if (index >= 0 && index < dataLength) {
        incomeData[index] = item.totalIncome;
        orderCountData[index] = item.orderCount;
        avgOrderValueData[index] = item.averageOrderValue || 0;
      }
    });

    // Tính toán thống kê
    const totalIncome = incomeData.reduce((sum, val) => sum + val, 0);
    const totalOrders = orderCountData.reduce((sum, val) => sum + val, 0);
    const overallAvgOrderValue =
      totalOrders > 0 ? totalIncome / totalOrders : 0;

    return res.status(200).json({
      status: "success",
      message: "Income report retrieved successfully",
      data: {
        labels,
        datasets: [
          {
            label: "Thu nhập",
            data: incomeData,
            backgroundColor: "#4361ee",
            borderColor: "#3a0ca3",
          },
          {
            label: "Số đơn hàng",
            data: orderCountData,
            backgroundColor: "#4cc9f0",
            borderColor: "#4895ef",
            hidden: true, // Ẩn mặc định, có thể toggle
          },
        ],
        summary: {
          totalIncome,
          totalOrders,
          averageOrderValue: overallAvgOrderValue,
          period:
            start_date && end_date
              ? `${start_date} to ${end_date}`
              : `Năm ${year}`,
          groupBy,
        },
      },
    });
  } catch (error) {
    console.error("Error in getReportChart:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getTotalRevenue = async (req, res) => {
  try {
    // Aggregate để tính tổng doanh thu từ các đơn hàng đã thanh toán
    const revenueData = await OrdersModel.aggregate([
      {
        $match: {
          payment_status: "paid",
          //   status: { $in: ["delivered", "processing", "shipped"] }
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$grand_total" },
        },
      },
    ]);

    // Lấy tổng doanh thu, mặc định là 0 nếu không có dữ liệu
    const totalRevenue =
      revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    return res.status(200).json({
      status: "success",
      message: "Total revenue retrieved successfully",
      data: {
        totalRevenue: totalRevenue,
      },
    });
  } catch (error) {
    console.error("Error in getTotalRevenue:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const query = {};
    const limit = Number(req.query.limit) || 5;
    const page = Number(req.query.page) || 1;
    const skip = page * limit - limit;
    
    // 1. Xử lý User Filter & Status
    if (req.query.user_id) {
      query.user_id = req.query.user_id;
    }
    
    if (req.query.status && req.query.status !== "all") {
      if (req.query.status === "shipping") {
        query.status = { $in: ["shipped", "out_for_delivery"] };
      } else {
        query.status = req.query.status;
      }
    }
    
    if (req.query.payment_status) {
      query.payment_status = req.query.payment_status;
    }

    // 2. Xử lý Search
    if (req.query.search) {
      const searchStr = req.query.search.trim();
      const searchRegex = new RegExp(searchStr, "i");
      
      const orConditions = [
        { customer_email: searchRegex },
        { customer_phone: searchRegex },
        { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: searchStr, options: "i" } } }
      ];

      // Tìm user theo tên
      const matchedUsers = await UsersModel.find({ full_name: searchRegex }).select("_id");
      if (matchedUsers.length > 0) {
        const userIds = matchedUsers.map(u => u._id);
        orConditions.push({ user_id: { $in: userIds } });
      }

      query.$or = orConditions;
    }

    // 3. Xử lý Time Filter
    if (req.query.timeFilter && req.query.timeFilter !== "all") {
      const now = new Date();
      let startDate = new Date();
      
      switch (req.query.timeFilter) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          startDate.setDate(diff);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "month":
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "quarter":
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
      }
      query.createdAt = { $gte: startDate };
    }

    // Prepare query options
    const isExport = req.query.export === "true";
    let dbQuery = OrdersModel.find(query)
      .populate({
        path: "items.product_variant_id",
        populate: {
          path: "product_id",
          populate: {
            path: "brand_id",
            model: "Brands",
          },
        },
      })
      .populate("coupon_id")
      .populate("user_id")
      .sort({ _id: -1 });

    if (!isExport) {
      dbQuery = dbQuery.limit(limit).skip(skip);
    }

    const orders = await dbQuery;

    return res.status(200).json({
      status: "success",
      message: "Get orders successfully!",
      data: orders,
      pages: isExport ? null : await pagination(page, limit, OrdersModel, query),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};
