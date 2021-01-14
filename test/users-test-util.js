const usersService = require('../src/users/users-service');

function makeUsersArray() {
  return [
    {
      id: 1,
      username: 'User1',
      user_password: 'password1',
      email: 'test1@mailinator.com'
    },
    {
      id: 2,
      username: 'FakeUser2',
      user_password: 'password2',
      email: 'test2@mailinator.com'
    },
    {
      id: 3,
      username: 'User3',
      user_password: 'password3',
      email: 'test3@mailinator.com'
    },
  ];
}

function makeUsersResponseArray() {
  return makeUsersArray().map((user) => {
    const { id, username, email } = user;
    return {
      id,
      username,
      email
    };
  })
}

function makeMaliciousUser() {
  const maliciousUser = {
    id: 1,
    username: `maliciousUser<script>evilscript()</script>`,
    user_password: `password<script>alert('malicious stuff')</script>`,
    email: `malicious-user<script>evilscript()</script>@mailinator.com`
  };

  // The password is removed from the response
  const sanitizedUser = {
    id: 1,
    username: `maliciousUser&lt;script&gt;evilscript()&lt;/script&gt;`,
    email: `malicious-user&lt;script&gt;evilscript()&lt;/script&gt;@mailinator.com`
  };

  return { maliciousUser, sanitizedUser };
}

function userWasAddedToDatabase(db, id, user) {
  return usersService.getUserById(db, id)
    .then((result) => {
      expect(result.id).to.eql(id);
      expect(result.username).to.eql(user.username);
      expect(result.email).to.eql(user.email);
      expect(result).to.have.property('user_password');
    });
}

module.exports = {
  makeUsersArray,
  makeUsersResponseArray,
  makeMaliciousUser,
  userWasAddedToDatabase
};