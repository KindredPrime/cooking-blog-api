const blogPostsService = require('../src/blogPosts/blogPosts-service');
const { makeUsersArray } = require('./users-test-util');
const { makeBlogPostsArray } = require('./blogPosts-test-util');

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

    it('getBlogPostsByAuthor() returns an empty array', () => {
      const id = 1;
      const authorId = testBlogPosts[id-1].author_id;
      return blogPostsService.getBlogPostsByAuthor(db, authorId)
        .then((results) => {
          expect(results).to.eql([]);
        });
    });

    it(
      `createBlogPost() adds the blog post to the 'blog_posts' table and returns the new blog post`,
      () => {
        const testAuthorId = testUsers[0].id;
        const newBlogPost = {
          title: 'Title',
          author_id: testAuthorId,
          content: 'Content'
        };

        let postResult;
        return blogPostsService.createBlogPost(db, newBlogPost)
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

    it('getBlogPostsByAuthor() returns all the blog posts with the author_id', () => {
      const id = 1;
      const authorId = testBlogPosts[id-1].author_id;
      return blogPostsService.getBlogPostsByAuthor(db, authorId)
        .then((results) => {
          expect(results).to.eql(testBlogPosts.filter((post) => post.author_id === authorId));
        });
    });

    it(`getBlogPostById() returns the blog post with the id`, () => {
      const id = 1;
      return blogPostsService.getBlogPostById(db, id)
        .then((result) => {
          expect(result).to.eql(testBlogPosts[id-1]);
        });
    });

    it(`getFullBlogPostById() returns the blog post with the id, along with its author's username`, () => {
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

    it(
      `updateFullBlogPost() updates the blog post with the id, and returns it (with an updated last_edited field) along with it's author's username`,
      () => {
        const origBlogPost = testBlogPosts[0];
        const origLastEdited = origBlogPost.last_edited;

        const updatedFields = {
          title: `${origBlogPost.title}1`,
          author_id: origBlogPost.author_id + 1,
          content: `${origBlogPost.content}1`,
        };

        const newAuthor = testUsers.find((user) => user.id === updatedFields.author_id);

        let updatedLastEdited;
        return blogPostsService.updateFullBlogPost(db, origBlogPost.id, updatedFields)
          .then((result) => {
            const { id, title, author_id, author_username, content, last_edited } = result;
            updatedLastEdited = last_edited;
            expect(id).to.eql(origBlogPost.id);
            expect(title).to.eql(updatedFields.title);
            expect(author_id).to.eql(updatedFields.author_id);
            expect(author_username).to.eql(newAuthor.username);
            expect(content).to.eql(updatedFields.content);
            expect(last_edited.valueOf()).is.above(origLastEdited.valueOf());
          })
          .then(() => blogPostsService.getBlogPostById(db, origBlogPost.id))
          .then((result) => {
            expect(result).to.eql({
              id: origBlogPost.id,
              title: updatedFields.title,
              author_id: updatedFields.author_id,
              content: updatedFields.content,
              last_edited: updatedLastEdited
            });
          });
      });

    it(
      `updateFullBlogPost() doesn't update the 'last_edited' field if none of the fields will be changed`,
      () => {
        const origBlogPost = testBlogPosts[0];

        const sameFields = {
          title: origBlogPost.title,
          author_id: origBlogPost.author_id,
          content: origBlogPost.content,
        };

        const origAuthor = testUsers.find((user) => user.id === origBlogPost.author_id);
        const origFullBlogPost = {
          ...origBlogPost,
          author_username: origAuthor.username
        };

        return blogPostsService.updateFullBlogPost(db, origBlogPost.id, sameFields)
          .then((result) => {
            expect(result).to.eql(origFullBlogPost);
          })
          .then(() => blogPostsService.getFullBlogPostById(db, origBlogPost.id))
          .then((result) => {
            expect(result).to.eql(origFullBlogPost);
          });
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