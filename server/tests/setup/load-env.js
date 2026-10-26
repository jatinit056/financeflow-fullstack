import dotenv from 'dotenv';

process.env.NODE_ENV = 'test';
// Local runs read .env.test; CI provides the same variables directly.
dotenv.config({ path: '.env.test', quiet: true });
