require('dotenv').load();

var util = require('util');
var express = require('express');
var passport = require('passport');
var RunKeeperStrategy = require('passport-runkeeper').Strategy;
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var Redis = require('ioredis');
var request = require('request');
var url = require('url');

var redis = new Redis(process.env.REDISTOGO_URL);
var app = express();

// just persist the whole thing in the session for now (won't be on the client)
passport.serializeUser(function(user, done) { done(null, user); });
passport.deserializeUser(function(obj, done) { done(null, obj); });

passport.use(new RunKeeperStrategy({
    clientID:     process.env.RUNKEEPER_CLIENT_ID,
    clientSecret: process.env.RUNKEEPER_CLIENT_SECRET,
    callbackURL:  process.env.RUNKEEPER_CALLBACK
  },
  function(accessToken, refreshToken, profile, done) {

    // get profile data
    request({
      url:'https://api.runkeeper.com/profile',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Accept': 'application/vnd.com.runkeeper.profile+json'
      }
    }, function callback(error, response, body) {
      if(error || response.statusCode !== 200) return done(error || true);

      var data = JSON.parse(body);

      done(null, {
        name:           data.name,
        normal_picture: data.normal_picture,
        url:            data.profile,

        _access_token: accessToken
      })
    })
  }
));

var opts = {
  resave:false,
  saveUninitialized:true,
  store: new RedisStore({
    client: redis
  }),
  secret: process.env.SESSION_SECRET || 'keyboard cat'
}

if (app.get('env') === 'production') {
  app.set('trust proxy', 1)
  opts.cookie.secure = true
}

app.use(session(opts));
app.use(passport.initialize());
app.use(passport.session());


app.set('view engine', 'html');
app.engine('html', require('hbs').__express);

// GET  / - status and frontend ui
// GET  /auth/runkeeper - authorise session with runkeeper
// POST /logout - de-authorise
// GET  /data/* proxy runkeeper

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/auth/runkeeper', passport.authenticate('runkeeper'));

app.get('/auth/runkeeper/callback',
  passport.authenticate('runkeeper', { failureRedirect: '/?failed' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/picture', function(req, res){
  if(!req.user) return res.status(401).send("Unauthorised");
  request(req.user.normal_picture).pipe(res)
})

app.get('/data/fitnessActivities', function(req, res){
  if(!req.user) return res.status(401).send("Unauthorised")

  var url_parts = url.parse(req.url, true);

  request({
    url:'https://api.runkeeper.com/fitnessActivities' + (url_parts.search || ''),
    headers: {
      'Authorization': 'Bearer ' + req.user._access_token,
      'Accept': 'application/vnd.com.runkeeper.FitnessActivityFeed+json'
    }
  }).pipe(res);

})

app.use(express.static(__dirname + '/views'));

app.listen(process.env.PORT || 3000);
