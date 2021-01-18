const EmailValidator = require('email-deep-validator');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('./config');
const usersService = require('./users/users-service');

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

/**
 * Validates the fields in the body of a POST request for comments. Returns the error of the first
 * invalid field.  Returns null if all fields are valid.
 */
const validateCommentPost = (newComment) => {
  return validate([
    ['content', [validateRequired, validateString]],
    ['creator_id', [validateRequired, validateNumber]],
    ['post_id', [validateRequired, validateNumber]],
  ])(newComment);
}

/**
 * Authenticates the user
 *
 * @param {Object} req - HTTP request from a client
 * @param {Object} res - HTTP response to be sent back to the client
 * @param {Function} next - the next middleware to run
 */
const requireLogin = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    return res
      .status(401)
      .json({ message: `The request must have an 'Authorization' header` });
  }

  const isBearerType = authHeader.startsWith('Bearer ');
  if (!isBearerType) {
    return res
      .status(401)
      .json({ message: `The 'Authorization' header must be a Bearer type with the format: 'Bearer <token>'` });
  }

  const token = authHeader.split('Bearer ')[1];
  let userId;
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    userId = payload.id;
  } catch(error) {
    return res
      .status(401)
      .json({ message: `Invalid authorization token` });
  }

  return usersService.getUserById(req.app.get('db'), userId)
    .then((user) => {
      if (!user) {
        return res
          .status(404)
          .json({ message: `The 'Authorization' token doesn't match any existing user` });
      }

      req.user = user;
      next();
    })
    .catch(next);
};

function convertTimestamp(entity) {
  if (!entity || !entity.last_edited) {
    return entity;
  }

  return {
    ...entity,
    last_edited: entity.last_edited.toISOString()
  };
}

/**
 * Create a new service where each of the original service's functions have another function run after them
 *
 * @param {Object} service
 * @param {Function} tailFunc - the function to add to the end of each function
 * @param {Array} excludedFunctions - a list of functions to NOT apply the tailFunc to
 */
function addTailFunction(service, tailFunc, excludedFunctions=[]) {
  const newService = { ...service };
  for(const funcName in newService) {
    // Skip functions that are excluded
    if (!excludedFunctions.includes(funcName)) {
      const f = newService[funcName];
      newService[funcName] = (...args) => f(...args).then((results) => {
        if (Array.isArray(results)) {
          return results.map(tailFunc);
        }

        return tailFunc(results);
      });
    }
  }

  return newService;
}

module.exports = {
  validateUserPost,
  validateBlogPostPost,
  validateCommentPost,
  requireLogin,
  convertTimestamp,
  addTailFunction
};