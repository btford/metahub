var should = require('should');
var rewire = require('rewire');
var Q = require('q');
var doubleOhSeven = require('007');

var makeMeta = rewire('../metahub');

var originalCache = makeMeta.__get__('makeCache');
makeMeta.__set__('makeCache', function () {
  return doubleOhSeven(originalCache());
});

var mockPayload = require('./mocks/payload-mock');
var makeMockConfig = require('./mocks/config-mock');

describe('Metahub', function () {
  var metahub, config, toMerge;

  beforeEach(function () {
    config = makeMockConfig();
    metahub = makeMeta(config);
    toMerge = JSON.parse(JSON.stringify(mockPayload.commentCreated));
  });


  describe('#start', function () {
    it('should start the server on the specified port', function (done) {
      metahub.start().done(function () {
        should.equal(config.server.listen.callHistory[0][0], config.hook.port);
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
        should.exist(config._serverInstance.close.callHistory[0]);
        done();
      });
    });
  });


  describe('#merge', function () {
    beforeEach(function (done) {
      metahub.start().done(done);
    });

    it('should emit events for new comments', function (done) {
      metahub.on('issueCommentCreated', function (data) {
        data.should.eql(toMerge);
        done();
      });

      metahub._merge(toMerge);
    });


    it('should emit log events for new comments', function (done) {
      var messageCount = 0,
          allTheMessages = [];

      metahub.on('log', function (msg) {
        messageCount += 1;
        allTheMessages.push(msg);
        if (messageCount >= 3) {
          // the event handler eats the errors for some reason ಠ_ಠ
          setTimeout(makeAssertions, 0);
        }
      });

      function makeAssertions () {
        allTheMessages[0].trim().should.equal('GitHub hook pushed');
        allTheMessages[1].trim().should.equal('Running internal issueCommentCreated book-keeping for #1');
        allTheMessages[2].trim().should.equal(
          'Emitting issueCommentCreated event for:\n' +
          '  angular/angular.js/#1 - everything is broken\n' +
          '    issue: ":(" -btford\n' +
          '    comment: "help it broked" -btford'
        );
        done();
      }
      metahub._merge(toMerge);
    });


    it('should log errors', function (done) {
      var messageCount = 0,
          allTheMessages = [];

      metahub.on('log', function (msg) {
        messageCount += 1;
        allTheMessages.push(msg);
        if (messageCount >= 2) {
          // the event handler eats the errors for some reason ಠ_ಠ
          setTimeout(makeAssertions, 0);
        }
      });

      function makeAssertions () {
        allTheMessages[0].should.equal('GitHub hook pushed');
        allTheMessages[1].should.startWith(
          'Bad message:\n' +
          '  {\n' +
          '    "payload": "bad data"\n' +
          '  }\n' +
          '  =======\n' +
          '  SyntaxError: Unexpected token b'
        );
        done();
      }

      metahub._merge({payload: 'bad data'});
    });


    it('should merge new comment data', function (done) {
      metahub._merge(toMerge).done(function () {
        should.exist(metahub.issues['1'].comments['2']);
        should.equal(metahub.issues['1'].comments['2'].body, 'help it broked');
        done();
      });
    });


    it('should merge new comments data even if the issue does not exist', function (done) {
      delete metahub.issues['1'];

      metahub._merge(toMerge).done(function () {
        should.exist(metahub.issues['1']);
        should.equal(metahub.issues['1'].comments['2'].body, 'help it broked');
        done();
      });
    });


    it('should log when a new comment\'s corresponding issue does not exist', function (done) {
      delete metahub.issues['1'];

      var messageCount = 0,
          allTheMessages = [];

      metahub.on('log', function (msg) {
        messageCount += 1;
        allTheMessages.push(msg);
        if (messageCount >= 4) {
          // the event handler eats the errors for some reason ಠ_ಠ
          setTimeout(makeAssertions, 0);
        }
      });

      function makeAssertions () {
        allTheMessages[0].trim().should.equal('GitHub hook pushed');
        allTheMessages[1].trim().should.equal('Running internal issueCommentCreated book-keeping for #1');
        allTheMessages[2].trim().should.equal(
          'Tried to add a comment to a non-existent issue\n' +
          '  Recovering by adding issue to cache for:\n' +
          '  angular/angular.js/#1 - everything is broken\n' +
          '    issue: ":(" -btford\n' +
          '    comment: "help it broked" -btford'
        );
        done();
      }

      metahub._merge(toMerge);
    });


    it('should log issues from book-keeping', function (done) {
      metahub._issueCommentCreated = function () {
        throw new Error('oops');
      };

      var messageCount = 0,
          allTheMessages = [];

      metahub.on('log', function (msg) {
        messageCount += 1;
        allTheMessages.push(msg);
        if (messageCount === 3) {
          // the event handler eats the errors for some reason ಠ_ಠ
          setTimeout(makeAssertions, 0);
        }
      });

      function makeAssertions () {
        allTheMessages[0].should.equal('GitHub hook pushed');
        allTheMessages[1].should.equal('Running internal issueCommentCreated book-keeping for #1');
        allTheMessages[2].should.startWith(
          'Error from internal issueCommentCreated book-keeping for:\n' +
          '  angular/angular.js/#1 - everything is broken\n' +
          '    issue: ":(" -btford\n' +
          '    comment: "help it broked" -btford\n' +
          '      \n' +
          '  =======\n' +
          '  Error: oops\n'
        );
        done();
      }

      metahub._merge(toMerge);
    });

    it('should not override existing comment data with older data', function (done) {
      var toCreate = {
        action: 'created',
        comment: {
          id: 2,
          body: 'foo',
          user: mockPayload.user,
          updated_at: '2011-04-23T10:43:00Z'
        },
        issue: {
          number: 1,
          user: mockPayload.user
        },
        repository: mockPayload.repository
      };

      var toUpdate = {
        action: 'created',
        comment: {
          id: 2,
          body: 'bar',
          user: mockPayload.user,
          updated_at: '2011-04-22T13:33:00Z'
        },
        issue: {
          number: 1,
          user: mockPayload.user
        },
        repository: mockPayload.repository
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
      metahub._config();
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

