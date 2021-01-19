const xss = require('xss');

function sanitizeUser(user) {
  return {
    ...user,
    username: xss(user.username),
    email: xss(user.email)
  }
}

function sanitizeFullUser(user) {
  return {
    ...sanitizeUser(user),
    blogPosts: user.blogPosts.map(sanitizeBlogPost),
    comments: user.comments.map(sanitizeComment)
  };
}

function sanitizeBlogPost(blogPost) {
  const { title, content } = blogPost;
  return {
    ...blogPost,
    title: xss(title),
    content: xss(content)
  };
}

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

module.exports = {
  sanitizeUser,
  sanitizeFullUser,
  sanitizeBlogPost,
  sanitizeComment,
  sanitizeFullComment
}