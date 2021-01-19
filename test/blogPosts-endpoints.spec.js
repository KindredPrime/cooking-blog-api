const app = require('../src/app');
const {
  makeUsersArray,
  makeMaliciousUser
} = require('./users-test-util');
const {
  makeBlogPostsArray,
  makeMaliciousBlogPost,
  gotExpectedResult
} = require('./blogPosts-test-util');
const {
  testValidationFields,
  makeFullBlogPostsArray,
  makeMaliciousFullBlogPost,
  updateIdSequence
} = require('./test-util');

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
  const { maliciousUser, sanitizedUser } = makeMaliciousUser();

  const testBlogPosts = makeBlogPostsArray();
  const testFullBlogPosts = makeFullBlogPostsArray();
  const { maliciousBlogPost, sanitizedBlogPost } = makeMaliciousBlogPost();
  const { maliciousFullBlogPost, sanitizedFullBlogPost } = makeMaliciousFullBlogPost();

  // testToken is initialized in setup.js for the user with id 1
  const authHeader = `Bearer ${testToken}`

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
    context('Given no blog posts in database', () => {
      it('Responds with 404 and an error message', () => {
        const id = 1000;
        return supertest(app)
          .get(`/api/blog-posts/${id}`)
          .expect(404, { message: `There is no blog post with id ${id}` });
      });
    });

    context(`Given the database has blog posts`, () => {
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

      it(
        `Responds with 200 and the full blog post (includes its author's username) with the id`,
        () => {
          const id = 1;
          return supertest(app)
            .get(`/api/blog-posts/${id}`)
            .expect(200, testFullBlogPosts[id-1]);
        });
    });

    context('Given XSS content in database', () => {
      beforeEach(`Populate 'users' and 'blog_posts' tables with XSS content`, () => {
        return db
          .insert(maliciousUser)
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
          .expect(200, sanitizedFullBlogPost);
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
        .set('Authorization', `Bearer ${testToken}`)
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

    it(`Responds with 401 and an error message when no user token is provided in the request`, () => {
      const newBlogPost = {
        title: 'New Title',
        author_id: testBlogPosts[0].author_id,
        content: 'New content'
      };

      return supertest(app)
        .post(`/api/blog-posts/`)
        .send(newBlogPost)
        .expect(401, { message: `The request must have an 'Authorization' header` });
    });

    it(
      `Responds with 400 and an error message when a blog post with the title already exists for the user`,
      () => {
        return db
          .insert(testBlogPosts)
          .into('blog_posts')
          .then(() => updateIdSequence(db, 'blog_posts'))
          .then(() => {
            const newBlogPost = {
              title: testBlogPosts[0].title,
              author_id: testBlogPosts[0].author_id,
              content: `New content`
            };

            return supertest(app)
              .post('/api/blog-posts')
              .set('Authorization', authHeader)
              .send(newBlogPost)
              .expect(400, { message: `User has already written a blog post with the title ${newBlogPost.title}` });
          });
      });

    context('Given XSS content', () => {
      it(
        `Responds with 201 and the new blog post, sanitized, and adds the new blog post to the database`,
        () => {
          const expectedLocation = `/api/blog-posts/${sanitizedBlogPost.id}`;
          return supertest(app)
            .post(`/api/blog-posts/`)
            .set('Authorization', `Bearer ${testToken}`)
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
      },
      testToken
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
      },
      testToken
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
      },
      testToken
    );
  });

  describe('DELETE /api/blog-posts/:id', () => {
    context('Given no blog posts in database', () => {
      it(`Responds with 404 and an error message`, () => {
        const id = 1000;
        return supertest(app)
          .delete(`/api/blog-posts/${id}`)
          .expect(404, { message: `There is no blog post with id ${id}` });
      });
    });

    context('Given the database has blog posts', () => {
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

      it(`Responds with 204 and removes the blog post from the database`, () => {
        // find a blog post written by the same user as the token in the auth header
        const blogPostId = testBlogPosts.find((post) => post.author_id === 1).id;

        return supertest(app)
          .delete(`/api/blog-posts/${blogPostId}`)
          .set('Authorization', authHeader)
          .expect(204)
          .then(() => {
            return supertest(app)
              .get('/api/blog-posts/')
              .expect(200, testBlogPosts.filter((post) => post.id !== blogPostId));
          });
      });

      it(
        `Responds with 401 and an error message when no user token is provided in the request`,
        () => {
          const id = testBlogPosts[0].id;

          return supertest(app)
            .delete(`/api/blog-posts/${id}`)
            .expect(401, { message: `The request must have an 'Authorization' header` });
        });

      it(
        `Responds with 403 and an error message when the logged-in user is not the blog post's author`,
        () => {
          // find a blog post written by a different user from the token in the auth header
          const blogPostId = testBlogPosts.find((post) => post.author_id !== 1).id;

          return supertest(app)
            .delete(`/api/blog-posts/${blogPostId}`)
            .set('Authorization', authHeader)
            .expect(
              403,
              { message: `User is unauthorized to delete the blog post with id ${blogPostId}` }
            );
        });
    });
  });
});