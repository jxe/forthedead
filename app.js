#!/usr/bin/env node

var Firebase = require('firebase'),
    http   = require('http'),
    stripe = require('stripe'),
    fbutil   = require('./fbutil'),
    fburl = 'https://' + process.env.FB_NAME + '.firebaseio.com/',
    express = require('express'),
    app = express();


stripe.setApiKey(process.env.STRIPE_SECRET_KEY);

fbutil.auth(fburl, process.env.FB_TOKEN).done(function() {
   var  F = new Firebase(fburl);

   // app part

   app.use(express.logger());
   app.use(express.static(__dirname));
   app.use(express.bodyParser());

   app.post('/buy_trees', function(req, res){
       var stripeToken = req.body.stripeToken;
       var charge = stripe.charges.create({
           amount: 2000, // amount in cents, again
           currency: "usd",
           card: stripeToken,
           description: "FBID bought X trees for DEADGUYID"
       }, function(err, charge) {
           if (err && err.type === 'StripeCardError') {
               // The card has been declined
           } else {
               // add the trees!
           }
       });
   });

   var port = process.env.PORT || 5000;
   app.listen(port, function() { console.log("Listening on " + port); });
});
