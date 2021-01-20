const express = require('express');
const blogPostsService = require('./blogPosts-service');
const { sanitizeBlogPost, sanitizeFullBlogPost } = require('../sanitize');
const logger = require('../logger');
const requireLogin = require('../requireLogin');
const { validateBlogPostPost } = require('../util');

const blogPostsRouter = express.Router();
const bodyParser = express.json();

blogPostsRouter.route('/')
  .get((req, res, next) => {
    const { authorId } = req.query;

    return blogPostsService.getAllFullBlogPosts(req.app.get('db'), authorId)
      .then((results) => {
        return res
          .json(results.map(sanitizeFullBlogPost));
      })
      .catch(next);
  })
  .post(requireLogin, bodyParser, (req, res, next) => {
    const { title, author_id, content } = req.body;
    const newBlogPost = { title, author_id, content };

    const error = validateBlogPostPost(newBlogPost);
    if (error) {
      logger.error(error);

      return res
        .status(400)
        .json({ message: error });
    }

    let titleAlreadyExists = false;
    return blogPostsService.getAllBlogPosts(req.app.get('db'), author_id)
      .then((results) => {
        if (results.find((post) => post.title === title)) {
          titleAlreadyExists = true;
          const message = `User has already written a blog post with the title ${title}`;
          logger.error(message);

          return res
            .status(400)
            .json({ message });
        }
      })
      .then(() => {
        if (titleAlreadyExists) {
          return;
        }

        return blogPostsService.insertBlogPost(req.app.get('db'), newBlogPost);
      })
      .then((result) => {
        if (titleAlreadyExists) {
          return;
        }

        return res
          .status(201)
          .location(`/api/blog-posts/${result.id}`)
          .json(sanitizeBlogPost(result));
      })
      .catch(next);
  });

blogPostsRouter.route('/:id')
  .all((req, res, next) => {
    const { id } = req.params;

    return blogPostsService.getFullBlogPostById(req.app.get('db'), id)
      .then((result) => {
        if (!result) {
          return res
            .status(404)
            .json({ message: `There is no blog post with id ${id}` });
        }

        req.blogPost = result;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    return res.json(sanitizeFullBlogPost(req.blogPost));
  })
  .delete(requireLogin, (req, res, next) => {
    const { id } = req.params;

    if (req.user.id !== req.blogPost.author_id) {
      return res
        .status(403)
        .json({ message: `User is unauthorized to delete the blog post with id ${id}` });
    }

    return blogPostsService.deleteBlogPost(req.app.get('db'), id)
      .then(() => {
        return res
          .status(204)
          .end();
      })
      .catch(next);
  });

module.exports = blogPostsRouter;