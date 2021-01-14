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
 */
function testValidationFields(
  app,
  testTitle,
  testDescriptionWriter,
  method,
  pathCreator,
  validationFieldErrors,
  entity,
  invalidator) {
    const id = 1;

    for(const [validationFieldName, fieldError] of Object.entries(validationFieldErrors)) {
      let invalidEntity = JSON.parse(JSON.stringify(entity));

      it(
        `(testValidationFields) ${testTitle}: ${testDescriptionWriter(validationFieldName)}`,
        () => {
          invalidEntity = invalidator(invalidEntity, validationFieldName);

          return supertest(app)[method](pathCreator(id))
            .send(invalidEntity)
            .expect(400, { message: fieldError });
        });
    }
}

module.exports = {
  testValidationFields
};