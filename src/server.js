const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const epilogue = require('epilogue'); // to create the dynamic REST resource for our Post model
const OktaJwtVerifier = require('@okta/jwt-verifier');
const mysql = require('mysql');

const oktaJwtVerifier = new OktaJwtVerifier({
  clientId: '0oaj1pljm9eLXDqWy0h7',
  issuer: 'https://dev-499317.oktapreview.com/oauth2/default',
});

let app = express();
app.use(cors());
app.use(bodyParser.json());

// verify JWT token middleware
app.use((req, res, next) => {
  // require every request to have an authorization header
  if (!req.headers.authorization) {
    return next(new Error('Authorization header is required'));
  }
  const parts = req.headers.authorization.trim().split(' ');
  const accessToken = parts.pop();
  oktaJwtVerifier.verifyAccessToken(accessToken)
    .then(jwt => {
      req.user = {
        uid: jwt.claims.uid,
        email: jwt.claims.sub,
      };
      next();
    })
    .catch(next); // jwt did not verify!
});

// For ease of this tutorial, we are going to use SQLite to limit dependencies
const database = new Sequelize('wafloski_test1name', 'wafloski_test1name', 'Test1pass', {
  host: 'sql.wafloski.nazwa.pl',
  port: 3306,
  dialect: 'mysql',
});

// Define our Post model
// id is added by sequelize automatically
const Post = database.define('posts', {
  title: Sequelize.STRING,
  body: Sequelize.TEXT,
  createdAt: {
    field: 'created_at',
    type: Sequelize.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  },
  updatedAt: {
    field: 'updated_at',
    type: Sequelize.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  },
});

epilogue.initialize({
  app: app,
  sequelize: database,
});

const userResource = epilogue.resource({
  model: Post,
  endpoints: ['/posts', '/posts/:id'],
});

// Resets the database and launches the express app on :8081
database
  .sync({ force: true })
  .then(() => {
    app.listen(8081, () => {
      console.log('listening to port localhost:8081');
    });
  });