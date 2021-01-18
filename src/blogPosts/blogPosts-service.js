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
  /*
    Update the blog post with the id, using the provided fields, and give its last_edited field a
    current timestamp.  Then return the updated blog post, along with it's author's username.

    If none of the provided fields are different from the blog post to be updated, then nothing
    will be updated.  The blog post is still returned, along with it's author's username.
  */
  updateFullBlogPost(db, id, updatedFields) {
    const { title, author_id, content } = updatedFields;

    return blogPostsService.getFullBlogPostById(db, id)
      .then((result) => {
        if (
          result.title === title
          && result.author_id === author_id
          && result.content === content
        ) {
          return result;
        }

        const updatedBlogFields = {
          title,
          author_id,
          content,
          last_edited: new Date().toISOString()
        };
        return blogPostsService.getBlogPostById(db, id).update(updatedBlogFields)
          .then(() => blogPostsService.getFullBlogPostById(db, id));
      })
  },
  deleteBlogPost(db, id) {
    return blogPostsService.getBlogPostById(db, id).del();
  }
};

module.exports = {
  ...addTailFunction(blogPostsService, convertTimestamp)
};