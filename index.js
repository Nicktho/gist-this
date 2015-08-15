#!/usr/bin/env node
var path = require('path');
var request = require('request');
var WebSocketClient  = require('websocket').client;
var program = require('commander');

var pkg = require( path.join(__dirname, 'package.json') );

program
	.version(pkg.version)
	.option('-k, --key <key>', 'Api key for slack bot integration')
	.parse(process.argv);
  
var client = new WebSocketClient();
  
var SLACK_API = "https://slack.com/api";
var GITHUB_API = "https://api.github.com";
  
console.log('Connecting to slack...')
request.post(SLACK_API + '/rtm.start', {form: {token: program.key}}, function(err, res, body) {
  var wsURL = JSON.parse(body).url;
  
  client.connect(wsURL);
});

client.on('connect', function(conn) {
  console.log('connected');
  
  conn.on('message', function(message) {
    message = JSON.parse(message.utf8Data);
    if (message.type !== 'reaction_added') return;
    
    var reactionOpts = {
      token: program.key,
      timestamp: message.item.ts,
      channel: message.item.channel
    };
    
    request.post(SLACK_API + '/reactions.get', {form: reactionOpts}, function(err, res, body) {
      var text = JSON.parse(message).message.text;
      
      gistify(text, function(url) {
        var messageOpts = {
          token: program.key,
          channel: message.item.channel,
          'as_user': true,
          text: 'Gist: ' + url
        };
        
        request.post(SLACK_API + '/chat.postMessage', {form: messageOpts}, function(err, res, body) {
          body = JSON.parse(body);
          if (body.ok) console.log('Successfully created gist, ' + url);
        });
      });
    });
  });
});

var gistify = function(text, cb) {
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
    url: GITHUB_API + '/gists',
    headers: {
      'User-Agent': 'gist-this'
    },
    json: form
  };
  
  request(requestOpts, function(err, res, body) {
    cb(body['html_url']);
  });
};
