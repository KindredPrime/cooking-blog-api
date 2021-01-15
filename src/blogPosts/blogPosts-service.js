const blogPostsService = {
  getAllBlogPosts(db) {
    return db.select('*').from('blog_posts');
  },
  getBlogPostsByAuthor(db, author_id) {
    return this.getAllBlogPosts(db).where({ author_id });
  },
  getBlogPostById(db, id) {
    return this.getAllBlogPosts(db).where({ id }).first();
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
  createBlogPost(db, newBlogPost) {
    return db.insert(newBlogPost).into('blog_posts').returning('*')
      .then((results) => results[0]);
  },
  /*
    Update the blog post with the id, using the provided fields, and give it's last_edited field a
    current timestamp.  Then return the updated blog post, along with it's author's username.

    If none of the provided fields are different from the blog post to be updated, then nothing
    will be updated.  The blog post is still returned, along with it's author's username.
  */
  updateFullBlogPost(db, id, updatedFields) {
    const { title, author_id, content } = updatedFields;

    return this.getFullBlogPostById(db, id)
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
          last_edited: new Date()
        };
        return this.getBlogPostById(db, id).update(updatedBlogFields)
          .then(() => this.getFullBlogPostById(db, id));
      })
  },
  deleteBlogPost(db, id) {
    return this.getBlogPostById(db, id).delete();
  }
};

module.exports = blogPostsService;