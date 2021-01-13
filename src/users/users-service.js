const usersService = {
  getAllUsers(db) {
    return db.select('*').from('users');
  },
  getUserById(db, id) {
    return this.getAllUsers(db).where({ id }).first();
  },
  getUserByUsername(db, username) {
    return this.getAllUsers(db).where({ username }).first();
  },
  getUserByEmail(db, email) {
    return this.getAllUsers(db).where({ email }).first();
  },
  insertUser(db, user) {
    return db.insert(user).into('users').returning('*')
      .then((results) => results[0]);
  },
  updateUser(db, id, updatedFields) {
    return this.getUserById(db, id).update(updatedFields);
  },
  deleteUser(db, id) {
    return this.getUserById(db, id).delete();
  }
};

module.exports = usersService;