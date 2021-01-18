function makeBlogPostsArray() {
  return [
    {
      id: 1,
      title: 'Lessons I Learned from Cooking',
      author_id: 2,
      content: `Have patience, it can be fun to experiment and explore, having a hard time learning something may only be temporary, bringing an idea of yours to life by creating it from scratch without relying on any instructions can be fun and rewarding, the meals you cook don't have to be fancy or difficult to taste good.`,
      last_edited: '2020-12-17T07:37:16.000Z'
    },
    {
      id: 2,
      title: 'How to Save Money When Cooking',
      author_id: 1,
      content: 'Buy in bulk, cook in bulk and freeze the leftovers, but store brand products.',
      last_edited: '2020-12-28T18:24:43.000Z'
    },
    {
      id: 3,
      title: '5 Easy Cooking Tips',
      author_id: 3,
      content: `1. When experimenting with seasonings in a recipe, mix them dry in a cup and smell it. If it smells good, then it''ll probably taste good.
      2. Add some water when microwaving leftovers
      3. Start small with seasonings
      4. Cook
      5. Blah`,
      last_edited: '2020-12-01T12:54:31.000Z'
    }
  ];
}

function makeMaliciousBlogPost() {
  const maliciousBlogPost = {
    id: 1,
    title: `Malicious Title <img src="does not exist" onerror="alert('Malicious stuff')" />`,
    author_id: 1,
    content: `Malicious content <script>evilscript()</script>`,
    last_edited: '2021-01-07T01:01:01.000Z'
  };

  const sanitizedBlogPost = {
    id: 1,
    title: "Malicious Title <img src />",
    author_id: 1,
    content: "Malicious content &lt;script&gt;evilscript()&lt;/script&gt;",
    last_edited: "2021-01-07T01:01:01.000Z"
  };

  return { maliciousBlogPost, sanitizedBlogPost };
}

/*
  Tests that the endpoint response has the correct blog post fields
*/
function gotExpectedResult(response, expectedBlogPost) {
  const { id, title, author_id, content } = response.body;
  expect(id).to.eql(expectedBlogPost.id);
  expect(title).to.eql(expectedBlogPost.title);
  expect(author_id).to.eql(expectedBlogPost.author_id);
  expect(content).to.eql(expectedBlogPost.content);
  expect(response.body).to.have.property('last_edited');
}

module.exports = {
  makeBlogPostsArray,
  makeMaliciousBlogPost,
  gotExpectedResult
};