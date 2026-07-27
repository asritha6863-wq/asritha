const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpire } = require('../config/env');

// Generates a signed JWT containing the user's id and role.
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, jwtSecret, {
    expiresIn: jwtExpire,
  });
};

module.exports = generateToken;
