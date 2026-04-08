const jwt = require("jsonwebtoken");

const generateTokens = (user) => {
  const payload = {
    _id: user._id,
    email: user.email,
    role: user.role,
  };

  // ACCESS TOKEN — short lived (15 minutes)
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

  // REFRESH TOKEN — long lived (7 days)
  // Uses a DIFFERENT secret so even if access secret is compromised,
  // attacker can't forge refresh tokens
  const refreshToken = jwt.sign(
    { _id: user._id }, // minimal payload for refresh
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" },
  );

  return { accessToken, refreshToken };
};

module.exports = generateTokens;
