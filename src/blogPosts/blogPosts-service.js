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
    Update the blog post with the id, using the provided fields, and give it's last_edited field a
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

function convertTime(blogPost) {
  if (!blogPost || !blogPost.last_edited) {
    return blogPost;
  }

  return {
    ...blogPost,
    last_edited: blogPost.last_edited.toISOString()
  };
}

// see BookmarksService if I get stuck converting this to a function that applies the then to all blogPostsService functions
/*function addFunction(func) {
  return (...args) => func(...args).then((results) => results.map((result) => convertTime(result)));
}*/

function addTailFunction(service, tailFunc) {
  const newService = { ...service };
  for(const funcName in newService) {
    const f = newService[funcName];
    newService[funcName] = (...args) => f(...args).then((results) => {
      if (Array.isArray(results)) {
        return results.map(tailFunc);
      }

      return tailFunc(results);
    });
  }

  return newService;
}

module.exports = {
  ...addTailFunction(blogPostsService, convertTime)
};