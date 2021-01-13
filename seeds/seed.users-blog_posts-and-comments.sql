TRUNCATE users RESTART IDENTITY CASCADE;
TRUNCATE blog_posts RESTART IDENTITY CASCADE;
TRUNCATE comments RESTART IDENTITY CASCADE;

INSERT INTO users (username, user_password, email)
  VALUES
    ('User1', 'password1', 'user1@gmail.com'),
    ('FakeUser2', 'password2', 'fakeuser2@gmail.com'),
    ('User3', 'password3', 'user3@gmail.com'),
    ('User4', 'password4', 'user4@gmail.com'),
    ('User5', 'password5', 'user5@gmail.com'),
    ('User6', 'password6', 'user6@gmail.com'),
    ('User7', 'password7', 'user7@gmail.com'),
    ('User8', 'password8', 'user8@gmail.com');

INSERT INTO blog_posts (title, author_id, content, last_edited)
  VALUES
    ('Lessons I Learned from Cooking', 2, 'Have patience, it can be fun to experiment and explore, having a hard time learning something may only be temporary, bringing an idea of yours to life by creating it from scratch without relying on any instructions can be fun and rewarding, the meals you cook don''t have to be fancy or difficult to taste good.', 'Thurs Dec 17 07:37:16 2020'),
    ('How to Save Money When Cooking', 1, 'Buy in bulk, cook in bulk and freeze the leftovers, but store brand products.', 'Mon Dec 28 18:24:43 2020'),
    ('5 Easy Cooking Tips', 3, '1. When experimenting with seasonings in a recipe, mix them dry in a cup and smell it. If it smells good, then it''ll probably taste good.
    2. Add some water when microwaving leftovers
    3. Start small with seasonings
    4. Cook
    5. Blah', 'Tues Dec 1 12:54:31 2020'),
    ('Cooking Basics for Beginners', 1, 'Go easy on seasonings and salt, if the inside of cooked chicken is pink or its juices aren''t clear then it needs to be cooked longer, cooked ground beef needs to be brown in order to be safe to eat', 'Tues Jan 5 08:28:28 2021'),
    ('Winter Seasoning Guide', 2, 'Rosemary, sage, thyme, cinnamon, nutmeg', 'Tues Dec 15 11:56:48 2020'),
    ('Title6', 3, 'Post 6 content', 'Tues Jan 5 14:22:39 2021'),
    ('Title7', 3, 'Post 7 content', 'Sat Jan 2 16:22:39 2021'),
    ('Title8', 3, 'Post 8 content', 'Wed Jan 6 12:22:39 2021'),
    ('Title9', 3, 'Post 9 content', 'Tues Dec 15 11:22:39 2020'),
    ('Title10', 3, 'Post 10 content', 'Tues Dec 15 19:22:39 2020'),
    ('Title11', 3, 'Post 11 content', 'Mon Jan 4 18:22:39 2021');

INSERT INTO comments (content, creator_id, post_id, last_edited)
  VALUES
    ('These are all great lessons!', 1, 1, 'Sat Dec 19 07:37:16 2020'),
    ('I can''t wait to try these seasoning combinations in my next meal!', 1, 5, 'Thurs Dec 17 08:37:52 2020'),
    ('I wish I knew these when I started learning to cook!', 4, 4, 'Tues Jan 5 08:28:28 2021'),
    ('Great advice!  This''ll help me save so much money feeding my three teenagers!', 4, 2, 'Thurs Dec 31 09:24:43 2020'),
    ('What an insightful post', 2, 7, 'Fri Jan 1 10:31:39 2021'),
    ('I know, right?', 3, 1, 'Sat Dec 19 08:37:16 2020'),
    ('It''s amazing what you can learn from cooking', 4, 1, 'Sun Dec 20 10:43:16 2020'),
    ('Huh, I never thought about it this way', 5, 1, 'Thurs Dec 17 20:12:16 2020'),
    ('Comment9', 6, 1, 'Sat Dec 12 07:07:07 2020'),
    ('Comment10', 7, 1, 'Sat Dec 19 15:22:16 2020'),
    ('Comment11', 8, 1, 'Tues Dec 15 17:18:19 2020'),
    ('Comment12', 5, 1, 'Fri Jan 1 12:13:14 2021'),
    ('Comment13', 5, 1, 'Sat Jan 2 13:14:15 2021'),
    ('Comment14', 5, 1, 'Tues Jan 5 06:07:08 2021'),
    ('Comment15', 5, 1, 'Sun Jan 3 20:21:22 2021'),
    ('Comment16', 5, 2, 'Mon Jan 4 20:21:22 2021'),
    ('Comment17', 5, 3, 'Tues Jan 5 20:21:22 2021'),
    ('Comment18', 5, 4, 'Wed Jan 6 20:21:22 2021'),
    ('Comment19', 5, 5, 'Thurs Jan 7 20:21:22 2021'),
    ('Comment20', 5, 6, 'Fri Jan 8 20:21:22 2021'),
    ('Comment21', 5, 7, 'Sat Jan 9 20:21:22 2021');