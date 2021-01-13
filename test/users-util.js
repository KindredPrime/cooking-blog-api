function makeUsersArray() {
  return [
    {
      id: 1,
      username: 'User1',
      user_password: 'password1',
      email: 'user1@gmail.com'
    },
    {
      id: 2,
      username: 'FakeUser2',
      user_password: 'password2',
      email: 'fakeuser2@gmail.com'
    },
    {
      id: 3,
      username: 'User3',
      user_password: 'password3',
      email: 'user3@gmail.com'
    },
  ];
}

module.exports = {
  makeUsersArray
};