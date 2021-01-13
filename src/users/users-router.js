const express = require('express');
const logger = require('../logger');

const usersRouter = express.Router()

usersRouter.route('/')
  .get((req, res) => {
    logger.info('Hello, users!');
    res.send('Hello, users!');
  });

module.exports = usersRouter;