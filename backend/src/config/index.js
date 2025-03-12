import dotenv from 'dotenv';

dotenv.config();

const env = process.env.NODE_ENV || 'development';

module.exports = {
    dialect: process.env.DB_DIALECT,
    storage: process.env.DB_STORAGE,
    define: {
        underscore: true,
      },
      logging: false,
};