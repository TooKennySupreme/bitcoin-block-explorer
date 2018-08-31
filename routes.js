// app/routes.js

module.exports = (app, passport) => {
  var request = require("request");
  var rp = require("request-promise");
  var numeral = require("numeral");
  const BitcoinRpc = require("bitcoin-rpc-promise");
  let btc = new BitcoinRpc("-");

  // gets price for navbar, runs for all http requests
  app.use((req, res, next) => {
    request(
      {
        uri:
          "https://api.cryptowat.ch/markets/bitmex/btcusd-perpetual-futures/summary",
        method: "GET",
        json: true
      },
      (api, response, body) => {
        res.locals.bitmexPrice = body.result;
        next();
      }
    );
  });

  //  home page
  app.get("/", (req, res) => {
    // get info to be displayed
    btc.getBlockchainInfo().then(result => {
      result.blocks = numeral(result.blocks).format("0,0");
      result.difficulty = numeral(result.difficulty).format("0,0");
      result.size_on_disk = numeral(result.size_on_disk / 1000000000).format(
        "0,0.00"
      );
      result.verificationprogress = numeral(
        result.verificationprogress * 100
      ).format("0,0.00");

      btc.getBlock(result.bestblockhash).then(result2 => {
        var blockTime = result2.time;
        var currentTime = Math.round(new Date() / 1000);
        var minsSinceLastBlock = (currentTime - blockTime) / 60;
        result2.time = Math.round(minsSinceLastBlock);

        btc.getMempoolInfo().then(result3 => {
          result3.size = numeral(result3.size).format("0,0");

          btc.getMiningInfo().then(result4 => {
            result4.networkhashps = numeral(result4.networkhashps).format(
              "0,0"
            );

            btc.getNetworkInfo().then(result5 => {
              btc.getNetTotals().then(result6 => {
                result6.totalbytesrecv = numeral(
                  result6.totalbytesrecv / 1000000000
                ).format("0,0.00");
                result6.totalbytessent = numeral(
                  result6.totalbytessent / 1000000000
                ).format("0,0.00");
                res.render("home.ejs", {
                  price: res.locals.bitmexPrice.price.last,
                  blockchainInfo: result,
                  blockInfo: result2,
                  mempoolInfo: result3,
                  miningInfo: result4,
                  networkInfo: result5,
                  netTotals: result6
                });
              });
            });
          });
        });
      });
    });
  });

  // handles search queries
  app.post("/search", (req, res, next) => {
    // check if block hash, tx id or neither was entered
    btc.getBlock(req.body.input).then(
      result => {
        var hash = req.body.input;
        var searchString = "/blockhash/" + hash + "/0";
        res.redirect(searchString);
      },
      error => {
        btc.getRawTransaction(req.body.input, true).then(
          result => {
            var txid = req.body.input;
            var searchString = "/transactionid/" + txid;
            res.redirect(searchString);
          },
          error => {
            res.render("errorpage.ejs", {
              price: res.locals.bitmexPrice.price.last
            });
          }
        );
      }
    );
  });

  // block hash page
  app.get("/blockhash/:hash/:txns", (req, res, next) => {
    var start = parseInt(req.params.txns);
    var end = parseInt(req.params.txns) + 20;
    var numberOfTxns = [start, end];

    btc.getBlock(req.params.hash).then(result => {
      var seconds = result.time / 1000;
      var dateOfBlockCreation = new Date(Date.now() - seconds);
      var options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true
      };
      result.time = dateOfBlockCreation.toLocaleString("en-US", options);

      result.size = numeral(result.size / 1000000).format("0,0.000");
      result.height = numeral(result.height).format("0,0");
      result.weight = numeral(result.weight).format("0,0");
      result.difficulty = numeral(result.difficulty).format("0,0");

      res.render("blockhash.ejs", {
        price: res.locals.bitmexPrice.price.last,
        blockHashInfo: result,
        numberOfTxns: numberOfTxns
      });
    });
  });

  // transaction id page
  app.get("/transactionid/:txnid", (req, res, next) => {
    btc.getRawTransaction(req.params.txnid, true).then(result => {
      var totalOutput = 0;
      var outputAddresses = result.vout;
      for (let i = 0; i < outputAddresses.length; i++) {
        totalOutput += outputAddresses[i].value;
      }

      var seconds = result.time / 1000;
      var dateOfBlockCreation = new Date(Date.now() - seconds);
      var options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true
      };
      result.time = dateOfBlockCreation.toLocaleString("en-US", options);

      res.render("transactionid.ejs", {
        price: res.locals.bitmexPrice.price.last,
        txnID: result,
        totalOutput: totalOutput
      });
    });
  });

  // verify message page
  app.get("/verifymessage", f(req, res, next) => {
    var result = false;
    res.render("verifymessage.ejs", {
      price: res.locals.bitmexPrice.price.last,
      result: result,
      inputEntered: false
    });
  });

  // hnadles verify requests
  app.post("/verifymessage", (req, res, next) => {
    var input = req.body;
    btc.verifyMessage(input.address, input.signature, input.message).then(
      result => {
        res.render("verifymessage.ejs", {
          price: res.locals.bitmexPrice.price.last,
          input: input,
          result: result,
          inputEntered: true
        });
      },
      error => {
        res.render("verifymessage.ejs", {
          price: res.locals.bitmexPrice.price.last,
          input: input,
          result: false,
          inputEntered: true
        });
      }
    );
  });

  // login page
  app.get("/login", (req, res) => {
    if (req.isAuthenticated()) {
      res.render("home.ejs", { message: "Already signed in." });
    } else {
      res.render("home.ejs", { message: "Welcome" });
    }
  });

  app.post(
    "/login",
    passport.authenticate("local-login", {
      successRedirect: "/profile", //
      failureRedirect: "/login" //
    }),
    (req, res) => {
      if (req.body.rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 3600 * 1000;
      } else {
        req.session.cookie.expires = false;
      }
      res.redirect("/");
    }
  );

  // signup page
  app.get("/signup", (req, res) => {
    if (req.isAuthenticated()) {
      res.render("index.ejs", { message: "Already signed in." });
    } else {
      res.render("index.ejs", { message: "Account created." });
    }
  });

  // process the signup form
  app.post(
    "/signup",
    passport.authenticate("local-signup", {
      successRedirect: "/profile", // redirect to the secure profile section
      failureRedirect: "/signup" // redirect back to the signup page if there is an error
    })
  );

  // profile page
  app.get("/profile", (req, res) => {
    if (req.isAuthenticated()) {
      res.render("profile.ejs", {
        user: req.user
      });
    } else {
      res.render("home.ejs", {
        message: "Create an account to get a profile."
      });
    }
  });

  // log out
  app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
  });

  //  price page. gets price from highest volume markets and stores them in an object
  app.use("/price", (req, res, next) => {
    res.locals.priceObject = {
      cad: { price: 0, name: "QuadrigaCX", change24hr: 0, volume: 0 },
      usd: [
        { price: 0, name: "BitMEX", change24hr: 0, volume: 0 },
        { price: 0, name: "Bitfinex", change24hr: 0, volume: 0 },
        { price: 0, name: "Binance", change24hr: 0, volume: 0 },
        { price: 0, name: "Coinbase Pro", change24hr: 0, volume: 0 },
        { price: 0, name: "Gemini", change24hr: 0, volume: 0 }
      ],
      cny: [
        { price: 0, name: "OKex", change24hr: 0, volume: 0 },
        { price: 0, name: "Huobi", change24hr: 0, volume: 0 }
      ],
      jpy: [
        { price: 0, name: "bitFlyer", change24hr: 0, volume: 0 },
        { price: 0, name: "Quoine", change24hr: 0, volume: 0 }
      ],
      eur: [
        { price: 0, name: "Bitstamp", change24hr: 0, volume: 0 },
        { price: 0, name: "Kraken", change24hr: 0, volume: 0 }
      ],
      krw: { price: 0, name: "Bithumb", change24hr: 0, volume: 0 }
    };

    // add bitmex price as first element in usd array
    res.locals.priceObject.usd[0].price = numeral(
      res.locals.bitmexPrice.price.last
    ).format("0,0.00");
    res.locals.priceObject.usd[0].change24hr =
      res.locals.bitmexPrice.price.change.percentage * 100;
    res.locals.priceObject.usd[0].volume = numeral(
      res.locals.bitmexPrice.volume
    ).format("0,0.00");

    var options = {
      uri: "https://api.cryptowat.ch/markets/bitfinex/btcusd/summary",
      json: true
    };

    //request-promise chain to get all price data
    rp.get(options)
      .then(
        summary => {
          // add bitfinex
          res.locals.priceObject.usd[1].price = numeral(
            summary.result.price.last
          ).format("0,0.00");
          res.locals.priceObject.usd[1].change24hr =
            summary.result.price.change.percentage * 100;
          res.locals.priceObject.usd[1].volume = numeral(
            summary.result.volume
          ).format("0,0.00");
          var options = {
            uri: "https://api.cryptowat.ch/markets/quadriga/btccad/summary",
            json: true
          };
          return rp.get(options); // executes next request-promise call
        },
        error => {
          console.log("error: ", error.message);
        }
      )
      .then(
        summary => {
          // add quadriga
          res.locals.priceObject.cad.price = numeral(
            summary.result.price.last
          ).format("0,0.00");
          res.locals.priceObject.cad.change24hr =
            summary.result.price.change.percentage * 100;
          res.locals.priceObject.cad.volume = numeral(
            summary.result.volume
          ).format("0,0.00");
          var options = {
            uri: "https://api.cryptowat.ch/markets/binance/btcusdt/summary",
            json: true
          };
          return rp.get(options);
        },
        error => {
          console.log("error: ", error.message);
        }
      )
      .then(
        summary => {
          // add binance
          res.locals.priceObject.usd[2].price = numeral(
            summary.result.price.last
          ).format("0,0.00");
          res.locals.priceObject.usd[2].change24hr =
            summary.result.price.change.percentage * 100;
          res.locals.priceObject.usd[2].volume = numeral(
            summary.result.volume
          ).format("0,0.00");
          var options = {
            uri: "https://api.cryptowat.ch/markets/gdax/btcusd/summary",
            json: true
          };
          return rp.get(options);
        },
        error => {
          console.log("error: ", error.message);
        }
      )
      .then(
        summary => {
          // add gdax
          res.locals.priceObject.usd[3].price = numeral(
            summary.result.price.last
          ).format("0,0.00");
          res.locals.priceObject.usd[3].change24hr =
            summary.result.price.change.percentage * 100;
          res.locals.priceObject.usd[3].volume = numeral(
            summary.result.volume
          ).format("0,0.00");
          var options = {
            uri: "https://api.cryptowat.ch/markets/gemini/btcusd/summary",
            json: true
          };
          return rp.get(options);
        },
        error => {
          console.log("error: ", error.message);
        }
      )
      .then(
        summary => {
          // add gemini
          res.locals.priceObject.usd[4].price = numeral(
            summary.result.price.last
          ).format("0,0.00");
          res.locals.priceObject.usd[4].change24hr =
            summary.result.price.change.percentage * 100;
          res.locals.priceObject.usd[4].volume = numeral(
            summary.result.volume
          ).format("0,0.00");
          var options = {
            uri: "https://api.cryptowat.ch/markets/quoine/btccny/summary",
            json: true
          };
          return rp.get(options);
        },
        error => {
          console.log("error: ", error.message);
        }
      )
      .then(
        summary => {
          // add okex
          res.locals.priceObject.cny[0].price = numeral(
            summary.result.price.last
          ).format("0,0.00");
          res.locals.priceObject.cny[0].change24hr =
            summary.result.price.change.percentage * 100;
          res.locals.priceObject.cny[0].volume = numeral(
            summary.result.volume * 500
          ).format("0,0.00");
          var options = {
            uri: "https://api.cryptowat.ch/markets/huobi/btcusdt/summary",
            json: true
          };
          return rp.get(options);
        },
        error => {
          console.log("error: ", error.message);
        }
      )
      .then(
        summary => {
          // add huobi
          res.locals.priceObject.cny[1].price = numeral(
            res.locals.priceObject.cny[0].price
          ).format("0,0.00");
          res.locals.priceObject.cny[1].change24hr =
            summary.result.price.change.percentage * 100;
          res.locals.priceObject.cny[1].volume = numeral(
            summary.result.volume
          ).format("0,0.00");
          var options = {
            uri: "https://api.cryptowat.ch/markets/bitflyer/btcjpy/summary",
            json: true
          };
          return rp.get(options);
        },
        error => {
          console.log("error: ", error.message);
        }
      )
      .then(
        summary => {
          // add bitflyer
          res.locals.priceObject.jpy[0].price = numeral(
            summary.result.price.last
          ).format("0,0.00");
          res.locals.priceObject.jpy[0].change24hr =
            summary.result.price.change.percentage * 100;
          res.locals.priceObject.jpy[0].volume = numeral(
            summary.result.volume
          ).format("0,0.00");
          var options = {
            uri: "https://api.cryptowat.ch/markets/quoine/btcjpy/summary",
            json: true
          };
          return rp.get(options);
        },
        error => {
          console.log("error: ", error.message);
        }
      )
      .then(
        summary => {
          // add quoine
          res.locals.priceObject.jpy[1].price = numeral(
            summary.result.price.last
          ).format("0,0.00");
          res.locals.priceObject.jpy[1].change24hr =
            summary.result.price.change.percentage * 100;
          res.locals.priceObject.jpy[1].volume = numeral(
            summary.result.volume
          ).format("0,0.00");
          var options = {
            uri: "https://api.cryptowat.ch/markets/bitstamp/btceur/summary",
            json: true
          };
          return rp.get(options);
        },
        error => {
          console.log("error: ", error.message);
        }
      )
      .then(
        summary => {
          // add bitstamp
          res.locals.priceObject.eur[0].price = numeral(
            summary.result.price.last
          ).format("0,0.00");
          res.locals.priceObject.eur[0].change24hr =
            summary.result.price.change.percentage * 100;
          res.locals.priceObject.eur[0].volume = numeral(
            summary.result.volume
          ).format("0,0.00");
          var options = {
            uri: "https://api.cryptowat.ch/markets/kraken/btceur/summary",
            json: true
          };
          return rp.get(options);
        },
        error => {
          console.log("error: ", error.message);
        }
      )
      .then(
        summary => {
          // add kraken
          res.locals.priceObject.eur[1].price = numeral(
            summary.result.price.last
          ).format("0,0.00");
          res.locals.priceObject.eur[1].change24hr =
            summary.result.price.change.percentage * 100;
          res.locals.priceObject.eur[1].volume = numeral(
            summary.result.volume
          ).format("0,0.00");
          var options = {
            uri: "https://api.cryptowat.ch/markets/bithumb/btckrw/summary",
            json: true
          };
          return rp.get(options);
        },
        error => {
          console.log("error: ", error.message);
        }
      )
      .then(
        summary => {
          // add bithumb
          res.locals.priceObject.krw.price = numeral(
            summary.result.price.last
          ).format("0,0.00");
          res.locals.priceObject.krw.change24hr =
            summary.result.price.change.percentage * 100;
          res.locals.priceObject.krw.volume = numeral(
            summary.result.volume
          ).format("0,0.00");
          next();
        },
        error => {
          console.log("error: ", error.message);
        }
      );
  });

  //  price page
  app.get("/price", (req, res) => {
    res.render("price.ejs", { priceObject: res.locals.priceObject });
  });
};
