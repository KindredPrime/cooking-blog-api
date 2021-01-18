const express = require('express');
const xss = require('xss');
const commentsService = require('./comments-service');
const { requireLogin, validateCommentPost } = require('../util');
const logger = require('../logger');

const commentsRouter = express.Router();
const bodyParser = express.json();

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
  /**
    * Gets all full comments (with their creator's username and blog post's title) from the
    * database, optionally filtered by a post_id.
  */
  .get((req, res, next) => {
    const { blogPostId } = req.query;

    return commentsService.getAllFullComments(req.app.get('db'), blogPostId)
      .then((comments) => {
        return res
          .json(comments.map(sanitizeFullComment));
      })
      .catch(next);
  })
  /**
   * Add a comment to the database.  Any value given for the last_edited field is ignored.
   */
  .post(requireLogin, bodyParser, (req, res, next) => {
    const { content, creator_id, post_id } = req.body;
    const newComment = { content, creator_id, post_id };

    const error = validateCommentPost(newComment);
    if (error) {
      logger.error(error);
      return res
        .status(400)
        .json({ message: error });
    }

    return commentsService.insertComment(req.app.get('db'), newComment)
      .then((comment) => {
        return res
          .location(`/api/comments/${comment.id}`)
          .status(201)
          .json(sanitizeComment(comment));
      })
      .catch(next);
  });

commentsRouter.route('/:id')
  .get((req, res, next) => {
    const { id } = req.params;
    return commentsService.getCommentById(req.app.get('db'), id)
      .then((comment) => {
        if (!comment) {
          return res
            .status(404)
            .json({ message: `There is no comment with id ${id}`});
        }

        return res.json(sanitizeComment(comment));
      })
      .catch(next);
  })

module.exports = commentsRouter;