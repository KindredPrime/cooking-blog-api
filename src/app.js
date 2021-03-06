require('dotenv').config();
const express = require('express');
const knex = require('knex');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV, CLIENT_ORIGIN, DATABASE_URL } = require('./config');
const logger = require('./logger');
const usersRouter = require('./users/users-router');
const blogPostsRouter = require('./blogPosts/blogPosts-router');
const commentsRouter = require('./comments/comments-router');

const app = express();

const db = knex({
  client: 'pg',
  connection: DATABASE_URL
});
app.set('db', db);

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'dev';

app.use(morgan(morganOption));
app.use(helmet());
app.use(NODE_ENV === 'production'
  ? cors({
    origin: CLIENT_ORIGIN
  })
  : cors()
);

app.use('/api/users', usersRouter);
app.use('/api/blog-posts', blogPostsRouter);
app.use('/api/comments', commentsRouter);

app.use(function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === 'production') {
    response = { error: { message: 'server error' } };
  } else {
    logger.error(error);
    response = { message: error.message, stack: error.stack };
  }
  res.status(500).json(response);
});

module.exports = app;