const app = require('../src/app');
const {
  makeUsersArray,
  makeUsersResponseArray,
  makeMaliciousUser,
  userWasAddedToDatabase
} = require('./users-test-util');
const { testValidationFields } = require('./test-util');

describe('Users Endpoints', () => {
  let db;
  before('Connect to database', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    });

    app.set('db', db);
  });

  const testUsers = makeUsersArray();
  const responseUsers = makeUsersResponseArray();

  const truncateTable = 'TRUNCATE users RESTART IDENTITY CASCADE'
  before('Clear the database', () => db.raw(truncateTable));
  afterEach('Clear the database', () => db.raw(truncateTable));

  after('Disconnect from database', () => db.destroy());

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
      before('Populate users table', () => {
        return db
          .insert(testUsers)
          .into('users');
      });

      it('Responds with 200 and the user with id, excluding its password', () => {
        const id = 1;
        return supertest(app)
          .get(`/api/users/${id}`)
          .expect(200, responseUsers[id-1]);
      });
    });

    context('Given XSS content', () => {
      const { maliciousUser, sanitizedUser } = makeMaliciousUser();

      before(`Insert malicious user into 'users' table`, () => {
        return db
          .insert(maliciousUser)
          .into('users');
      });

      it('Responds with 200 and the user with id, sanitized', () => {
        return supertest(app)
          .get(`/api/users/${maliciousUser.id}`)
          .expect(200, sanitizedUser);
      });
    });
  });

  describe.only('POST /api/users/', () => {
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
      const { maliciousUser, sanitizedUser } = makeMaliciousUser();
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
});