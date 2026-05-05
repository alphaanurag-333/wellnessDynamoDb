const jwt = require("jsonwebtoken");
const config = require("../config");

exports.signAccessToken = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

exports.verifyAccessToken = (token) => jwt.verify(token, config.jwt.secret);

exports.signRefreshToken = (payload) =>
  jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

exports.verifyRefreshToken = (token) =>
  jwt.verify(token, config.jwt.refreshSecret);
