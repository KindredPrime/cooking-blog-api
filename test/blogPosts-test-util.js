function makeBlogPostsArray() {
  return [
    {
      id: 1,
      title: 'Lessons I Learned from Cooking',
      author_id: 2,
      content: `Have patience, it can be fun to experiment and explore, having a hard time learning something may only be temporary, bringing an idea of yours to life by creating it from scratch without relying on any instructions can be fun and rewarding, the meals you cook don't have to be fancy or difficult to taste good.`,
      last_edited: new Date('Thurs Dec 17 07:37:16 2020')
    },
    {
      id: 2,
      title: 'How to Save Money When Cooking',
      author_id: 1,
      content: 'Buy in bulk, cook in bulk and freeze the leftovers, but store brand products.',
      last_edited: new Date('Mon Dec 28 18:24:43 2020')
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
      last_edited: new Date('Tues Dec 1 12:54:31 2020')
    }
  ];
}

module.exports = {
  makeBlogPostsArray
};