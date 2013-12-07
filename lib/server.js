var express = require('express');

module.exports = function () {

  // create express instance
  var server = express();

  // middleware
  server.use(express.bodyParser());

  // main POST handler
  server.post('/', function (req, res, next) {
    server.emit('hook', req.body);
    res.send(202, 'Accepted\n');
  });

  return server;
};
