import dotenv from 'dotenv';

// loads environment variables from .env into process.env. Makes our app configurable.
dotenv.config();

// we are running on development
const env = process.env.NODE_ENV || 'development';

module.exports = {
    dialect: process.env.DB_DIALECT,
    storage: process.env.DB_STORAGE,
    define: {
        underscore: true,
      },
      logging: false,
};