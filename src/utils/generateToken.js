const jwt = require("jsonwebtoken");

const generateTokens = (user) => {
  const payload = {
    _id: user._id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

  const refreshToken = jwt.sign(
    { _id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" },
  );

  return { accessToken, refreshToken };
};

module.exports = generateTokens;
