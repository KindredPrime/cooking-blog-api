const EmailValidator = require('email-deep-validator');

const validateRequired = (fieldName) => (fieldValue) => {
  if (!fieldValue) {
    return `'${fieldName}' is missing from the request body`;
  }
};

const validateString = (fieldName) => (fieldValue) => {
  if (typeof fieldValue !== 'string') {
    return `'${fieldName}' must be a string`;
  }
};

const validateNumber = (fieldName) => (fieldValue) => {
  if (typeof fieldValue !== 'number') {
    return `'${fieldName}' must be a number`;
  }
};

/**
 * Validates fields of the provided entity, and returns the error of the first invalid field.
 * Returns null if all fields are valid
 *
 * @param {Array} validators - A list of fields to be validated and the functions used to validate
 *  them. Format: [
 *    [<first field name>, [<validate function>, <other validate function>]],
 *    [<second field name>, [<validate function>, <other validate function>]]
 *  ]
 * @return {String} error
 */
const validate = (validators) => (entity) => {
  for(const [fieldName, fs] of validators) {
    let fieldRequired = fs.find((f) => f.name === 'validateRequired');

    // skip testing if the field is missing and it isn't required
    if (!fieldRequired && !entity[fieldName]) {

      // do nothing
    } else {
      // Supply the field name to each validate function
      const vFs = fs.map((v) => {
        return v(fieldName);
      });

      /*
        Run the validate function with the field's value, and find the first result that is truthy.
      */
      const error = vFs.map((f) => f(entity[fieldName])).find(Boolean);
      if (error) {
        return error;
      }
    }
  }

  // No errors were found
  return null;
};

/**
 * Validates the email field in the body of a request for Users. Returns the error of the first
 * invalidity found.  Returns null if the field is valid.
 */
function validateEmail(email) {
  const emailValidator = new EmailValidator();

  return emailValidator.verify(email)
    .then(({ wellFormed, validDomain }) => {
      if (!wellFormed) {
        return `'email' must be well formed`;
      }

      if (!validDomain) {
        return `'email' must have a valid domain`;
      }

      return null;
    });
}

/**
 * Validates the fields in the body of a POST request for Users. Returns the error of the first
 * invalid field.  Returns null if all fields are valid.
 */
const validateUserPost = async (newUser) => {
  const { username, email } = newUser;

  const validateError = validate([
    ['username', [validateRequired, validateString]],
    ['user_password', [validateRequired, validateString]],
    ['email', [validateRequired, validateString]]
  ])(newUser);
  if (validateError) {
    return validateError;
  }

  // Check if the username has spaces
  if (username.includes(' ')) {
    return `'username' cannot have any spaces`;
  }

  const emailError = await validateEmail(email);
  if (emailError) {
    return emailError;
  }

  return null;
};

/**
 * Validates the fields in the body of a POST request for blog posts. Returns the error of the first
 * invalid field.  Returns null if all fields are valid.
 */
const validateBlogPostPost = (newBlogPost) => {
  const validateError = validate([
    ['title', [validateRequired, validateString]],
    ['author_id', [validateRequired, validateNumber]],
    ['content', [validateRequired, validateString]]
  ])(newBlogPost);
  if (validateError) {
    return validateError;
  }

  return null;
};

module.exports = {
  validateUserPost,
  validateBlogPostPost
};