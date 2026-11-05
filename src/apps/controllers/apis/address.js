const AddressModel = require("../../models/addresses");
const pagination = require("../../../libs/pagination");

exports.getFindAll = async (req, res) => {
  try {
    const query = {};
    const limit = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;
    if(req.query.user_id){
      query.user_id = req.query.user_id
    }
    const skip = page * limit - limit;
    const address = await AddressModel.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: "success",
      message: "Get address data successfully!",
      data: address,
      pages: await pagination(page, limit, AddressModel, query),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.getFindOne = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await AddressModel.findById(id);
    if (!address) {
      return res.status(404).json({
        status: "error",
        message: "Address not found!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Get address data successfully!",
      data: address,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { body } = req;
    const addressUser = {
      user_id: body.user_id,
      recipient_name: body.recipient_name,
      phone: body.phone,
      address_line: body.address_line,
      city: body.city,
      district: body.district,
      ward: body.ward,
    };
    const newAddress = await AddressModel.create(addressUser);
    return res.status(201).json({
      status: "success",
      message: "Address created successfully!",
      data: newAddress,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req;
    const address = await AddressModel.findById(id);
    if (!address) {
      return res.status(404).json({
        status: "error",
        message: "Address not found!",
      });
    }
    const updateAddress = {
        user_id: body.user_id || address.user_id,
        recipient_name: body.recipient_name || address.recipient_name,
        phone: body.phone || address.phone,
        address_line: body.address_line || address.address_line,
        city: body.city || address.city,
        district: body.district || address.district,
        ward: body.ward || address.ward,
    }
    await AddressModel.updateOne({_id:id}, {$set: updateAddress});
    return res.status(200).json({
      status: "success",
      message: "Địa chỉ đã được cập nhật thành công!",
      data: updateAddress,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await AddressModel.findById(id);
    if (!address) {
      return res.status(404).json({
        status: "error",
        message: "Address not found!",
      });
    }
    await AddressModel.deleteOne({ _id: id });
    return res.status(200).json({
      status: "success",
      message: "Address removed successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};
