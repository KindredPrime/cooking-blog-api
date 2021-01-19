const { addTailFunction, convertTimestamp } = require('../util');

const usersService = {
  getAllUsers(db) {
    return db.select('*').from('users');
  },
  getUserById(db, id) {
    return usersService.getAllUsers(db).where({ id }).first();
  },
  /*
    Return the user, along with all the blog posts it has authored, and all the comments it has
    created.
  */
  getFullUserById(db, id) {
    let userNotFound = false;
    let user;
    let blogPosts = [];
    let comments = [];
    return usersService.getUserById(db, id)
      .then((result) => {
        if (!result) {
          userNotFound = true;
          return;
        }

        user = result;
      })
      .then(() => {
        if (userNotFound) {
          return;
        }

        return db.select('*').from('blog_posts').where('author_id', user.id);
      })
      .then((results) => {
        if (userNotFound) {
          return;
        }

        blogPosts = results;
      })
      .then(() => {
        if (userNotFound) {
          return;
        }

        return db.select('*').from('comments').where('creator_id', user.id);
      })
      .then((results) => {
        if (userNotFound) {
          return;
        }

        comments = results;
        return {
          ...user,
          blogPosts,
          comments
        };
      })
  },
  getUserByUsername(db, username) {
    return usersService.getAllUsers(db).where({ username }).first();
  },
  getUserByEmail(db, email) {
    return usersService.getAllUsers(db).where({ email }).first();
  },
  insertUser(db, user) {
    return db.insert(user).into('users').returning('*')
      .then((results) => results[0]);
  },
  updateUser(db, id, updatedFields) {
    return usersService.getUserById(db, id).update(updatedFields);
  },
  deleteUser(db, id) {
    return usersService.getUserById(db, id).delete();
  }
};

module.exports = {
  ...usersService,
  getFullUserById: (...args) => usersService.getFullUserById(...args).then(convertTimestamp)
};