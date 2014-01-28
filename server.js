var express = require('express');
var path = require('path');
var passport = require('passport');
var config = require('./libs/config');
var log = require('./libs/log')(module);
var oauth2 = require('./libs/oauth2');
var ArticleModel = require('./libs/mongoose').ArticleModel;
var RequestModel = require('./libs/mongoose').RequestModel;
var UserModel = require('./libs/mongoose').UserModel;
var nodemailer = require("nodemailer");

var app = express();

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(passport.initialize());
app.use(express.methodOverride());
app.use(function(req, res, next) {
  if(req.headers.origin) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Authorization");
  }
  next();
});
app.use(app.router);
app.use(express.static(path.join(__dirname, "public")));

require('./libs/auth');

app.post('/token', function(req, res, next) {

  if (req.body.grant_type && !req.body.client_id && !req.body.client_secret) {

    req.body.client_id = "internal";
    req.body.client_secret = "internal123456";
  }
  next();
});

app.post('/token', oauth2.token);


app.post('/service_request', function (req, res) {
  var request = new RequestModel({
    hospital: req.body.hospital,
    person: req.body.person,
    telephone: req.body.telephone,
    analyzer: req.body.analyzer,
    defect: req.body.defect,
    place: req.body.place
  });

  request.save(function (err) {
    if (!err) {
      var newId=request.requestId;
      log.info("Request "+ newId +" created "+request.created);
      // create reusable transport method (opens pool of SMTP connections)
      var smtpTransport = nodemailer.createTransport("Sendmail"/*, {
        ervice: "Gmail",
        auth: {
          user: "a4next@gmail.com",
          pass: "ghjcnjytrcn"
        }
      }*/);

      // setup e-mail data with unicode symbols
      var mailOptions = {
        from: "<admin@polymedservice.ru>", // sender address
        to: "79220210915@sms.ugsm.ru", // list of receivers
        subject: newId + " от " + req.body.hospital, // Subject line
        text: req.body.person + " [" + req.body.telephone + "] " + req.body.analyzer + " [" + req.body.place + "] " + req.body.defect// plaintext body
      }

      // send mail with defined transport object
      smtpTransport.sendMail(mailOptions, function (error, response) {
        if (error) {
          console.log("Message sent error: " + error);
        } else {
          console.log("Message sent: " + response.message);
        }
        smtpTransport.close(); // shut down the connection pool, no more messages
      });
      res.redirect('/index.html#'+newId);

    } else {
      console.log(err);
      log.error('Internal error(%d): %s', res.statusCode, err.message);
      res.redirect('/index.html#e');
    }
  });

});

app.get('/api/requests', passport.authenticate('bearer', { session: false }), function (req, res) {
  return RequestModel.find(function (err, requests) {
    if (!err) {
      return res.send(requests);
    } else {
      res.statusCode = 500;
      log.error('Internal error(%d): %s', res.statusCode, err.message);
      return res.send({ error: 'Server error' });
    }
  });
});

app.get('/api/users', passport.authenticate('bearer', { session: false }), function (req, res) {
  return UserModel.find(function (err, users) {
    if (!err) {
      return res.send(users);
    } else {
      res.statusCode = 500;
      log.error('Internal error(%d): %s', res.statusCode, err.message);
      return res.send({ error: 'Server error' });
    }
  });
});

app.post('/api/articles', passport.authenticate('bearer', { session: false }), function (req, res) {
  var article = new ArticleModel({
    title: req.body.title,
    author: req.body.author,
    description: req.body.description,
    images: req.body.images
  });

  article.save(function (err) {
    if (!err) {
      log.info("article created");
      return res.send({ status: 'OK', article: article });
    } else {
      console.log(err);
      if (err.name == 'ValidationError') {
        res.statusCode = 400;
        res.send({ error: 'Validation error' });
      } else {
        res.statusCode = 500;
        res.send({ error: 'Server error' });
      }
      log.error('Internal error(%d): %s', res.statusCode, err.message);
    }
  });
});

app.get('/api/articles/:id', passport.authenticate('bearer', { session: false }), function (req, res) {
  return ArticleModel.findById(req.params.id, function (err, article) {
    if (!article) {
      res.statusCode = 404;
      return res.send({ error: 'Not found' });
    }
    if (!err) {
      return res.send({ status: 'OK', article: article });
    } else {
      res.statusCode = 500;
      log.error('Internal error(%d): %s', res.statusCode, err.message);
      return res.send({ error: 'Server error' });
    }
  });
});

app.put('/api/articles/:id', passport.authenticate('bearer', { session: false }), function (req, res) {
  return ArticleModel.findById(req.params.id, function (err, article) {
    if (!article) {
      res.statusCode = 404;
      return res.send({ error: 'Not found' });
    }

    article.title = req.body.title;
    article.description = req.body.description;
    article.author = req.body.author;
    article.images = req.body.images;
    return article.save(function (err) {
      if (!err) {
        log.info("article updated");
        return res.send({ status: 'OK', article: article });
      } else {
        if (err.name == 'ValidationError') {
          res.statusCode = 400;
          res.send({ error: 'Validation error' });
        } else {
          res.statusCode = 500;
          res.send({ error: 'Server error' });
        }
        log.error('Internal error(%d): %s', res.statusCode, err.message);
      }
    });
  });
});

app.delete('/api/articles/:id', passport.authenticate('bearer', { session: false }), function (req, res) {
  return ArticleModel.findById(req.params.id, function (err, article) {
    if (!article) {
      res.statusCode = 404;
      return res.send({ error: 'Not found' });
    }
    return article.remove(function (err) {
      if (!err) {
        log.info("article removed");
        return res.send({ status: 'OK' });
      } else {
        res.statusCode = 500;
        log.error('Internal error(%d): %s', res.statusCode, err.message);
        return res.send({ error: 'Server error' });
      }
    });
  });
});

app.get('/api/userInfo',
    passport.authenticate('bearer', { session: false }),
    function (req, res) {
      // req.authInfo is set using the `info` argument supplied by
      // `BearerStrategy`.  It is typically used to indicate scope of the token,
      // and used in access control checks.  For illustrative purposes, this
      // example simply returns the scope in the response.
      res.json({ user_id: req.user.userId, name: req.user.username, scope: req.authInfo.scope })
    }
);

app.get('/ErrorExample', function (req, res, next) {
  next(new Error('Random error!'));
});

app.listen(config.get('port'), function () {
  log.info('Express server listening on port ' + config.get('port'));
});