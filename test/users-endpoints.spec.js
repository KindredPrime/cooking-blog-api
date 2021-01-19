const app = require('../src/app');
const {
  makeUsersArray,
  makeUsersResponseArray,
  makeMaliciousUser,
  userWasAddedToDatabase
} = require('./users-test-util');
const { makeBlogPostsArray, makeMaliciousBlogPost } = require('./blogPosts-test-util');
const { makeCommentsArray, makeMaliciousComment } = require('./comments-test-util');
const { testValidationFields, makeFullUsersArray, makeMaliciousFullUser } = require('./test-util');

describe('Users Endpoints', () => {
  let db;
  before('Connect to database', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    });

    app.set('db', db);
  });

  const truncateTable = 'TRUNCATE users RESTART IDENTITY CASCADE'
  before('Clear the database', () => db.raw(truncateTable));
  afterEach('Clear the database', () => db.raw(truncateTable));

  after('Disconnect from database', () => db.destroy());

  const testUsers = makeUsersArray();
  const responseUsers = makeUsersResponseArray(testUsers);
  const testFullUsers = makeFullUsersArray();
  const responseFullUsers = makeUsersResponseArray(testFullUsers);
  const { maliciousUser, sanitizedUser } = makeMaliciousUser();
  const { maliciousFullUser, sanitizedFullUser } = makeMaliciousFullUser();

  const testBlogPosts = makeBlogPostsArray();
  const { maliciousBlogPost, sanitizedBlogPost } = makeMaliciousBlogPost();

  const testComments = makeCommentsArray();
  const { maliciousComment, sanitizedComment } = makeMaliciousComment();

  describe('GET /api/users/:id', () => {
    context('Given no users', () => {
      it('Responds with 404 and an error with a message', () => {
        const id = 1000;
        return supertest(app)
          .get(`/api/users/${id}`)
          .expect(404, { message: `There is no user with id ${id}` });
      });
    });

    context('Given the table has users', () => {
      beforeEach(`Populate 'users', 'blog_posts', and 'comments' tables`, () => {
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

      it('Responds with 200 and the full user (including all of its comments and blog posts) with the id, excluding its password',
        () => {
          const id = 1;
          return supertest(app)
            .get(`/api/users/${id}`)
            .expect(200, responseFullUsers[id-1]);
        });
    });

    context('Given XSS content', () => {
      before(`Populate 'users', 'blog_posts', and 'comments' with malicious entities`, () => {
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

      it('Responds with 200 and the user with id, sanitized', () => {
        return supertest(app)
          .get(`/api/users/${maliciousUser.id}`)
          .expect(200, sanitizedFullUser);
      });
    });
  });

  describe('POST /api/users/', () => {
    it(`Responds with 201 and the new user, and adds it to the 'users' table`, () => {
      const newUser = {
        username: 'NewUser',
        user_password: 'password',
        email: 'user@mailinator.com'
      };
      return supertest(app)
        .post(`/api/users/`)
        .send(newUser)
        .expect(201, {
          id: 1,
          username: newUser.username,
          email: newUser.email
        })
        .then(() => userWasAddedToDatabase(db, 1, newUser));
    });

    context('Given XSS content', () => {
      it(
        `Responds with 201 and the new user without its XSS content, and adds it to the 'users' table`,
        () => {
          return supertest(app)
            .post(`/api/users/`)
            .send(maliciousUser)
            .expect(201, sanitizedUser)
            .then(() => userWasAddedToDatabase(db, 1, maliciousUser));
        });
    });

    /*
    --------------------------
      Test Validation Errors
    --------------------------
    */
    // User template to use for tests
    const validationUser = {
      username: 'test_name',
      user_password: 'testPassword',
      email: 'validation@mailinator.com'
    };

    // Expected validation errors for required fields
    const requiredFieldErrors = {
      username: `'username' is missing from the request body`,
      user_password: `'user_password' is missing from the request body`,
      email: `'email' is missing from the request body`
    };
    testValidationFields(
      app,
      'POST',
      (fieldName) => `Responds with 400 and an error message when ${fieldName} is missing`,
      'post',
      () => '/api/users/',
      requiredFieldErrors,
      validationUser,
      (user, fieldName) => {
        delete user[fieldName];
        return user;
      }
    );

    // Expected validation errors for string fields
    const stringFieldErrors = {
      username: `'username' must be a string`,
      user_password: `'user_password' must be a string`,
      email: `'email' must be a string`
    };
    testValidationFields(
      app,
      'POST',
      (fieldName) => `Responds with 400 and an error message when ${fieldName} is not a string`,
      'post',
      () => '/api/users/',
      stringFieldErrors,
      validationUser,
      (user, fieldName) => {
        user[fieldName] = 6;
        return user;
      }
    );

    it(`Responds with 400 and an error message when 'username' has a space`, () => {
      const newUser = {
        ...validationUser,
        username: ` ${validationUser.username}`
      };
      return supertest(app)
        .post(`/api/users/`)
        .send(newUser)
        .expect(400, { message: `'username' cannot have any spaces` });
    });

    it(`Responds with 400 and an error message when 'email' isn't well formed`, () => {
      const newUser = {
        ...validationUser,
        email: `email`
      };
      return supertest(app)
        .post(`/api/users/`)
        .send(newUser)
        .expect(400, { message: `'email' must be well formed` });
    });

    it(`Responds with 400 and an error message when 'email' doesn't have a valid domain`, () => {
      const newUser = {
        ...validationUser,
        email: `email@gmail.co`
      };
      return supertest(app)
        .post(`/api/users/`)
        .send(newUser)
        .expect(400, { message: `'email' must have a valid domain` });
    });
  });

  describe('POST /api/users/login', () => {
    const invalidMessage = `The provided username and password combination is invalid`;

    context('Given no users', () => {
      // same result as the user providing the wrong username
      it(`Responds with 404 and an error message`, () => {
        const user = testUsers[0];
        const body = {
          username: user.username,
          user_password: user.user_password
        };

        return supertest(app)
          .post(`/api/users/login`)
          .send(body)
          .expect(404, { message: invalidMessage });
      });
    });

    context('Given the table has users', () => {
      beforeEach(`Populate the 'users' table, using the API`, () => {
        const user = testUsers[0];
        return supertest(app)
          .post(`/api/users/`)
          .send({
            username: user.username,
            user_password: user.user_password,
            email: user.email
          });
      });

      it(
        `Responds with 201, the user token, and the user's id when given a correct username and password`,
        () => {
          const id = 1;
          const user = testUsers[id-1];
          const body = {
            username: user.username,
            user_password: user.user_password
          };

          return supertest(app)
            .post(`/api/users/login`)
            .send(body)
            .expect(201)
            .then((result) => {
              expect(result.body).to.have.property('token');
              expect(result.body.id).to.eql(id);
            });
        });

        it(`Responds with 401 and an error message when the password is incorrect`, () => {
          const id = 1;
          const user = testUsers[id-1];
          const body = {
            username: user.username,
            user_password: `${user.user_password}1`
          };

          return supertest(app)
            .post(`/api/users/login`)
            .send(body)
            .expect(401, { message: invalidMessage });
        });
    });
  });
});