const blogPostsService = require('../src/blogPosts/blogPosts-service');
const { makeUsersArray } = require('./users-test-util');
const { makeBlogPostsArray } = require('./blogPosts-test-util');
const { makeFullBlogPostsArray } = require('./test-util');

describe('Blog Posts Service Object', () => {
  let db;
  before('Connect to database', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    });
  });

  const truncateString = 'TRUNCATE users, blog_posts RESTART IDENTITY CASCADE';

  before('Clear the database', () => db.raw(truncateString));

  afterEach('Clear the database', () => db.raw(truncateString));

  after('Disconnect from database', () => db.destroy());

  const testUsers = makeUsersArray();
  const testBlogPosts = makeBlogPostsArray();
  const testFullBlogPosts = makeFullBlogPostsArray();

  context('Given no blog posts', () => {
    beforeEach(`Populate 'users' table`, () => {
      return db
        .insert(testUsers)
        .into('users');
    });

    it('getAllBlogPosts() returns an empty array', () => {
      return blogPostsService.getAllBlogPosts(db)
        .then((results) => {
          expect(results).to.eql([]);
        });
    });

    it('getAllFullBlogPosts() returns an empty array', () => {
      return blogPostsService.getAllFullBlogPosts(db)
        .then((results) => {
          expect(results).to.eql([]);
        });
    });

    it('getAllBlogPosts() returns an empty array when given an author id', () => {
      const authorId = testBlogPosts[0].author_id;
      return blogPostsService.getAllBlogPosts(db, authorId)
        .then((results) => {
          expect(results).to.eql([]);
        });
    });

    it(
      `insertBlogPost() adds the blog post to the 'blog_posts' table and returns the new blog post`,
      () => {
        const testAuthorId = testUsers[0].id;
        const newBlogPost = {
          title: 'Title',
          author_id: testAuthorId,
          content: 'Content'
        };

        let postResult;
        return blogPostsService.insertBlogPost(db, newBlogPost)
          .then((result) => {
            postResult = result;
            const { id, title, author_id, content } = result;
            expect(id).to.eql(1);
            expect(title).to.eql(newBlogPost.title);
            expect(author_id).to.eql(testAuthorId);
            expect(content).to.eql(newBlogPost.content);
            expect(result).to.have.property('last_edited');
          })
          .then(() => blogPostsService.getBlogPostById(db, 1))
          .then((result) => {
            expect(result).to.eql(postResult);
          });
      });
  });

  context('Given the table has blog posts', () => {
    beforeEach(`Populate 'users' and 'blog_posts' tables`, () => {
      return db
        .insert(testUsers)
        .into('users')
        .then(() => {
          return db
            .insert(testBlogPosts)
            .into('blog_posts');
        });
    });

    it(`getAllBlogPosts() returns all the blog posts from the 'blog_posts' table`, () => {
      return blogPostsService.getAllBlogPosts(db)
        .then((results) => {
          expect(results).to.eql(testBlogPosts);
        });
    });

    it('getAllBlogPosts() returns all the blog posts with the author_id', () => {
      const authorId = testBlogPosts[0].author_id;
      return blogPostsService.getAllBlogPosts(db, authorId)
        .then((results) => {
          expect(results).to.eql(testBlogPosts.filter((post) => post.author_id === authorId));
        });
    });

    it(
      `getAllFullBlogPosts() returns all the full blog posts (including their author's username) from the 'blog_posts' table`,
      () => {
        return blogPostsService.getAllFullBlogPosts(db)
          .then((results) => {
            expect(results).to.eql(testFullBlogPosts);
          });
    });

    it('getAllFullBlogPosts() returns all the full blog posts with the author_id', () => {
      const authorId = testFullBlogPosts[0].author_id;
      return blogPostsService.getAllFullBlogPosts(db, authorId)
        .then((results) => {
          expect(results).to.eql(testFullBlogPosts.filter((post) => post.author_id === authorId));
        });
    });

    it(`getBlogPostById() returns the blog post with the id`, () => {
      const id = 1;
      return blogPostsService.getBlogPostById(db, id)
        .then((result) => {
          expect(result).to.eql(testBlogPosts[id-1]);
        });
    });

    it(`getFullBlogPostById() returns the full blog post with the id`, () => {
      const id = 1;
      return blogPostsService.getFullBlogPostById(db, id)
        .then((result) => {
          const { author_id } = result;
          expect(result).to.eql({
            ...testBlogPosts[id-1],
            author_username: testUsers[author_id-1].username
          });
        })
    });

    it(`deleteBlogPost() deletes the blog post from the 'blog_posts' table`, () => {
      const id = 1;
      return blogPostsService.deleteBlogPost(db, id)
        .then(() => blogPostsService.getAllBlogPosts(db))
        .then((results) => {
          expect(results).to.eql(testBlogPosts.filter((post) => post.id !== id));
        });
    });
  });
});