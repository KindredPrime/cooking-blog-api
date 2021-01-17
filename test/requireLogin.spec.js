const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { makeUsersArray } = require('./users-test-util');

describe('requireLogin Middleware', () => {
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

  const testUsers = makeUsersArray();
  beforeEach(`Populate the 'users' table`, () => {
    return db
      .insert(testUsers)
      .into('users');
  });

  afterEach('Clear the database', () => db.raw(truncateString));

  after('Disconnect from database', () => db.destroy());

  const newBlogPost = {
    title: 'New Title',
    author_id: testUsers[0].id,
    content: 'New content'
  };

  // Note: the no 'Authorization' header case is tested in every endpoint that requires a user login

  it(
    `Responds with 401 and an error message when the 'Authorization' header has the wrong format`,
    () => {
      return supertest(app)
        .post(`/api/blog-posts/`)
        .set('Authorization', testToken)
        .send(newBlogPost)
        .expect(
          401,
          {
            message: `The 'Authorization' header must be a Bearer type with the format: 'Bearer <token>'`
          }
        );
    });

  it(
    `Responds with 401 and an error message when the 'Authorization' header's token is invalid`,
    () => {
      return supertest(app)
        .post(`/api/blog-posts/`)
        .set('Authorization', 'Bearer invalidtoken')
        .send(newBlogPost)
        .expect(401, { message: `Invalid authorization token` });
    });

  it(
    `Responds with 404 and an error message when the decoded token doesn't match any existing user`,
    () => {
      const wrongId = jwt.sign({ id: 1000}, process.env.SECRET_KEY);
      return supertest(app)
        .post(`/api/blog-posts/`)
        .set('Authorization', `Bearer ${wrongId}`)
        .send(newBlogPost)
        .expect(404, { message: `The 'Authorization' token doesn't match any existing user` });
    });
});