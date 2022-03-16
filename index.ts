// Entry Point for the totoz server

import express = require("express");
import path = require("path");
import morgan = require("morgan");
import session = require("express-session");
import bodyParser = require("body-parser");
import passport = require("passport");
import localStrategy = require("passport-local");
import flash = require("connect-flash");
import common_routes from "./routes/common";
import auth_routes from "./routes/auth";
import router from "./routes/routes";
import pgSession from "connect-pg-simple";
import { pool } from "./db";
// tslint:disable-next-line:no-var-requires
const drupalHash = require("drupal-hash");

// Misc. functions

// Makes an absolute path from a path relative to the project folder
const absPath = (relPath: string) => path.join(__dirname, relPath);

// Environment variables
//   NOIMAGES : if true, serve a default image for the totozes. Useful for a
//              dev. environment without the full totoz set.
const port = +(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "127.0.0.1";
const noimages = process.env.NOIMAGES ? true : false;
const session_secret = process.env.SECRET || "abcd";
if (!process.env.SECRET)
  console.warn("WARNING: the SECRET environment variable is not set");
const cookie_domain = process.env.COOKIEDOMAIN || undefined;

// Setup and run app
const app = express();

app.set("view engine", "pug");
app.set("views", absPath("../views"));

// Middleware
if (noimages)
  app.get(/\.gif$/, (req, res) => res.sendFile(absPath("../static/uxam.gif")));

app.use(express.static(absPath("../static")));

app.use(morgan("tiny"));

app.use(
  session({
    secret: session_secret,
    saveUninitialized: false,
    cookie: {
      domain: cookie_domain,
      maxAge: 1000 * 3600 * 24 * 365 * 3,
      sameSite: "strict",
    },
    store: new (pgSession(session))({ pool }),
    resave: false,
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new localStrategy.Strategy(async (username, password, done) => {
    const user = await pool.query(
      "select * from users where lower(name) = lower($1)",
      [username]
    );

    if (
      user.rowCount == 1 &&
      drupalHash.checkPassword(password, user.rows[0].password)
    )
      done(null, user.rows[0]);
    else done(null, false, { message: "Wrong username or password" });
  })
);

declare global {
  namespace Express {
    interface User {
      name: string;
    }
  }
}
passport.serializeUser((user, done) => {
  done(null, user.name);
});
passport.deserializeUser(async (name, done) => {
  const user = await pool.query("select * from users where name = $1", [name]);

  if (user.rowCount == 1) done(null, user.rows[0]);
  else done("User does not exist");
});

app.use(flash());

// Workarounds for coincoins that use "bad" urls
app.use((req, res, next) => {
  const url = decodeURIComponent(req.url);
  // linuxfr.org requests '/img/$i.gif' instead of '/img/$i'
  if (url.match(/^\/img\/[A-Za-z0-9-_ :]+\.gif$/))
    res.redirect(301, req.url.substr(0, req.url.length - 4));
  // Olcc requests //img/$i
  else if (url.match(/^\/\/img\/[A-Za-z0-9-_ :]+$/))
    res.redirect(301, req.url.substr(1));
  else next();
});

app.use("/", common_routes);
app.use("/", auth_routes(passport));
app.use("/", router);

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.log("ERROR:", req.url, req.body, req.session, err);
    res.sendStatus(500);
  }
);

app.listen(port, hostname);
