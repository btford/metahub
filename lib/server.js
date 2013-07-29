var express = require('express');

module.exports = function () {

  // create express instance
  var server = express();

  // middleware
  server.use(express.bodyParser());

  // main POST handler
  server.post('/', function (req, res, next) {
    var payload = JSON.parse(req.body.payload);
    server.emit('hook', payload);
    res.send(202, 'Accepted\n');
  });

  return server;
};
