const commentsService = require('../src/comments/comments-service');
const { makeUsersArray } = require('./users-test-util');
const { makeBlogPostsArray } = require('./blogPosts-test-util');
const {
  makeCommentsArray,
  gotExpectedComment
} = require('./comments-test-util');
const { makeFullCommentsArray } = require('./test-util');

describe('Comments Service Object', () => {
  let db;
  before('Connect to database', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    });
  });

  const truncateString = 'TRUNCATE users, blog_posts, comments RESTART IDENTITY CASCADE'

  before('Clear the database', () => db.raw(truncateString));

  afterEach('Clear the database', () => db.raw(truncateString));

  after('Disconnect from database', () => db.destroy());

  const testUsers = makeUsersArray();
  const testBlogPosts = makeBlogPostsArray();
  const testComments = makeCommentsArray();
  const testFullComments = makeFullCommentsArray();

  context(`Given no comments in the 'comments' table`, () => {
    beforeEach(`Populate the 'users' and 'blog_posts' tables`, () => {
      return db
        .insert(testUsers)
        .into('users')
        .then(() => {
          return db
            .insert(testBlogPosts)
            .into('blog_posts');
        });
    });

    it(`getAllFullComments() returns an empty array`, () => {
      return commentsService.getAllFullComments(db)
        .then((results) => {
          expect(results).to.eql([]);
        });
    });

    it(
      `insertComment() adds the new comment to the table and returns the new comment`,
      () => {
        const creatorIndex = 0;
        const blogPostIndex = 0;
        const newComment = {
          content: 'New comment',
          creator_id: testUsers[creatorIndex].id,
          post_id: testBlogPosts[blogPostIndex].id
        };

        // last_edited is excluded because you can't know what its exact value will be
        const expectedComment = {
          id: 1,
          ...newComment
        };

        return commentsService.insertComment(db, newComment)
          .then((result) => {
            gotExpectedComment(result, expectedComment);
          })
          .then(() => commentsService.getCommentById(db, expectedComment.id))
          .then((result) => {
            gotExpectedComment(result, expectedComment);
          });
      });
  });

  context(`Given the 'comments' table has comments`, () => {
    beforeEach(`Populate the 'users', 'blog_posts', and 'comments' tables`, () => {
      return db
        .insert(testUsers)
        .into('users')
        .then(() => {
          return db
            .insert(testBlogPosts)
            .into('blog_posts')
            .then(() => {
              return db
                .insert(testComments)
                .into('comments');
            });
        });
    });

    it(
      `getAllFullComments() returns all the comments, along with their creator's username and their blog post's title`,
      () => {
        return commentsService.getAllFullComments(db)
          .then((results) => {
            expect(results).to.eql(testFullComments);
          });
      });

    it(
      `getAllFullComments(blogPostId) returns all comments with a matching post_id, along with their creator's username and their blog post's title`,
      () => {
        const blogPostId = testBlogPosts[0].id;
        return commentsService.getAllFullComments(db, blogPostId)
          .then((results) => {
            expect(results).to.eql(testFullComments.filter((comment) => comment.post_id === blogPostId));
          });
      });

    it(`getCommentById() returns the comment with the id`, () => {
      const id = testComments[0].id;
      return commentsService.getCommentById(db, id)
        .then((result) => {
          expect(result).to.eql(testComments[0]);
        });
    });

    it(
      `getFullCommentById() returns the comment with the id, along with its creator's username and its blog post's title`,
      () => {
        const id = testComments[0].id;
        return commentsService.getFullCommentById(db, id)
          .then((result) => {
            expect(result).to.eql(testFullComments[id-1]);
          });
      });

    it(`updateComment() updates the comment with the id, giving it a current last_edited timestamp, and returns the updated comment`, () => {
      const existingComment = testComments[0];

      const oldLastEdited = existingComment.last_edited;
      const id = existingComment.id;

      const updatedFields = {
        content: `${existingComment.content}1`,
        creator_id: existingComment.creator_id + 1,
        post_id: existingComment.post_id + 1
      };

      // last_edited is excluded because you can't know what its exact value will be
      const expectedComment = {
        id: 1,
        ...updatedFields
      };
      return commentsService.updateComment(db, id, updatedFields)
        .then((result) => {
          gotExpectedComment(result, expectedComment);
          expect(new Date(result.last_edited).getTime()).is.above(new Date(oldLastEdited).getTime());
        })
        .then(() => commentsService.getCommentById(db, id))
        .then((result) => {
          gotExpectedComment(result, expectedComment);
        });
    });

    it(`updateComment() doesn't update the comment's last_edited timestamp if none of the fields will be changed`, () => {
      const existingComment = testComments[0];
      const id = existingComment.id;
      const updatedFields = {
        content: existingComment.content,
        creator_id: existingComment.creator_id,
        post_id: existingComment.post_id
      };

      return commentsService.updateComment(db, id, updatedFields)
        .then((result) => {
          expect(result).to.eql(existingComment);
        })
        .then(() => commentsService.getCommentById(db, id))
        .then((result) => {
          expect(result).to.eql(existingComment);
        });
    });
  });
});