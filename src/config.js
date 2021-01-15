module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'localhost',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://kindred@localhost/cooking-blog',
  SALT_ROUNDS: process.env.SALT_ROUNDS ? parseInt(process.env.SALT_ROUNDS) : 10,
  PRIVATE_KEY: process.env.PRIVATE_KEY
};