var should = require('should');
var rewire = require('rewire');
var Q = require('q');
var doubleOhSeven = require('007');

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
    serverInstance = doubleOhSeven({
      close: function() {}
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
  server.listen.returns(serverInstance);

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
    });

    it('should initialize repo data', function (done) {
      metahub.start().done(function () {
        should.exist(metahub.repo);
        done();
      });
    });

    it('should cache data', function (done) {
      metahub.start().done(function () {
        should.exist(metahub.cache.set.callHistory[0]);
        done();
      });
    });
  });

  describe('#stop', function() {
    it('should stop a running server instance', function(done) {
      metahub.start().done(function () {
        metahub.stop();
        should.exist(serverInstance.close.callHistory[0]);
        done();
      });

    });
  });

  describe('#merge', function () {
    beforeEach(function (done) {
      metahub.start().done(done);
    });

    it('should emit events for new comments', function (done) {
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

    it('should emit log events for new comments', function (done) {
      var toMerge = {
        action: 'created',
        comment: {
          id: 2
        },
        issue: {
          number: 1
        }
      };

      metahub.once('log', function (msg) {
        should.equal(msg, 'Running internal issueCommentCreated book-keeping for #1');
        metahub.once('log', function (msg) {
          should.equal(msg, 'Emitting issueCommentCreated event for #1');
          done();
        })
      });

      metahub._merge(toMerge);
    });

    it('should merge new comment data', function (done) {
      var toMerge = {
        action: 'created',
        comment: {
          id: 2,
          body: 'foo'
        },
        issue: {
          number: 1
        }
      };

      metahub._merge(toMerge).done(function () {
        should.exist(metahub.issues['1'].comments['2']);
        should.equal(metahub.issues['1'].comments['2'].body, 'foo');
        done();
      });
    });

    it('should not override existing comment data with older data', function (done) {
      var toCreate = {
        action: 'created',
        comment: {
          id: 2,
          body: 'foo',
          updated_at: '2011-04-23T10:43:00Z'
        },
        issue: {
          number: 1
        }
      };

      var toUpdate = {
        action: 'created',
        comment: {
          id: 2,
          body: 'bar',
          updated_at: '2011-04-22T13:33:00Z'
        },
        issue: {
          number: 1
        }
      };

      metahub.
        _merge(toCreate).
        then(function () {
          should.equal(metahub.issues['1'].comments['2'].body, 'foo');
          return metahub._merge(toUpdate);
        }).
        done(function () {
          should.equal(metahub.issues['1'].comments['2'].body, 'foo');
          done();
        });
    });

  });

  describe('#createComment', function() {
    it('should call the github API with a config object', function() {
      metahub.rest = doubleOhSeven(metahub.rest);
      metahub.rest.issues.createComment.returns(Q.resolve());

      metahub.createComment(1234, 'My comment text');
      metahub.rest.issues.createComment.callCount.should.equal(1);
      var config = metahub.rest.issues.createComment.callHistory[0][0];
      config.should.eql({
            number: 1234,
            body: 'My comment text',
            user: 'myname',
            repo: 'myrepo'
      });
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

