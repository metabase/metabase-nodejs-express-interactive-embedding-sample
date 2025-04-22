"use strict";

const METABASE_SITE_URL =
    process.env.METABASE_SITE_URL || "http://localhost:3000";
const METABASE_JWT_SHARED_SECRET =
    process.env.METABASE_JWT_SHARED_SECRET ||
    "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const METABASE_DASHBOARD_PATH =
    process.env.METABASE_DASHBOARD_PATH || "/dashboard/12";
const mods = "logo=false";

/**
 * Module dependencies.
 */

const express = require("express");
const hash = require("pbkdf2-password")();
const path = require("path");
const session = require("express-session");
const jwt = require("jsonwebtoken");

var app = (module.exports = express());

// config

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// middleware

app.use(express.urlencoded({ extended: false }));
app.use(
    session({
        resave: false, // don't save session if unmodified
        saveUninitialized: false, // don't create session until something stored
        secret: "shhhh, very secret",
    })
);

// Session-persisted message middleware

app.use(function (req, res, next) {
    var err = req.session.error;
    var msg = req.session.success;
    delete req.session.error;
    delete req.session.success;
    res.locals.message = "";
    if (err) res.locals.message = '<p class="msg error">' + err + "</p>";
    if (msg) res.locals.message = '<p class="msg success">' + msg + "</p>";
    next();
});

// dummy database

var users = [
    {
        firstName: "Admin",
        lastName: "Super",
        email: "admin@mb.com",
        plan: "Admin"
    },
    {
        firstName: "Donald",
        lastName: "McDonald",
        email: "d@mc.com",
        tenant: "McDonalds",
        plan: "Pro",
        slug: "CA"
    },
    {
        firstName: "Tio",
        lastName: "Taco",
        email: "tio@tacobell.com",
        tenant: "Taco Bell",
        plan: "Starter",
        slug: "NY"
    },
    {
        firstName: "Maria",
        lastName: "Enchillada",
        email: "maria@enchillada.com",
        tenant: "Taco Bell",
        plan: "Starter",
        slug: "NY"
    },
];

// when you create a user, generate a salt
// and hash the password ('foobar' is the pass here)

hash({ password: "foobar" }, function (err, pass, salt, hash) {
    if (err) throw err;
    // store the salt & hash in the "db"
    users.forEach((element) => {
        element.salt = salt;
        element.hash = hash;
    });
});

function findUserbyEmail(email) {
    var u = users.find((u) => u.email === email);
    return u;
}

// Authenticate using our plain-object database of doom!

function authenticate(email, pass, fn) {
    if (!module.parent) console.log("authenticating %s:%s", email, pass);
    var user = findUserbyEmail(email);
    // query the db for the given email
    if (!user) return fn(null, null);
    // apply the same algorithm to the POSTed password, applying
    // the hash against the pass / salt, if there is a match we
    // found the user
    hash({ password: pass, salt: user.salt }, function (err, pass, salt, hash) {
        if (err) return fn(err);
        if (hash === user.hash) return fn(null, user);
        fn(null, null);
    });
}

function restrict(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.returnTo = req.originalUrl;
        req.session.error = "Access denied!";
        res.redirect("/login");
    }
}

const signUserToken = (user) =>
    jwt.sign(
        {
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            slug: user.slug,
            groups: [user.plan, user.tenant],
            exp: Math.round(Date.now() / 1000) + 60 * 10, // 10 minute expiration
        },
        METABASE_JWT_SHARED_SECRET
    );

app.get("/", function (req, res) {
    res.redirect("/analytics");
});

app.get("/analytics", restrict, function (req, res) {
    const userPlan = req.session.user.plan;
    const userEmail = req.session.user.email;
    const isMcDonalds = userEmail.endsWith('@mc.com');
    
    // Get resource type and ID from query parameters
    const resourceType = req.query.resource || 'dashboard';
    const resourceId = req.query.id || req.query.dashboard || 'home';
    
    let isAuthorized = true;
    let redirectToHome = false;
    
    // Validate access based on plan and organization
    if (resourceType === 'dashboard' && resourceId === '15' && userPlan === 'Starter') {
        // Starter users can't access Pro dashboard
        isAuthorized = false;
    } else if (resourceType === 'question' && resourceId === '139' && !isMcDonalds) {
        // Only McDonald's users can access question 139
        isAuthorized = false;
    }
    
    // If not authorized, redirect to home
    if (!isAuthorized) {
        redirectToHome = true;
    }
    
    let mods;
    if (resourceId === 'home' || redirectToHome) {
        // Enable navigation for home page but keep search disabled
        mods = "action_buttons=true&breadcrumbs=true&side_nav=true&top_nav=true&search=false&header=true";
    } else {
        // Disable navigation for dashboards and questions
        mods = "action_buttons=false&breadcrumbs=false&side_nav=false&top_nav=false&search=false&header=false";
    }
    
    // Build the return_to URL based on resource type and redirection status
    let returnTo;
    if (redirectToHome || resourceId === 'home') {
        returnTo = '/';
    } else if (resourceType === 'dashboard') {
        returnTo = `/dashboard/${resourceId}`;
    } else if (resourceType === 'question') {
        returnTo = `/question/${resourceId}`;
    } else {
        returnTo = '/';
    }
    
    const iframeUrl = `/sso/metabase?return_to=${returnTo}&${mods}`;
    
    res.render("analytics", { 
        iframeUrl: iframeUrl,
        dashboardId: resourceType === 'dashboard' ? resourceId : null,
        resourceType: redirectToHome ? 'dashboard' : resourceType,
        resourceId: redirectToHome ? 'home' : resourceId,
        userPlan: userPlan,
        isMcDonalds: isMcDonalds
    });
});

app.get("/logout", function (req, res) {
  const mbLogoutUrl = new URL("/auth/logout", METABASE_SITE_URL);
  
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function () {
    // sign user out of Metabase by loading /auth/logout in a hidden iframe
    res.send(`
      You have been logged out. <a href="/login">Log in</a>
      <iframe src="${mbLogoutUrl}" hidden></iframe>`);
  });
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.post("/login", function (req, res, next) {
    authenticate(req.body.email, req.body.password, function (err, user) {
        if (err) return next(err);
        if (user) {
            // Regenerate session when signing in
            // to prevent fixation
            var returnTo = req.session.returnTo;
            req.session.regenerate(function () {
                // Store the user's primary key
                // in the session store to be retrieved,
                // or in this case the entire user object
                req.session.user = user;
                req.session.success =
                    "Authenticated as " +
                    user.firstName +
                    "" +
                    user.lastName +
                    ' click to <a href="/logout">logout</a>. ' +
                    ' click to access <a href="/analytics">analytics</a>';
                res.redirect(returnTo || "/");
                delete req.session.returnTo;
            });
        } else {
            req.session.error =
                "Authentication failed, please check your " +
                " email and password." +
                ' (use "rene@example.com" or "cecilia@example.com" and password "foobar")';
            res.redirect("/login");
        }
    });
});

app.get("/sso/metabase", restrict, (req, res) => {
    const ssoUrl = new URL("/auth/sso", METABASE_SITE_URL);
    ssoUrl.searchParams.set("jwt", signUserToken(req.session.user));
    
    // Get the return_to path and any additional parameters
    const returnTo = req.query.return_to ?? "/";
    const additionalParams = new URLSearchParams(req.query);
    additionalParams.delete("return_to"); // Remove return_to as we'll handle it separately
    
    // Combine return_to with additional parameters
    const fullReturnTo = `${returnTo}${returnTo.includes('?') ? '&' : '?'}${additionalParams.toString()}`;
    ssoUrl.searchParams.set("return_to", fullReturnTo);
  
    res.redirect(ssoUrl);
});

const PORT =
    process.env.PORT || 9090;
if (!module.parent) {
    app.listen(PORT);
    console.log(`Express started serving on port ${PORT}`);
}
