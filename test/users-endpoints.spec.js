const app = require('../src/app');
const { makeUsersArray, makeUsersResponseArray, makeMaliciousUser } = require('./users-util');

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
});