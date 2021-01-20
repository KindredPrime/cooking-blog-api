const { convertTimestamp, addTailFunction } = require('../util');

const blogPostsService = {
  getAllBlogPosts(db, author_id) {
    const q = db.select('*').from('blog_posts');

    if (author_id) {
      return q.where({ author_id });
    }

    return q;
  },
  getBlogPostById(db, id) {
    return blogPostsService.getAllBlogPosts(db).where({ id }).first();
  },
  // Return the blog post along with it's author's username
  getFullBlogPostById(db, id) {
    return db
      .select(
        'blog_posts.id as id',
        'title',
        'author_id',
        'content',
        'last_edited',
        'username as author_username'
      )
      .from('blog_posts')
      .join('users', 'users.id', '=', 'author_id')
      .where({ 'blog_posts.id': id })
      .first();
  },
  insertBlogPost(db, newBlogPost) {
    return db.insert(newBlogPost).into('blog_posts').returning('*')
      .then((results) => results[0]);
  },
  deleteBlogPost(db, id) {
    return blogPostsService.getBlogPostById(db, id).del();
  }
};

module.exports = {
  ...addTailFunction(blogPostsService, convertTimestamp)
};