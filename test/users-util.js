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
    username: `maliciousUser<img src="doesn't exist" onerror="alert('malicious stuff')" />`,
    user_password: `password<script>alert('malicious stuff')</script>`,
    email: `email@gmail.com <script>evilscript()</script>`
  };

  // The password is removed from the response
  const sanitizedUser = {
    id: 1,
    username: `maliciousUser<img src />`,
    email: `email@gmail.com &lt;script&gt;evilscript()&lt;/script&gt;`
  };

  return { maliciousUser, sanitizedUser };
}

module.exports = {
  makeUsersArray,
  makeUsersResponseArray,
  makeMaliciousUser
};