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

    it('should emit events for pullRequestClosed', function (done) {
      metahub.on('pullRequestClosed', function (data) {
        done();
      });

      metahub._merge({
        "action": "closed",
        "number": 432,
        "pull_request": {
          "url": "https://api.github.com/repos/myuser/myrepo/pulls/432",
          "number": 432,
          "state": "closed",
          "title": "somthing is broken",
          "user": {
            "login": "test"
          },
          "body": "hello",
          "created_at": "2014-04-24T17:44:42Z",
          "updated_at": "2014-07-26T00:10:24Z",
          "closed_at": "2014-07-26T00:10:24Z",
          "merged_at": "2014-07-26T00:10:24Z",
          "merge_commit_sha": "123425697364578063q476503465",
          "assignee": null,
          "milestone": null,
          "head": {
            "label": "test:troubleshooting/ws",
            "ref": "troubleshooting/ws",
            "sha": "7ee2f85eae4d89a08b74dce71bfebe3ff19e92f0",
            "user": {
              "login": "test"
            },
            "repo": {
              "id": 16144832,
              "name": "myrepo",
              "full_name": "test/myrepo",
              "owner": {
                "login": "test",
                "type": "User",
                "site_admin": false
              },
              "private": false,
              "html_url": "https://github.com/test/myrepo",
              "description": "Spectacular Test Runner for JavaScript",
              "fork": true,
              "url": "https://api.github.com/repos/test/myrepo",
              "created_at": "2014-01-22T16:28:43Z",
              "updated_at": "2014-06-24T11:43:34Z",
              "pushed_at": "2014-06-24T11:43:34Z",
              "homepage": "http://myuser.github.io",
              "size": 6522,
              "stargazers_count": 0,
              "watchers_count": 0,
              "language": "CoffeeScript",
              "has_issues": false,
              "has_downloads": true,
              "has_wiki": false,
              "forks_count": 1,
              "mirror_url": null,
              "open_issues_count": 0,
              "forks": 1,
              "open_issues": 0,
              "watchers": 0,
              "default_branch": "master"
            }
          },
          "base": {
            "label": "myuser:master",
            "ref": "master",
            "sha": "3873c5311932176a08e774f3efe1c21ee74064c0",
            "user": {
              "login": "myuser"
            },
            "repo": {
              "id": 2560988,
              "name": "myrepo",
              "full_name": "myuser/myrepo",
              "owner": {
                "login": "myuser",
                "type": "Organization",
                "site_admin": false
              }
            }
          },
          "merged": true,
          "mergeable": null,
          "mergeable_state": "unknown",
          "merged_by": {
            "login": "test2"
          },
          "comments": 5,
          "review_comments": 5,
          "commits": 1,
          "additions": 12,
          "deletions": 0,
          "changed_files": 1
        },
        "repository": {
          "id": 2560988,
          "name": "myrepo",
          "full_name": "myuser/myrepo",
          "owner": {
            "login": "myuser",
            "type": "Organization"
          },
          "private": false,
          "html_url": "https://github.com/myuser/myrepo",
          "description": "Spectacular Test Runner for JavaScript",
          "fork": false,
          "url": "https://api.github.com/repos/myuser/myrepo",
          "created_at": "2011-10-12T07:55:46Z",
          "updated_at": "2014-07-25T21:48:53Z",
          "pushed_at": "2014-07-26T00:10:25Z",
          "size": 16120,
          "stargazers_count": 3806,
          "watchers_count": 3806,
          "language": "CoffeeScript",
          "has_issues": true,
          "has_downloads": true,
          "has_wiki": false,
          "forks_count": 646,
          "mirror_url": null,
          "open_issues_count": 203,
          "forks": 646,
          "open_issues": 203,
          "watchers": 3806,
          "default_branch": "master"
        },
        "sender": {
          "login": "test2",
          "type": "User",
          "site_admin": false
        }
      })
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

