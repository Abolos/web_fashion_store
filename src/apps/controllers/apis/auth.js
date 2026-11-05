const UserModel = require("../../models/users");
const bcrypt = require("bcrypt");
const ejs = require("ejs");
const transporter = require("../../../libs/transporter");
const jwt = require("jsonwebtoken");
const config = require("config");
const { jwtDecode } = require("jwt-decode");
const { redisClient, isRedisConnected } = require("../../../common/init.redis");
const TokenModel = require("../../models/token");
const UserProviderModel = require("../../models/user_providers");
const AddressModel = require("../../models/addresses");

const generateAccessToken = async (user) => {
  return jwt.sign(
    { _id: user._id, role: user.role },
    config.get("app.jwtAccessKey"),
    {
      expiresIn: "120s",
    }
  );
};
const generateRefeshToken = async (user) => {
  return jwt.sign(
    { _id: user._id, role: user.role },
    config.get("app.jwtRefreshKey"),
    {
      expiresIn: "604800s",
    }
  );
};

const setTokenBlacklist = async (token) => {
  try {
    if (!isRedisConnected()) {
      console.warn("Redis not connected, skipping token blacklist");
      return;
    }

    const decoded = jwtDecode(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);

    if (ttl > 0) {
      await redisClient.setEx(`blacklist:${token}`, ttl, "true");
    }
  } catch (error) {
    console.error("Error setting token blacklist:", error);
  }
};

exports.signUp = async (req, res) => {
  try {
    const { email, phone, password_hash, re_password_hash, full_name } =
      req.body;

    if (!email || !phone || !password_hash || !re_password_hash || !full_name) {
      return res
        .status(400)
        .json({ status: "error", message: "Vui lòng nhập đầy đủ thông tin!" });
    }

    if (password_hash !== re_password_hash) {
      return res
        .status(400)
        .json({ status: "error", message: "Mật khẩu không khớp!" });
    }

    if (password_hash.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Mật khẩu phải có ít nhất 6 ký tự!",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ status: "error", message: "Email không đúng định dạng!" });
    }

    const phoneRegex = /(03|05|07|08|09|01[2|6|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone)) {
      return res
        .status(400)
        .json({ status: "error", message: "Số điện thoại không đúng định dạng!" });
    }

    const [isUserEmail, isUserPhone] = await Promise.all([
      UserModel.findOne({ email }),
      UserModel.findOne({ phone }),
    ]);

    if (isUserEmail) {
      return res
        .status(400)
        .json({ status: "error", message: "Email đã tồn tại!" });
    }

    if (isUserPhone) {
      return res
        .status(400)
        .json({ status: "error", message: "Số điện thoại đã tồn tại!" });
    }

    const hashedPassword = await bcrypt.hash(password_hash, 10);
    const newUser = await UserModel.create({
      email,
      phone,
      password_hash: hashedPassword,
      full_name,
    });

    return res.status(201).json({
      status: "success",
      message: "Đăng ký thành công!",
      data: newUser,
    });
  } catch (error) {
    console.error(error); // Ghi lại lỗi cho mục đích gỡ lỗi
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error!" });
  }
};

exports.signIn = async (req, res) => {
  try {
    const email = req.body.email?.trim();
    const password_hash = req.body.password_hash?.trim();
    if (!email || !password_hash) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng nhập đầy đủ thông tin!",
      });
    }
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "User not found!",
      });
    }
    if (!user.is_active) {
      return res.status(400).json({
        status: "error",
        message: "Account is locked. Please contact administrator!",
      });
    }
    const addressUser = await AddressModel.findOne({ user_id: user._id });
    if (!addressUser) {
      const address = {
        user_id: user._id,
        recipient_name: "...",
        phone: "...",
        address_line: "...",
        city: "...",
        district: "...",
        ward: "...",
      };
      await AddressModel(address).save();
    }
    const isMatch = await bcrypt.compare(password_hash, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        status: "error",
        message: "Incorrect password",
      });
    }
    const accessToken = await generateAccessToken(user);
    const refreshToken = await generateRefeshToken(user);
    const isToken = await TokenModel.findOne({ userId: user._id });
    if (isToken) {
      // move token to redis
      setTokenBlacklist(isToken.accessToken);
      setTokenBlacklist(isToken.refreshToken);
      // delete token from db
      await TokenModel.deleteOne({ userId: user._id });
    }
    await TokenModel({
      userId: user._id,
      accessToken,
      refreshToken,
    }).save();
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
    });
    const { password, ...others } = user._doc;
    return res.status(200).json({
      status: "success",
      message: "Đăng nhập thành công!",
      user: others,
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

function generateSixDigitNumber() {
  const min = 100000; // Số nhỏ nhất có 6 chữ số
  const max = 999999; // Số lớn nhất có 6 chữ số
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.fogetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields!",
      });
    }
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "User not found!",
      });
    }
    req.session.email = user.email; // Lưu email vào session

    const otp_verify = generateSixDigitNumber();
    await UserModel.updateOne({ _id: user._id }, { $set: { otp_verify } });

    // Đảm bảo session được lưu trước khi tiếp tục
    await new Promise((resolve) => req.session.save(resolve));

    // send email
    const html = await ejs.renderFile(`${__dirname}/../../views/otp.ejs`, {
      otp_verify,
    });
    await transporter.sendMail({
      from: '"Fashion" <Fashion.edu.vn@ethereal.email>',
      to: user.email,
      subject: "Password change authentication",
      html,
    });

    return res.status(200).json({
      status: "success",
      message: "OTP sent to email successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.confirmOtp = async (req, res) => {
  try {
    const { otp_verify } = req.body;
    const email = req.session.email; // Lấy email từ session

    if (!email || !otp_verify) {
      console.log("Missing fields in confirmOtp:", { email, otp_verify, sessionID: req.sessionID });
      return res.status(400).json({
        status: "error",
        message: "Missing required fields!",
      });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "User not found!",
      });
    }

    if (Number(user.otp_verify) !== Number(otp_verify)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid OTP!",
      });
    }

    // Lưu otp_verify vào session
    req.session.otp_verify = Number(otp_verify);

    return res.status(200).json({
      status: "success",
      message: "OTP verified successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};
exports.resetPassword = async (req, res) => {
  try {
    const { password_hash, re_password_hash } = req.body;
    const email = req.session.email; // Lấy email từ session
    const otp_verify = req.session.otp_verify; // Lấy otp_verify từ session
    if (!email || !otp_verify) {
      return res.status(400).json({
        status: "error",
        message: "Unauthorized!",
      });
    }
    if (!password_hash || !re_password_hash) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields!",
      });
    }
    if (password_hash !== re_password_hash) {
      return res.status(400).json({
        status: "error",
        message: "Password and re-password do not match!",
      });
    }
    if (password_hash.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters long!",
      });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "User not found!",
      });
    }
    if (Number(user.otp_verify) !== otp_verify) {
      return res.status(400).json({
        status: "error",
        message: "Invalid OTP!",
      });
    }
    user.password_hash = await bcrypt.hash(password_hash, 10);
    user.otp_verify = null;
    await UserModel.updateOne({ _id: user._id }, { $set: user });

    // Xoá session
    req.session.destroy();
    return res.status(200).json({
      status: "success",
      message: "Password reset successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json("authentication required");
    }
    const dirtyToken = await redisClient.get(refreshToken);
    if (dirtyToken) return res.status(401).json("token expired");
    jwt.verify(
      refreshToken,
      config.get("app.jwtRefreshKey"),
      async (error, decode) => {
        if (error) return res.status(401).json("authentication required");
        const newAccessToken = await generateAccessToken(decode);
        await TokenModel.updateOne(
          { refreshToken },
          { $set: { accessToken: newAccessToken } }
        );
        return res.status(200).json({
          accessToken: newAccessToken,
        });
      }
    );
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const { accessToken } = req;
    const token = await TokenModel.findOne({ accessToken });
    setTokenBlacklist(token.accessToken);
    setTokenBlacklist(token.refreshToken);
    await TokenModel.deleteOne({ accessToken });
    return res.status(200).json("Đăng xuất thành công!");
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};

exports.loginGG = async (req, res) => {
  try {
    const { tokenGoogle } = req.body;
    console.log(tokenGoogle);
    const dataUser = jwtDecode(tokenGoogle);
    console.log(dataUser);
    const userProvider = {
      provider: "google",
      provider_id: dataUser.sub,
    };
    const isUserProvider = await UserProviderModel.findOne({
      provider_id: dataUser.sub,
    });
    if (isUserProvider) {
      useGG_prev = await UserModel.findOne({ _id: isUserProvider.user_id });
    }

    const addressUser1 = await AddressModel.findOne({
      user_id: isUserProvider.user_id,
    });
    if (!addressUser1) {
      const address = {
        user_id: isUserProvider.user_id,
        recipient_name: "...",
        phone: "...",
        address_line: "...",
        city: "...",
        district: "...",
        ward: "...",
      };
      await AddressModel(address).save();
    }
    if (!isUserProvider) {
      const newUser = await UserProviderModel.create(userProvider);
      const userMain = await UserModel.findOne({ _id: newUser.user_id });
      if (!userMain) {
        const user = {
          email: dataUser.email,
          full_name: dataUser.name,
          avatar_url: dataUser.picture,
          _id: newUser.user_id,
        };
        const userGG = await UserModel.create(user);
        const addressUser3 = await AddressModel.findOne({
          user_id: userGG._id,
        });
        if (!addressUser3) {
          const address = {
            user_id: userGG._id,
            recipient_name: "...",
            phone: "...",
            address_line: "...",
            city: "...",
            district: "...",
            ward: "...",
          };
          await AddressModel(address).save();
        }
        const accessToken = await generateAccessToken(userGG);
        const refreshToken = await generateRefeshToken(userGG);
        const isToken = await TokenModel.findOne({ userId: userGG._id });
        if (isToken) {
          // move token to redis
          setTokenBlacklist(isToken.accessToken);
          setTokenBlacklist(isToken.refreshToken);
          // delete token from db
          await TokenModel.deleteOne({ userId: userGG._id });
        }
        await TokenModel({
          userId: userGG._id,
          accessToken,
          refreshToken,
        }).save();
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
        });
        return res.status(200).json({
          status: "success",
          message: "Đăng nhập thành công!",
          user: userGG,
          accessToken,
        });
      }
      const addressUser2 = await AddressModel.findOne({
        user_id: userMain._id,
      });
      if (!addressUser2) {
        const address = {
          user_id: userMain._id,
          recipient_name: "...",
          phone: "...",
          address_line: "...",
          city: "...",
          district: "...",
          ward: "...",
        };
        await AddressModel(address).save();
      }
      const accessToken = await generateAccessToken(userMain);
      const refreshToken = await generateRefeshToken(userMain);
      const isToken = await TokenModel.findOne({ userId: userMain._id });
      if (isToken) {
        // move token to redis
        setTokenBlacklist(isToken.accessToken);
        setTokenBlacklist(isToken.refreshToken);
        // delete token from db
        await TokenModel.deleteOne({ userId: userMain._id });
      }
      await TokenModel({
        userId: userMain._id,
        accessToken,
        refreshToken,
      }).save();
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
      });
      return res.status(200).json({
        status: "success",
        message: "Đăng nhập thành công!",
        user: userMain,
        accessToken,
      });
    }
    const accessToken = await generateAccessToken(useGG_prev);
    const refreshToken = await generateRefeshToken(useGG_prev);
    const isToken = await TokenModel.findOne({ userId: useGG_prev._id });
    if (isToken) {
      // move token to redis
      setTokenBlacklist(isToken.accessToken);
      setTokenBlacklist(isToken.refreshToken);
      // delete token from db
      await TokenModel.deleteOne({ userId: useGG_prev._id });
    }
    await TokenModel({
      userId: useGG_prev._id,
      accessToken,
      refreshToken,
    }).save();
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
    });
    return res.status(200).json({
      status: "success",
      message: "Đăng nhập thành công!",
      user: useGG_prev,
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
      console: console.log(error),
    });
  }
};

exports.loginFB = async (req, res) => {
  try {
    const { dataUser } = req.body;
    const userProvider = {
      provider: "facebook",
      provider_id: dataUser.userID,
    };

    const isUserProvider = await UserProviderModel.findOne({
      provider_id: dataUser.userID,
    });

    let user;
    if (isUserProvider) {
      user = await UserModel.findOne({ _id: isUserProvider.user_id });
    }

    // If user does not exist, create a new one
    if (!user) {
      const newUser = await UserProviderModel.create(userProvider);
      user = await UserModel.findOne({ _id: newUser.user_id });

      if (!user) {
        user = await UserModel.create({
          full_name: dataUser.name,
          _id: newUser.user_id,
        });
      }

      const addressUser1 = await AddressModel.findOne({
        user_id: user._id,
      });
      if (!addressUser1) {
        const address = {
          user_id: user._id,
          recipient_name: "...",
          phone: "...",
          address_line: "...",
          city: "...",
          district: "...",
          ward: "...",
        };
        await AddressModel(address).save();
      }

    }

    const addressUser = await AddressModel.findOne({
        user_id: user._id,
      });
      if (!addressUser) {
        const address = {
          user_id: user._id,
          recipient_name: "...",
          phone: "...",
          address_line: "...",
          city: "...",
          district: "...",
          ward: "...",
        };
        await AddressModel(address).save();
      }

    const accessToken = await generateAccessToken(user);
    const refreshToken = await generateRefeshToken(user);

    const existingToken = await TokenModel.findOne({ userId: user._id });
    if (existingToken) {
      setTokenBlacklist(existingToken.accessToken);
      setTokenBlacklist(existingToken.refreshToken);
      await TokenModel.deleteOne({ userId: user._id });
    }

    await TokenModel.create({
      userId: user._id,
      accessToken,
      refreshToken,
    });

    res.cookie("refreshToken", refreshToken, { httpOnly: true });
    return res.status(200).json({
      status: "success",
      message: "Đăng nhập thành công!",
      user,
      accessToken,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error!",
      error: error.message,
    });
  }
};
