const { makeUsersArray, makeMaliciousUser } = require('./users-test-util');
const { makeBlogPostsArray, makeMaliciousBlogPost } = require('./blogPosts-test-util');
const { makeCommentsArray, makeMaliciousComment } = require('./comments-test-util');

/**
 * Generate field validation test cases
 *
 * @param {Object} app - The app to run the test against
 * @param {string} testTitle - The title of the test case (e.g. POST or PATCH)
 * @param {Function} testDescriptionWriter - A function that uses the field name to generate a
 *  description for a test case
 * @param {string} method - The HTTP method to use
 * @param {Function} pathCreator - A function that uses the entity's id to create an endpoint path
 * @param {Object} validationFieldErrors - An object containing the fields to be tested, with their
 *  expected validation error
 * @param {Object} entity - The data entity to invalidate for each test case
 * @param {Function} invalidator - A function that invalidates the entity to test validation errors
 * @param {string} token - used to verify a user is logged in
 */
function testValidationFields(
  app,
  testTitle,
  testDescriptionWriter,
  method,
  pathCreator,
  validationFieldErrors,
  entity,
  invalidator,
  token) {
    const id = 1;

    for(const [validationFieldName, fieldError] of Object.entries(validationFieldErrors)) {
      let invalidEntity = JSON.parse(JSON.stringify(entity));

      it(
        `(testValidationFields) ${testTitle}: ${testDescriptionWriter(validationFieldName)}`,
        () => {
          invalidEntity = invalidator(invalidEntity, validationFieldName);

          return supertest(app)[method](pathCreator(id))
            .set('Authorization', `Bearer ${token}`)
            .send(invalidEntity)
            .expect(400, { message: fieldError });
        });
    }
}

function makeFullUsersArray() {
  const testBlogPosts = makeBlogPostsArray();
  const testComments = makeCommentsArray();

  return makeUsersArray().map((user) => {
    const blogPosts = testBlogPosts.filter((post) => post.author_id === user.id);
    const comments = testComments.filter((comment) => comment.creator_id === user.id);

    return {
      ...user,
      blogPosts,
      comments
    };
  });
}

function makeMaliciousFullUser() {
  const { maliciousUser, sanitizedUser } = makeMaliciousUser();
  const { maliciousBlogPost, sanitizedBlogPost } = makeMaliciousBlogPost();
  const { maliciousComment, sanitizedComment } = makeMaliciousComment();

  const maliciousFullUser = {
    ...maliciousUser,
    blogPosts: [maliciousBlogPost],
    comments: [maliciousComment]
  };

  // The password is removed from the response
  const sanitizedFullUser = {
    ...sanitizedUser,
    blogPosts: [sanitizedBlogPost],
    comments: [sanitizedComment]
  };

  return { maliciousFullUser, sanitizedFullUser };
}

function makeFullBlogPostsArray() {
  const testUsers = makeUsersArray();

  return makeBlogPostsArray().map((post) => {
    const author_username = testUsers
      .find((user) => user.id === post.author_id)
      .username;

    return {
      ...post,
      author_username
    };
  })
}

function makeMaliciousFullBlogPost() {
  const { maliciousBlogPost, sanitizedBlogPost } = makeMaliciousBlogPost();
  const { maliciousUser, sanitizedUser } = makeMaliciousUser();

  const maliciousFullBlogPost = {
    ...maliciousBlogPost,
    author_username: maliciousUser.username
  };

  const sanitizedFullBlogPost = {
    ...sanitizedBlogPost,
    author_username: sanitizedUser.username
  };

  return { maliciousFullBlogPost, sanitizedFullBlogPost };
}

function makeFullCommentsArray() {
  const testUsers = makeUsersArray();
  const testBlogPosts = makeBlogPostsArray();

  return makeCommentsArray().map((comment) => {
    const { creator_id, post_id } = comment;
    const creator_username = testUsers[creator_id-1].username;
    const post_title = testBlogPosts[post_id-1].title;

    return {
      ...comment,
      creator_username,
      post_title
    };
  });
}

function updateIdSequence(db, table) {
  return db
    .raw(`
      SELECT setval(
        pg_get_serial_sequence('${table}', 'id'),
        max(id))
      FROM ${table}
    `);
}

module.exports = {
  testValidationFields,
  makeFullUsersArray,
  makeMaliciousFullUser,
  makeFullBlogPostsArray,
  makeMaliciousFullBlogPost,
  makeFullCommentsArray,
  updateIdSequence
};