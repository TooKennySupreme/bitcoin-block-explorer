// passport.js

var mysql = require("mysql");
var bcrypt = require("bcrypt-nodejs");

var database = mysql.createConnection({
  'connection': {
      'host': 'localhost',
      'user': 'root',
      'password': 'password'
  },
'database_name': 'node',
  'users_table': 'bitcoinusers'
});

var LocalStrategy = require("passport-local").Strategy;

module.exports = (passport) => {

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    database.query("SELECT * FROM bitcoinusers WHERE id = ? ", [id], (
      err,
      rows
    ) => {
      done(err, rows[0]);
    });
  });

  //local signup strategy
  passport.use(
    "local-signup",
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
        passReqToCallback: true 
      },
      (req, username, password, done) => {
        database.query(
          "SELECT * FROM bitcoinusers WHERE username = ?",
          [username],
          (err, rows) => {
            if (err) {
              return done(err);
            }

            if (rows.length) {
              return done(null, false);
            } else {
              var newUser = {
                username: username,
                password: bcrypt.hashSync(password, null, null)
              };

              var insertQuery =
                "INSERT INTO bitcoinusers (username, password) values (?,?)";

              database.query(
                insertQuery,
                [newUser.username, newUser.password],
                (err, rows) => {
                  newUser.id = rows.insertId;

                  return done(null, newUser);
                }
              );
            }
          }
        );
      }
    )
  );

  //local login strategy
  passport.use(
    "local-login",
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      (req, username, password, done) => {
        database.query(
          "SELECT * FROM bitcoinusers WHERE username = ?",
          [username],
          (err, rows) => {
            if (err) {
              return done(err);
            }

            if (!rows.length) {
              return done(
                null,
                false,
              ); 
            }

            if (!bcrypt.compareSync(password, rows[0].password))
              return done(
                null,
                false,
              ); 

            return done(null, rows[0]);
          }
        );
      }
    )
  );
};







