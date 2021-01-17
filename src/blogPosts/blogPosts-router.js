const express = require('express');
const xss = require('xss');
const blogPostsService = require('./blogPosts-service');
const logger = require('../logger');
const { validateBlogPostPost } = require('../util');

const blogPostsRouter = express.Router();
const bodyParser = express.json();

function sanitizePost(blogPost) {
  const { title, content } = blogPost;
  return {
    ...blogPost,
    title: xss(title),
    content: xss(content)
  };
}

blogPostsRouter.route('/')
  .get((req, res, next) => {
    const { authorId } = req.query;

    return blogPostsService.getAllBlogPosts(req.app.get('db'), authorId)
      .then((results) => {
        return res
          .json(results.map(sanitizePost));
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    const { title, author_id, content } = req.body;
    const newBlogPost = { title, author_id, content };

    const error = validateBlogPostPost(newBlogPost);
    if (error) {
      logger.error(error);

      return res
        .status(400)
        .json({ message: error });
    }

    return blogPostsService.insertBlogPost(req.app.get('db'), newBlogPost)
      .then((result) => {
        return res
          .status(201)
          .location(`/api/blog-posts/${result.id}`)
          .json(sanitizePost(result));
      })
      .catch(next);
  });

blogPostsRouter.route('/:id')
  .get((req, res, next) => {
    const { id } = req.params;

    return blogPostsService.getBlogPostById(req.app.get('db'), id)
      .then((result) => {
        if (!result) {
          return res
            .status(404)
            .json({ message: `There is no blog post with id ${id}` });
        }

        return res.json(sanitizePost(result));
      })
      .catch(next);
  });

module.exports = blogPostsRouter;