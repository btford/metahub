var doubleOhSeven = require('007');

module.exports = function () {
  var server = doubleOhSeven({
    listen: function () {},
    on: function () {}
  });
  var serverInstance = doubleOhSeven({
    close: function() {}
  });
  var config = {
    target: {
      user: 'myname',
      repo: 'myrepo'
    },
    login: {
      username: 'myrobotname',
      password: 'supersecretpassword'
    },
    hook: {
      url: 'http://example.com:1234',
      port: 1234
    },
    server: server,
    gitHubApi: require('./github-mock'),
    _serverInstance: serverInstance
  };
  server.listen.returns(serverInstance);

  return config;
};
