const express = require('express');
const xss = require('xss');
const usersService = require('./users-service');
const logger = require('../logger');

const usersRouter = express.Router()

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