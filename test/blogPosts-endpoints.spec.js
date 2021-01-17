const app = require('../src/app');
const { makeUsersArray } = require('./users-test-util');
const {
  makeBlogPostsArray,
  makeMaliciousBlogPost,
  gotExpectedResult
} = require('./blogPosts-test-util');
const { testValidationFields } = require('./test-util');

describe('Blog Posts Endpoints', () => {
  let db;
  before('Connect to database', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    });

    app.set('db', db);
  });

  const truncateString = 'TRUNCATE users, blog_posts RESTART IDENTITY CASCADE';

  before('Clear the database', () => db.raw(truncateString));

  afterEach('Clear the database', () => db.raw(truncateString));

  after('Disconnect from database', () => db.destroy());

  const testUsers = makeUsersArray();
  const testBlogPosts = makeBlogPostsArray();

  describe('GET /blog-posts', () => {
    context('Given no blog posts', () => {
      it('Responds with 200 and an empty array', () => {
        return supertest(app)
          .get(`/api/blog-posts/`)
          .expect(200, []);
      });
    });

    context(`Given blog posts in 'blog_posts' table`, () => {
      beforeEach(`Populate 'users' and 'blog_posts' tables`, () => {
        return db
          .insert(testUsers)
          .into('users')
          .then(() => {
            return db
              .insert(testBlogPosts)
              .into('blog_posts');
          });
      });

      it('Responds with 200 and all the blog posts', () => {
        return supertest(app)
          .get(`/api/blog-posts/`)
          .expect(200, testBlogPosts);
      });

      it(`Responds with 200 and only blog posts with the provided author param`, () => {
        const authorId = testBlogPosts[0].author_id;
        return supertest(app)
          .get(`/api/blog-posts/?author=${authorId}`)
          .query({ authorId })
          .expect(200, testBlogPosts.filter((post) => post.author_id === authorId));
      });
    });

    context('Given XSS content', () => {
      const { maliciousBlogPost, sanitizedBlogPost } = makeMaliciousBlogPost();
      beforeEach(`Populate 'users' table and add malicious post to 'blog_posts' table`, () => {
        return db
          .insert(testUsers)
          .into('users')
          .then(() => {
            return db
              .insert(maliciousBlogPost)
              .into('blog_posts');
          });
      });

      it(`Responds with 200 and all blog posts, sanitized`, () => {
        return supertest(app)
          .get(`/api/blog-posts/`)
          .expect(200, [sanitizedBlogPost]);
      });
    });
  });

  describe('GET /api/blog-posts/:id', () => {
    context('Given no blog posts', () => {
      it('Responds with 404 and an error message', () => {
        const id = 1000;
        return supertest(app)
          .get(`/api/blog-posts/${id}`)
          .expect(404, { message: `There is no blog post with id ${id}` });
      });
    });

    context(`Given there are blog posts in the 'blog_posts' table`, () => {
      beforeEach(`Populate 'users' and 'blog_posts' tables`, () => {
        return db
          .insert(testUsers)
          .into('users')
          .then(() => {
            return db
              .insert(testBlogPosts)
              .into('blog_posts');
          });
      });

      it('Responds with 200 and the blog post with the id', () => {
        const id = 1;
        return supertest(app)
          .get(`/api/blog-posts/${id}`)
          .expect(200, testBlogPosts[id-1]);
      });
    });

    context('Given XSS content', () => {
      const { maliciousBlogPost, sanitizedBlogPost } = makeMaliciousBlogPost();
      beforeEach(`Populate 'users' table and add malicious post to 'blog_posts' table`, () => {
        return db
          .insert(testUsers)
          .into('users')
          .then(() => {
            return db
              .insert(maliciousBlogPost)
              .into('blog_posts');
          });
      });

      it(`Responds with 200 and the blog posts with the id, sanitized`, () => {
        const id = 1;
        return supertest(app)
          .get(`/api/blog-posts/${id}`)
          .expect(200, sanitizedBlogPost);
      });
    });
  });

  describe('POST /api/blog-posts/', () => {
    beforeEach(`Populate 'users' table`, () => {
      return db
        .insert(testUsers)
        .into('users');
    });

    it(`Responds with 201 and the new blog post, and adds it to the 'blog_posts' table`, () => {
      const newBlogPost = {
        title: 'New Title',
        author_id: testBlogPosts[0].author_id,
        content: 'New content'
      };

      const expectedBlogPost = {
        id: 1,
        ...newBlogPost
      };
      const expectedLocation = `/api/blog-posts/${expectedBlogPost.id}`;
      return supertest(app)
        .post(`/api/blog-posts/`)
        .send(newBlogPost)
        .expect(201)
        .expect((result) => {
          gotExpectedResult(result, expectedBlogPost);
          expect(result.headers.location).to.eql(expectedLocation);
        })
        .then(() => {
          return supertest(app)
            .get(expectedLocation)
            .expect(200)
            .expect((result) => {
              gotExpectedResult(result, expectedBlogPost);
            });
        });
    });

    context('Given XSS content', () => {
      // Note: the last_edited in maliciousBlogPost will be ignored when POSTing it, and the response from the POST will have its last_edited set to a current timestamp
      let { maliciousBlogPost, sanitizedBlogPost } = makeMaliciousBlogPost();
      maliciousBlogPost = {
        ...maliciousBlogPost,
        last_edited: null
      };

      it(
        `Responds with 201 and the new blog post, sanitized, and adds the new blog post to the database`,
        () => {
          const expectedLocation = `/api/blog-posts/${sanitizedBlogPost.id}`;
          return supertest(app)
            .post(`/api/blog-posts/`)
            .send(maliciousBlogPost)
            .expect(201)
            .expect((result) => {
              gotExpectedResult(result, sanitizedBlogPost);
              expect(result.headers.location).to.eql(expectedLocation);
            })
            .then(() => {
              return supertest(app)
                .get(expectedLocation)
                .expect(200)
                .expect((result) => {
                  gotExpectedResult(result, sanitizedBlogPost);
                });
            });
        });
    });

    /*
    --------------------------
      Test Validation Errors
    --------------------------
    */
    // Blog post template to use for tests
    const validationBlogPost = {
      title: 'Test Title',
      author_id: testUsers[0].id,
      content: 'Test content'
    };

    // Expected validation errors for required fields
    const requiredFieldErrors = {
      title: `'title' is missing from the request body`,
      author_id: `'author_id' is missing from the request body`,
      content: `'content' is missing from the request body`
    };
    testValidationFields(
      app,
      'POST',
      (fieldName) => `Responds with 400 and an error message when ${fieldName} is missing`,
      'post',
      () => '/api/blog-posts/',
      requiredFieldErrors,
      validationBlogPost,
      (user, fieldName) => {
        delete user[fieldName];
        return user;
      }
    );

    // Expected validation errors for required fields
    const stringFieldErrors = {
      title: `'title' must be a string`,
      content: `'content' must be a string`
    };
    testValidationFields(
      app,
      'POST',
      (fieldName) => `Responds with 400 and an error message when ${fieldName} is not a string`,
      'post',
      () => '/api/blog-posts/',
      stringFieldErrors,
      validationBlogPost,
      (user, fieldName) => {
        user[fieldName] = 6;
        return user;
      }
    );

    // Expected validation errors for required fields
    const numFieldErrors = {
      author_id: `'author_id' must be a number`
    };
    testValidationFields(
      app,
      'POST',
      (fieldName) => `Responds with 400 and an error message when ${fieldName} is not a number`,
      'post',
      () => '/api/blog-posts/',
      numFieldErrors,
      validationBlogPost,
      (user, fieldName) => {
        user[fieldName] = 'text';
        return user;
      }
    );
  });
});