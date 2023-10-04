'use strict'

const METABASE_SITE_URL = process.env.METABASE_SITE_URL || "http://localhost:3000";
const METABASE_JWT_SHARED_SECRET =
  process.env.METABASE_JWT_SHARED_SECRET ||
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const mods = 'logo=false&top_nav=false&search=false&new_button=false&side_nav=false&header=false&additional_info=false&breadcrumbs=false&action_buttons=false'
/**
 * Module dependencies.
 */

const express = require('express')
const hash = require('pbkdf2-password')()
const path = require('path');
const session = require('express-session');
const jwt = require("jsonwebtoken");
const url = require("url");

var app = module.exports = express();

// config

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// middleware

app.use(express.urlencoded({ extended: false }))
app.use(session({
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  secret: 'shhhh, very secret'
}));

// Session-persisted message middleware

app.use(function(req, res, next){
  var err = req.session.error;
  var msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = '';
  if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
  if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
  next();
});

// dummy database

var users = [
  { firstName: 'Rene', lastName: 'Mueller', email: 'rene@example.com', accountId: 28, accountName: 'Customer-Acme' },
  { firstName: 'Cecilia', lastName: 'Stark', email: 'cecilia@example.com', accountId: 132, accountName: 'Customer-Fake'}
];

// when you create a user, generate a salt
// and hash the password ('foobar' is the pass here)

hash({ password: 'foobar' }, function (err, pass, salt, hash) {
  if (err) throw err;
  // store the salt & hash in the "db"
  users.forEach((element) => {
     element.salt = salt;
     element.hash = hash;
    });
});

function findUserbyEmail(email) {
  var u = users.find(u => u.email === email);
  return u;
}

// Authenticate using our plain-object database of doom!

function authenticate(email, pass, fn) {
  if (!module.parent) console.log('authenticating %s:%s', email, pass);
  var user = findUserbyEmail(email);
  // query the db for the given email
  if (!user) return fn(null, null)
  // apply the same algorithm to the POSTed password, applying
  // the hash against the pass / salt, if there is a match we
  // found the user
  hash({ password: pass, salt: user.salt }, function (err, pass, salt, hash) {
    if (err) return fn(err);
    if (hash === user.hash) return fn(null, user)
    fn(null, null)
  });
}

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.returnTo = req.originalUrl;
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

const signUserToken = user =>
  jwt.sign(
    {
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      account_id: user.accountId,
      groups: [user.accountName],
      exp: Math.round(Date.now() / 1000) + 60 * 10, // 10 minute expiration
    },
    METABASE_JWT_SHARED_SECRET
  );

app.get('/', function(req, res){
  res.redirect('/analytics');
});

app.get('/analytics', restrict, function(req, res){
// replace ID "1" with the ID number in the path of your dashboard in Metabase.
const METABASE_DASHBOARD_PATH = "/dashboard/1"
  var iframeUrl = `/sso/metabase?return_to=${METABASE_DASHBOARD_PATH}`;
  res.send(`<iframe src="${iframeUrl}" frameborder="0" width="1280" height="1000" allowtransparency></iframe>`);
});

app.get('/logout', function(req, res){
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function(){
    res.redirect('/');
  });
});

app.get('/login', function(req, res){
  res.render('login');
});

app.post('/login', function (req, res, next) {
  authenticate(req.body.email, req.body.password, function(err, user){
    if (err) return next(err)
    if (user) {
      // Regenerate session when signing in
      // to prevent fixation
      var returnTo = req.session.returnTo;
      req.session.regenerate(function(){
        // Store the user's primary key
        // in the session store to be retrieved,
        // or in this case the entire user object
        req.session.user = user;
        req.session.success = 'Authenticated as ' + user.firstName + '' + user.lastName
          + ' click to <a href="/logout">logout</a>. '
          + ' click to access <a href="/analytics">analytics</a>';
        res.redirect(returnTo || '/');
        delete req.session.returnTo;
      });
    } else {
      req.session.error = 'Authentication failed, please check your '
        + ' email and password.'
        + ' (use "rene@example.com" or "cecilia@example.com" and password "foobar")';
      res.redirect('/login');
    }
  });
});

app.get("/sso/metabase", restrict, (req, res) => {
  res.redirect(
    url.format({
      pathname: `${METABASE_SITE_URL}/auth/sso`,
      query: {
        jwt: signUserToken(req.session.user),
        return_to: `${req.query.return_to || '/'}?${mods}`
      }
    })
  );
});

const PORT = 8080;
if (!module.parent) {
  app.listen(PORT);
  console.log(`Express started serving on port ${PORT}`);
}
