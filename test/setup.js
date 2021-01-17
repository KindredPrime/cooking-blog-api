require('dotenv').config();
const { expect } = require('chai');
const supertest = require('supertest');
const knex = require('knex');
const jwt = require('jsonwebtoken');

// Create a login testToken for the first user in testUsers
const testToken = jwt.sign({ id: 1 }, process.env.SECRET_KEY);

global.expect = expect;
global.supertest = supertest;
global.knex = knex;
global.testToken = testToken;