import express from "express";
import type { PassportStatic } from "passport";
// @ts-expect-error
import drupalHash from "drupal-hash";
import { pool } from "../db.ts";
import { throwtonext } from "../utils.ts";
import * as t from "io-ts";

function get_router(passport: PassportStatic) {
  const router = express.Router();

  router.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/login",
      failureFlash: true,
    }),
  );
  router.get("/login", (req, res) => {
    res.render("login", { message: req.flash("error") });
  });

  router.use("/", (req, res, next) => {
    res.locals.user = req.user;
    next();
  });

  router.get("/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  router.get("/new_account", (req, res) => {
    res.render("new_account", { errors: [] });
  });

  const newAccBody = t.type({
    username: t.string,
    email: t.string,
    password: t.array(t.string),
  });
  router.post(
    "/new_account",
    throwtonext(async (req, res, next) => {
      const b = newAccBody.decode(req.body);
      if (b._tag === "Left" || b.right.password.length != 2) {
        next();
        return;
      }
      const body = b.right;
      const errors: string[] = [];

      if (!body.username.match(/^[A-Za-z0-9-_]+$/))
        errors.push(
          "Only unaccented letters, numbers, dashes (-) and underscores \
                (_) are allowed in username.",
        );

      if (!body.email.match(/^.+@.+\..+$/)) errors.push("Invalid email.");

      if (body.password[0] != body.password[1])
        errors.push("The passwords don' match.");

      if (body.password[0].length < 4)
        errors.push("The password must be at least four characters.");

      if (errors.length > 0) {
        res.render("new_account", { errors });
        return;
      }

      try {
        const { rows } = await pool.query(
          "insert into users(name,password,email) values($1,$2,$3) returning *",
          [
            body.username,
            drupalHash.hashPassword(body.password[0]),
            body.email,
          ],
        );
        req.login(rows[0], (cb) => res.redirect("/user/" + body.username));
      } catch (error: any) {
        if (
          error.constraint == "user_name_uniqueci_idx" ||
          error.constraint == "users_pkey"
        ) {
          errors.push("User name already exists.");
          res.render("new_account", { errors });
        } else throw error;
      }
    }),
  );

  return router;
}

export default get_router;
