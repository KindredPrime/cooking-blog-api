const express = require('express');
const xss = require('xss');
const bcrypt = require('bcrypt');
const usersService = require('./users-service');
const { validateUserPost } = require('../util');
const logger = require('../logger');
const { SALT_ROUNDS } = require('../config');

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

    /*
    return usersService.insertUser(req.app.get('db'), newUser)
      .then((result) => {
        const sanitizedUser = sanitizeUser(result);
        return res
          .status(201)
          .json(removePassword(sanitizedUser));
      })
      .catch(next);
    */
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

module.exports = usersRouter;