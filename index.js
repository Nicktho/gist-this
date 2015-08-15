#!/usr/bin/env node
var path = require('path');
var request = require('request');
var pkg = require( path.join(__dirname, 'package.json') );

var WebSocketClient  = require('websocket').client;

var program = require('commander');

program
	.version(pkg.version)
	.option('-k, --key <key>', 'Api key for slack bot integration')
	.parse(process.argv);
  
var client = new WebSocketClient();
  
var RTM_URL = "https://slack.com/api/rtm.start";
var REACTIONS_URL = "https://slack.com/api/reactions.get";
var POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage";
  
console.log('Connecting to slack...')
request.post(RTM_URL, {form: {token: program.key}}, function(err, res, body) {
  var wsURL = JSON.parse(body).url;
  client.connect(wsURL);
})

client.on('connect', function(conn) {
  console.log('connected');
  
  conn.on('message', function(message) {
    var body = JSON.parse(message.utf8Data);
    if (body.type !== 'reaction_added') return;
    var reactionOpts = {
      token: program.key,
      timestamp: body.item.ts,
      channel: body.item.channel
    };
    request.post(REACTIONS_URL, {form: reactionOpts}, function(err, res, postBody) {
      var text = JSON.parse(postBody).message.text;
      gistify(text, function(url) {
        var messageOpts = {
          token: program.key,
          channel: body.item.channel,
          'as_user': true,
          text: 'Gist: ' + url
        };
        request.post(POST_MESSAGE_URL, {form: messageOpts}, function(err, res, postBody) {
          postBody = JSON.parse(postBody);
          if (postBody.ok) console.log('Successfully created gist, ' + url)
        })
      })
    })
  });
});

var gistify = function(text, cb) {
  var url = "https://api.github.com/gists";
  
  var form = {
    pubic: true,
    files: {
      "slack-message.md" : {
        content: text
      }
    }
  };
  
  var requestOpts = {
    method: 'POST',
    url: url,
    headers: {
      'User-Agent': 'gist-this'
    },
    json: form
  }
  
  request(requestOpts, function(err, res, body) {
    cb(body['html_url']);
  })
};
