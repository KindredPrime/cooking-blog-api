const app = require('../src/app');
const { makeUsersArray, makeMaliciousUser } = require('./users-test-util');
const { makeBlogPostsArray, makeMaliciousBlogPost } = require('./blogPosts-test-util');
const {
  makeCommentsArray,
  makeMaliciousComment,
  gotExpectedComment
} = require('./comments-test-util');
const { testValidationFields, makeFullCommentsArray } = require('./test-util');

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
  const {
    maliciousComment,
    maliciousFullComment,
    sanitizedComment,
    sanitizedFullComment
  } = makeMaliciousComment();

  // testToken can be found in setup.js
  const authHeader = `Bearer ${testToken}`;

  describe(`GET /api/comments/`, () => {
    context(`Given no comments in database`, () => {
      it(`Responds with 200 and an empty array`, () => {
        return supertest(app)
          .get('/api/comments/')
          .expect(200, []);
      });
    });

    context(`Given the database has comments`, () => {
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

    context(`Given XSS comment in the database`, () => {
      beforeEach(`Populate the 'users', 'blog_posts', and 'comments' tables with XSS content`, () => {
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

  describe(`GET /api/comments/:id`, () => {
    context(`Given no comments in database`, () => {
      it(`Responds with 404 and an error message`, () => {
        const id = 1000;
        return supertest(app)
          .get(`/api/comments/${id}`)
          .expect(404, { message: `There is no comment with id ${id}` });
      });
    });

    context(`Given the database has comments`, () => {
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

      it(`Responds with 200 and the comment with the id`, () => {
        const id = testComments[0].id;
        return supertest(app)
          .get(`/api/comments/${id}`)
          .expect(200, testComments[0]);
      });
    });

    context(`Given XSS content in the database`, () => {
      beforeEach(
        `Populate the 'users', 'blog_posts', and 'comments' tables with XSS content`,
        () => {
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

      it(`Responds with 200 and the comment with id, sanitized`, () => {
        const id = maliciousComment.id;
        return supertest(app)
          .get(`/api/comments/${id}`)
          .expect(200, sanitizedComment);
      });
    });
  });

  describe(`POST /api/comments/`, () => {
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

    it(`Responds with 201 and the new comment, and adds the comment to the database`, () => {
      const newComment = {
        content: 'New content',
        creator_id: testUsers[0].id,
        post_id: testBlogPosts[0].id
      };

      // last_edited is excluded because you can't know what its exact value will be
      const expectedComment = {
        id: 1,
        ...newComment
      };
      const expectedLocation = `/api/comments/${expectedComment.id}`;
      return supertest(app)
        .post('/api/comments/')
        .set('Authorization', authHeader)
        .send(newComment)
        .expect(201)
        .expect((result) => {
          gotExpectedComment(result.body, expectedComment);
          expect(result.headers.location).to.eql(expectedLocation);
        })
        .then(() => {
          return supertest(app)
            .get(`/api/comments/${expectedComment.id}`)
            .expect(200)
            .expect((result) => {
              gotExpectedComment(result.body, expectedComment);
            });
        });
    });

    it(
      `Responds with 401 and an error message when no user token is provided in the request`,
      () => {
        const newComment = {
          content: 'New content',
          creator_id: testUsers[0].id,
          post_id: testBlogPosts[0].id
        };

        return supertest(app)
          .post('/api/comments/')
          .send(newComment)
          .expect(401, { message: `The request must have an 'Authorization' header` });
      });

    context(`Given XSS content in the request`, () => {
      it(
        `Responds with 201 and the new comment, sanitized, and adds the comment to the database`,
        () => {
          const expectedLocation = `/api/comments/${sanitizedComment.id}`;
          return supertest(app)
            .post('/api/comments/')
            .set('Authorization', authHeader)
            .send(maliciousComment)
            .expect(201)
            .expect((result) => {
              gotExpectedComment(result.body, sanitizedComment);
              expect(result.headers.location).to.eql(expectedLocation);
            })
            .then(() => {
              return supertest(app)
                .get(`/api/comments/${sanitizedComment.id}`)
                .expect(200)
                .expect((result) => {
                  gotExpectedComment(result.body, sanitizedComment);
                });
            });
        });
    });

        /*
    --------------------------
      Test Validation Errors
    --------------------------
    */
    // Comment template to use for tests
    const validationComment = {
      content: 'Test comment',
      creator_id: testUsers[0].id,
      post_id: testBlogPosts[0].id
    };

    // Expected validation errors for required fields
    const requiredFieldErrors = {
      content: `'content' is missing from the request body`,
      creator_id: `'creator_id' is missing from the request body`,
      post_id: `'post_id' is missing from the request body`
    };
    testValidationFields(
      app,
      'POST',
      (fieldName) => `Responds with 400 and an error message when ${fieldName} is missing`,
      'post',
      () => '/api/comments/',
      requiredFieldErrors,
      validationComment,
      (user, fieldName) => {
        delete user[fieldName];
        return user;
      },
      testToken
    );

    // Expected validation errors for required fields
    const stringFieldErrors = {
      content: `'content' must be a string`
    };
    testValidationFields(
      app,
      'POST',
      (fieldName) => `Responds with 400 and an error message when ${fieldName} is not a string`,
      'post',
      () => '/api/comments/',
      stringFieldErrors,
      validationComment,
      (user, fieldName) => {
        user[fieldName] = 6;
        return user;
      },
      testToken
    );

    // Expected validation errors for required fields
    const numFieldErrors = {
      creator_id: `'creator_id' must be a number`,
      post_id: `'post_id' must be a number`
    };
    testValidationFields(
      app,
      'POST',
      (fieldName) => `Responds with 400 and an error message when ${fieldName} is not a number`,
      'post',
      () => '/api/comments/',
      numFieldErrors,
      validationComment,
      (user, fieldName) => {
        user[fieldName] = 'text';
        return user;
      },
      testToken
    );
  });
});