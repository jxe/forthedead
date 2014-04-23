#!/usr/bin/env node

var Firebase = require('firebase'),
    http   = require('http'),
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY),
    fbutil   = require('./fbutil'),
    fburl = 'https://' + process.env.FB_NAME + '.firebaseio.com/',
    express = require('express'),
    app = express();


fbutil.auth(fburl, process.env.FB_TOKEN).done(function() {
   var  F = new Firebase(fburl);

   // app part

   app.use(express.logger());
   app.use(express.static(__dirname));
   app.use(express.bodyParser());

   app.post('/buy_trees', function(req, res){
       var stripeToken = req.body.tokenid;
       console.log(req.body);

       var charge = stripe.charges.create({
           amount: req.body.amount, // amount in cents, again
           currency: "usd",
           card: stripeToken,
           description: req.body.facebook_name + " bought " + req.body.trees + " trees for " + req.body.deadguy_id,
           metadata: {
               email: req.body.email,
               trees: req.body.trees,
               facebook_name: req.body.facebook_name,
               current_user_id: req.body.current_user_id,
               deadguy_name: req.body.deadguy_name,
               deadguy_id: req.body.deadguy_id
           }
       }, function(err, charge) {
           if (err && err.type === 'StripeCardError') {
               res.send(400, 'Card error');
           } else {
               F.child('deeds').child(req.body.deadguy_id).push({
                   doer_id: req.body.current_user_id,
                   doer: req.body.facebook_name,
                   what: 'planted ' + req.body.trees + ' trees in their honor',
                   type: 'trees'
               });
               res.send('OK trees planted');
           }
       });
   });

   var port = process.env.PORT || 5000;
   app.listen(port, function() { console.log("Listening on " + port); });
});
