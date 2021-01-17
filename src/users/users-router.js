const express = require('express');
const xss = require('xss');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usersService = require('./users-service');
const { validateUserPost } = require('../util');
const logger = require('../logger');
const { SALT_ROUNDS, SECRET_KEY } = require('../config');

const usersRouter = express.Router();
const bodyParser = express.json();

function removePassword(user) {
  const { id, username, email } = user;
  return {
    id,
    username,
    email
  };
}

function sanitizeUser(user) {
  return {
    ...user,
    username: xss(user.username),
    email: xss(user.email)
  }
}

usersRouter.route('/')
  .post(bodyParser, async (req, res, next) => {
    const { username, user_password, email } = req.body;
    const newUser = { username, user_password, email };

    const error = await validateUserPost(newUser);
    if (error) {
      logger.error(error);
      return res
        .status(400)
        .json({ message: error });
    }

    // Hash the password
    return bcrypt.hash(user_password, SALT_ROUNDS)
      .then((hash) => {
        return {
          ...newUser,
          user_password: hash
        };
      })
      .then((userWithHash) => usersService.insertUser(req.app.get('db'), userWithHash))
      .then((result) => {
        const sanitizedUser = sanitizeUser(result);
        return res
          .status(201)
          .json(removePassword(sanitizedUser));
      })
      .catch(next);
  });

usersRouter.route('/:id')
  .get((req, res, next) => {
    const { id } = req.params;
    return usersService.getUserById(req.app.get('db'), id)
      .then((result) => {
        if (!result) {
          return res
            .status(404)
            .json({ message: `There is no user with id ${id}`});
        }

        const sanitizedUser = sanitizeUser(result);
        return res.json(removePassword(sanitizedUser));
      })
      .catch(next);
  });

usersRouter.route('/login')
  .post(bodyParser, (req, res, next) => {
    const { username, user_password } = req.body;

    const invalidMessage = `The provided username and password combination is invalid`;
    let id;
    let anErrorOccurred = false;
    return usersService.getUserByUsername(req.app.get('db'), username)
      .then((user) => {
        // Handle wrong username
        if (!user) {
          anErrorOccurred = true;
          return res
            .status(404)
            .json({ message: invalidMessage});
        }

        id = user.id;
        return bcrypt.compare(user_password, user.user_password);
      })
      .then((result) => {
        if (anErrorOccurred) {
          return;
        }

        // Handle wrong password
        if (!result) {
          return res
            .status(401)
            .json({ message: invalidMessage });
        }

        const token = jwt.sign({ id }, SECRET_KEY);
        return res
          .status(201)
          .json({
            token,
            id
          });
      })
      .catch(next);
  });

module.exports = usersRouter;