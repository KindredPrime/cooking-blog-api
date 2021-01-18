const express = require('express');
const xss = require('xss');
const commentsService = require('./comments-service');

const commentsRouter = express.Router();

function sanitizeComment(comment) {
  return {
    ...comment,
    content: xss(comment.content)
  };
}

function sanitizeFullComment(fullComment) {
  return {
    ...sanitizeComment(fullComment),
    creator_username: xss(fullComment.creator_username),
    post_title: xss(fullComment.post_title)
  };
}

commentsRouter.route('/')
  .get((req, res, next) => {
    const { blogPostId } = req.query;

    return commentsService.getAllFullComments(req.app.get('db'), blogPostId)
      .then((comments) => {
        return res
          .json(comments.map(sanitizeFullComment));
      })
      .catch(next);
  });

module.exports = commentsRouter;