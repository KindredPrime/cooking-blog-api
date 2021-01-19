const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('./config');
const logger = require('./logger');
const usersService = require('./users/users-service');

/**
 * Authenticates the user
 *
 * @param {Object} req - HTTP request from a client
 * @param {Object} res - HTTP response to be sent back to the client
 * @param {Function} next - the next middleware to run
 */
const requireLogin = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    return res
      .status(401)
      .json({ message: `The request must have an 'Authorization' header` });
  }

  const isBearerType = authHeader.startsWith('Bearer ');
  if (!isBearerType) {
    return res
      .status(401)
      .json({ message: `The 'Authorization' header must be a Bearer type with the format: 'Bearer <token>'` });
  }

  const token = authHeader.split('Bearer ')[1];
  let userId;
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    userId = payload.id;
  } catch(error) {
    logger.error(error);
    return res
      .status(401)
      .json({ message: `Invalid authorization token` });
  }

  return usersService.getUserById(req.app.get('db'), userId)
    .then((user) => {
      if (!user) {
        return res
          .status(404)
          .json({ message: `The 'Authorization' token doesn't match any existing user` });
      }

      req.user = user;
      next();
    })
    .catch(next);
};

module.exports = requireLogin;