const app = require('../src/app');
const { makeUsersArray, makeMaliciousUser } = require('./users-test-util');
const { makeBlogPostsArray, makeMaliciousBlogPost } = require('./blogPosts-test-util');
const {
  makeCommentsArray,
  makeFullCommentsArray,
  makeMaliciousComment
} = require('./comments-test-util');

describe('Comments Endpoints', () => {
  let db;
  before('Connect to database', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    });

    app.set('db', db);
  });

  const truncateString = 'TRUNCATE users, blog_posts, comments RESTART IDENTITY CASCADE'

  before('Clear the database', () => db.raw(truncateString));

  afterEach('Clear the database', () => db.raw(truncateString));

  after('Disconnect from database', () => db.destroy());

  const testUsers = makeUsersArray();
  const { maliciousUser } = makeMaliciousUser();
  const testBlogPosts = makeBlogPostsArray();
  const { maliciousBlogPost } = makeMaliciousBlogPost();
  const testComments = makeCommentsArray();
  const testFullComments = makeFullCommentsArray();
  const { maliciousComment, maliciousFullComment, sanitizedComment, sanitizedFullComment } = makeMaliciousComment();

  describe(`GET /api/comments/`, () => {
    context(`Given no comments in 'comments' table`, () => {
      it(`Responds with 200 and an empty array`, () => {
        return supertest(app)
          .get('/api/comments/')
          .expect(200, []);
      });
    });

    context(`Given comments in 'comments' table`, () => {
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
        `Responds with 200 and all full comments (includes their creator's username and blog post's title)`,
        () => {
          return supertest(app)
            .get('/api/comments/')
            .expect(200, testFullComments);
        });

      it(`Responds with 200 and all full comments that match a given blog post id`, () => {
        const blogPostId = testBlogPosts[0].id;
        return supertest(app)
          .get('/api/comments')
          .query({ blogPostId })
          .expect(200, testFullComments.filter((comment) => comment.post_id === blogPostId));
      });
    });

    context(`Given XSS comment in 'comments' table`, () => {
      beforeEach(`Populate the 'users', 'blog_posts', and 'comments' tables`, () => {
        return db
          .insert(maliciousUser)
          .into('users')
          .then(() => {
            return db
              .insert(maliciousBlogPost)
              .into('blog_posts')
              .then(() => {
                return db
                  .insert(maliciousComment)
                  .into('comments');
              });
          });
      });

      it(`Responds with 200 and all full comments, sanitized`, () => {
        return supertest(app)
          .get('/api/comments/')
          .expect(200, [sanitizedFullComment]);
      });
    });
  });
});