const { makeMaliciousUser } = require('./users-test-util');
const { makeMaliciousBlogPost } = require('./blogPosts-test-util');

function makeCommentsArray() {
  return [
    {
      id: 1,
      content: 'These are all great lessons!',
      creator_id: 1,
      post_id: 1,
      last_edited: '2020-12-19T07:37:16.000Z'
    },
    {
      id: 2,
      content: `I can't wait to try these seasoning combinations in my next meal!`,
      creator_id: 3,
      post_id: 2,
      last_edited: '2020-12-17T08:37:52.000Z'
    },
    {
      id: 3,
      content: `I wish I knew these when I started learning to cook!`,
      creator_id: 2,
      post_id: 3,
      last_edited: '2021-01-05T02:28:28.000Z'
    },
    {
      id: 4,
      content: `Great advice!  This'll help me save so much money feeding my three teenagers!`,
      creator_id: 1,
      post_id: 3,
      last_edited: '2020-12-31T09:24:43.000Z'
    },
    {
      id: 5,
      content: `What an insightful post`,
      creator_id: 2,
      post_id: 1,
      last_edited: '2021-01-01T10:31:39.000Z'
    },
  ];
}

function gotExpectedComment(comment, expectedComment) {
  const { id, content, creator_id, post_id } = comment;
  expect(id).to.eql(expectedComment.id);
  expect(content).to.eql(expectedComment.content);
  expect(creator_id).to.eql(expectedComment.creator_id);
  expect(post_id).to.eql(expectedComment.post_id);
  expect(comment).to.have.property('last_edited');
}

function gotExpectedFullComment(comment, expectedComment) {
  gotExpectedComment(comment, expectedComment);

  const { creator_username, post_title } = comment;
  expect(creator_username).to.eql(expectedComment.creator_username);
  expect(post_title).to.eql(expectedComment.post_title);
}

function makeMaliciousComment() {
  // Change these to use malicious versions
  const { maliciousUser, sanitizedUser } = makeMaliciousUser();
  const { maliciousBlogPost, sanitizedBlogPost } = makeMaliciousBlogPost();

  const maliciousComment = {
    id: 1,
    content: `Malicious content <img src="does not exist" onerror="alert('Malicious stuff')" />`,
    creator_id: maliciousUser.id,
    post_id: maliciousBlogPost.id,
    last_edited: '2021-01-07T01:01:01.000Z'
  };

  const maliciousFullComment = {
    ...maliciousComment,
    creator_username: maliciousUser.username,
    post_title: maliciousBlogPost.title
  };

  const sanitizedComment = {
    id: 1,
    content: "Malicious content <img src />",
    creator_id: sanitizedUser.id,
    post_id: sanitizedBlogPost.id,
    last_edited: '2021-01-07T01:01:01.000Z'
  };

  const sanitizedFullComment = {
    ...sanitizedComment,
    creator_username: sanitizedUser.username,
    post_title: sanitizedBlogPost.title
  };

  return { maliciousComment, maliciousFullComment, sanitizedComment, sanitizedFullComment };
}

module.exports = {
  makeCommentsArray,
  gotExpectedComment,
  gotExpectedFullComment,
  makeMaliciousComment
};