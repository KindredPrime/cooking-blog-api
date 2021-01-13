const { makeUsersArray } = require('./users-util');
const usersService = require('../src/users/users-service');

describe('Users Service Object', () => {
  let db;
  before('Connect to database', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    });
  });

  before('Clear the database', () => db.raw('TRUNCATE users RESTART IDENTITY CASCADE'));

  afterEach('Clear the database', () => db.raw('TRUNCATE users RESTART IDENTITY CASCADE'));

  after('Disconnect from database', () => db.destroy());

  context('Given no users', () => {
    it('getAllUsers() returns an empty array', () => {
      return usersService.getAllUsers(db)
        .then((results) => {
          expect(results).to.eql([]);
        });
    });

    it(`insertUser() adds the user to the 'users' table and returns it`, () => {
      const newUser = {
        username: 'NewUser',
        user_password: 'password',
        email: 'email@gmail.com'
      };
      const expectedResult = {
        id: 1,
        ...newUser
      };

      return usersService.insertUser(db, newUser)
        .then((result) => {
          expect(result).to.eql(expectedResult);
        })
        .then(() => usersService.getUserById(db, 1))
        .then((result) => {
          expect(result).to.eql(expectedResult);
        });
    });
  })

  context('Given the table has users', () => {
    const testUsers = makeUsersArray();

    beforeEach(`Insert users into 'users' table`, () => {
      return db
        .insert(testUsers)
        .into('users');
    });

    it('getAllUsers() returns all the users in the table', () => {
      return usersService.getAllUsers(db)
        .then((results) => {
          expect(results).to.eql(testUsers);
        });
    });

    it('getUserById() returns the user with the id', () => {
      const id = 1;
      return usersService.getUserById(db, id)
        .then((result) => {
          expect(result).to.eql(testUsers[id-1]);
        });
    });

    it('getUserByUsername() returns the user with the username', () => {
      const index = 0;
      const username = testUsers[index].username;
      return usersService.getUserByUsername(db, username)
        .then((result) => {
          expect(result).to.eql(testUsers[index]);
        });
    });

    it('getUserByEmail() returns the user with the email', () => {
      const index = 0;
      const email = testUsers[index].email;
      return usersService.getUserByEmail(db, email)
        .then((result) => {
          expect(result).to.eql(testUsers[index])
        });
    });

    it('updateUser() updates the user with the id', () => {
      const id = 1;
      const updatedFields = {
        username: 'UpdatedUsername',
        user_password: 'updatedpassword',
        email: 'updated_email@gmail.com'
      };
      const expectedUser = {
        id,
        ...updatedFields
      };

      return usersService.updateUser(db, id, updatedFields)
        .then(() => usersService.getUserById(db, id))
        .then((result) => {
          expect(result).to.eql(expectedUser);
        });
    });

    it('deleteUser() removes the user from the table', () => {
      const id = 1;
      return usersService.deleteUser(db, id)
        .then(() => usersService.getAllUsers(db))
        .then((results) => {
          expect(results).to.eql(testUsers.filter((user) => user.id !== id));
        });
    });
  });
});