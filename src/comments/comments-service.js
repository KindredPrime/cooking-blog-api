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
  getAllFullComments(db, blogPostId, creatorId) {
    let query = commentsService._joinTables(db);
    const whereConditions = {};

    if (blogPostId) {
      whereConditions['post_id'] = blogPostId;
    }

    if (creatorId) {
      whereConditions['creator_id'] = creatorId;
    }

    return query.where(whereConditions);
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
  deleteComment(db, id) {
    return commentsService.getCommentById(db, id).del();
  }
};

module.exports = {
  ...addTailFunction(commentsService, convertTimestamp, ['_joinTables'])
};