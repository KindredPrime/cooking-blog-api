const { convertTimestamp, addTailFunction } = require('../util');

const commentsService = {
  _joinTables(db) {
    return db
      .select(
        'comments.id as id',
        'comments.content as content',
        'creator_id',
        'username as creator_username',
        'post_id',
        'blog_posts.title as post_title',
        'comments.last_edited'
      )
      .from('comments')
      .leftJoin('users', 'comments.creator_id', 'users.id')
      .join('blog_posts', 'comments.post_id', 'blog_posts.id');
  },
  getAllFullComments(db, blogPostId) {
    const query = commentsService._joinTables(db);

    if (blogPostId) {
      return query
        .where('post_id', blogPostId);
    }

    return query;
  },
  getCommentById(db, id) {
    return db.select('*').from('comments').where({ id }).first();
  },
  getFullCommentById(db, id) {
    return commentsService._joinTables(db).where('comments.id', id).first();
  },
  insertComment(db, newComment) {
    const { content, creator_id, post_id } = newComment;
    const dbComment = { content, creator_id, post_id };
    return db.insert(dbComment).into('comments').returning('*')
      .then((results) => results[0]);
  },
  /*
    Update the comment with the id, using the provided fields, and give its last_edited field a
    current timestamp.  Then return the updated comment.

    If none of the provided fields are different from the comment to be updated, then nothing
    will be updated.  The comment is still returned.
  */
  updateComment(db, id, updatedFields) {
    const { content, creator_id, post_id } = updatedFields;

    return commentsService.getCommentById(db, id)
      .then((result) => {
        if (
          result.content === content
          && result.creator_id === creator_id
          && result.post_id === post_id
        ) {
          return result;
        }

        const updatedCommentFields = {
          content,
          creator_id,
          post_id,
          last_edited: new Date().toISOString()
        };

        return commentsService.getCommentById(db, id).update(updatedCommentFields).returning('*')
          .then((results) => results[0]);
      });
  },
  deleteComment(db, id) {
    return commentsService.getCommentById(db, id).del();
  }
};

module.exports = {
  ...addTailFunction(commentsService, convertTimestamp, ['_joinTables'])
};