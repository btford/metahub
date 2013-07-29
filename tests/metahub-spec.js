var should = require('should');
var rewire = require('rewire');
var Q = require('q');

var cache = require('../lib/cache');

var doubleOhSeven = rewire('007');

// noop -> return promise
var illBeBack = (function () {
  var doubleOhSeven = rewire('007');
  doubleOhSeven.__set__('noop', function () {
    var deferred = Q.defer();
    deferred.resolve('foo');
    return deferred.promise;
  });
  return doubleOhSeven;
}());


var GitHubApi = require('github');

var makeMeta = rewire('../metahub');
var originalCache = makeMeta.__get__('makeCache');
makeMeta.__set__('makeCache', function () {
  return doubleOhSeven(originalCache());
});


describe('Metahub', function () {

  var metahub,
    server = doubleOhSeven({
      listen: function () {},
      on: function () {}
    }),
    config = {
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
      gitHubApi: require('./mocks/github-mock.js')
    };

  beforeEach(function () {
    metahub = makeMeta(config);
  });

  describe('#start', function () {
    it('should start the server on the specified port', function (done) {
      metahub.start().done(function () {
        should.equal(server.listen.callHistory[0][0], config.hook.port);
        done();
      });
    });

    it('should initialize repo issues', function (done) {
      metahub.start().done(function () {
        should.exist(metahub.issues);
        done();
      });
    })

    it('should initialize repo data', function (done) {
      metahub.start().done(function () {
        should.exist(metahub.repo);
        done();
      });
    });
  });

  describe('#merge', function () {
    beforeEach(function (done) {
      metahub.start().done(done);
    });

    it('should merge new comments', function (done) {
      var toMerge = {
        action: 'created',
        comment: {
          id: 2
        },
        issue: {
          number: 1
        }
      };

      metahub.on('issueCommentCreated', function (data) {
        data.should.eql(toMerge);
        done();
      });

      metahub._merge(toMerge);
    });
  });

/*
  describe('#clearCache', function () {
    it('should populate before starting the server', function () {
      
    });
  });

  describe('#getHooks', function () {
    it('should populate before starting the server', function () {
      
    });
  });

  describe('#getCommits', function () {
    it('should populate before starting the server', function () {
      
    });
  });
*/

});

