// server.js

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var passport = require('passport');
var cookieParser = require('cookie-parser');

var app = express();

app.use(express.static('./'));

require('./passport')(passport); 

// logs all requests to console
// var morgan = require('morgan');
// app.use(morgan('dev')); 

app.use(cookieParser()); 
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());
app.set('view engine', 'ejs'); 

app.use(session({
	secret: 'thiscanbeanything',
	resave: true,
	saveUninitialized: true
} )); 

app.use(passport.initialize());
app.use(passport.session()); 
require('./routes.js')(app, passport); 

var port = 8080;
app.listen(port);
console.log('Server running on port ' + port);























