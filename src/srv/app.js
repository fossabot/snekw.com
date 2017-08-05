/**
 * Copyright (c) 2017 Ilkka Kuosmanen
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
 * THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
'use strict';
const express = require('express');
const debug = require('debug')('App');
const logger = require('morgan');
const bodyParser = require('body-parser');
const config = require('../helpers/configStub')('main');
const session = require('express-session');
const MongoSessionStore = require('connect-mongo')(session);
const passport = require('passport');
const mongoose = require('mongoose');
const auth = require('../lib/auth');

// Application start
debug('App start');
let app = express();

// Database setup - TODO
debug('Db setup started');
require('../db/controller');

// Express middleware - TODO
debug('Express middleware');
app.use(bodyParser.json());

// Max age of 7 days
const sessionCookieTTL = 1000 * 60 * 60 * 24 * 7;

let sessionOpts = {
  secret: config.server.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: sessionCookieTTL
  }
};

if (config.DEV === true) {
  sessionOpts.store = new MongoSessionStore({
    mongooseConnection: mongoose.connection,
    touchAfter: 24 * 3600 // Re-save data only once per 24h
  });
}

app.use(session(sessionOpts));

// Auth
auth.setupPassport();
app.use(passport.initialize());
app.use(passport.session());

// Logger
if (config.DEV === true) {
  app.use(logger('dev'));
} else {
  app.use(logger('combined'));
}

app.use(express.static('./static'));
// app.use(express.static('./GENERATED'));

// Routing
debug('Routing');
require('./routes')(app);
app.use('', auth.getRoutes());

// Error handler
function errorHandler (err, req, res, next) {
  let status = err.status || 500;
  res.status(status);
  res.json({
    message: {
      error: {
        status: status,
        stack: err.stack
      }
    }
  });
}

app.use(errorHandler);

module.exports = app;