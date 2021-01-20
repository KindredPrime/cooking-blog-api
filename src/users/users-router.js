const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usersService = require('./users-service');
const { sanitizeUser, sanitizeFullUser } = require('../sanitize');
const { validateUserPost } = require('../util');
const logger = require('../logger');
const { SALT_ROUNDS, SECRET_KEY } = require('../config');
const requireLogin = require('../requireLogin');

const usersRouter = express.Router();
const bodyParser = express.json();

function removePassword(user) {
  delete user.user_password;

  return user;
}

usersRouter.route('/')
  .get((req, res, next) => {
    return usersService.getAllUsers(req.app.get('db'))
      .then((users) => {
        return res.json(users.map((user) => removePassword(sanitizeUser(user))));
      })
      .catch(next);
  })
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

usersRouter.route('/:id')
  .all((req, res, next) => {
    const { id } = req.params;
    return usersService.getFullUserById(req.app.get('db'), id)
      .then((result) => {
        if (!result) {
          return res
            .status(404)
            .json({ message: `There is no user with id ${id}`});
        }

        req.user = result;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    const sanitizedFullUser = sanitizeFullUser(req.user);
    return res.json(removePassword(sanitizedFullUser));
  })
  .delete(requireLogin, (req, res, next) => {
    const { id } = req.params;

    if (req.user.id !== parseInt(id)) {
      const message = `User is unauthorized to delete the user with id ${id}`;
      logger.error(message);
      return res
        .status(403)
        .json({ message });
    }

    return usersService.deleteUser(req.app.get('db'), id)
      .then(() => {
        return res
          .status(204)
          .end();
      })
      .catch(next);
  });

module.exports = usersRouter;