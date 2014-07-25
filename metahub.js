// cached wrapper around Github
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var qequire = require('qequire');
var GitHubApi = require('github');

var _ = require('lodash');
var Q = require('q');
Q.longStackSupport = true;


var makeCache = require('./lib/cache');
var makeServer = require('./lib/server');

var qoop = function () {
  return Q.resolve(arguments);
};

// recursively remove *_url props
var stripUrl = require('./lib/strip-url');

var Metahub = function (config) {
  this.config = config || {};

  this.repo = null;
  this.issues = null;

  this.rest = qequire.quire(
    this.config.gitHubApi ||
      new GitHubApi({
        version: '3.0.0'
      }));

  this.cache = makeCache();
  this.server = this.config.server || makeServer();
  this.server.on('hook', this._merge.bind(this));

  this.requestQueue = [];
  this.resolvingQueue = false;

  EventEmitter.call(this);
};

util.inherits(Metahub, EventEmitter);

Metahub.prototype._enqueRequest = function (fn, args) {
  var deferred = Q.defer();

  this.requestQueue.push({
    fn: fn,
    args: args,
    deferred: deferred
  });

  if (!this.resolvingQueue) {
    this.resolvingQueue = true;
    this._invokeRequest();
  }

  return deferred.promise;
};

Metahub.prototype._invokeRequest = function () {
  var request = this.requestQueue[0];
  return request.fn.apply(this, request.args).
    then(function (val) {
      request.deferred.resolve(val);
      return val;
    }).
    then(this._resolveRequest.bind(this), function (err) {
      if (err.toString().indexOf('API rate limit exceeded')) {
        this.log('API rate limit exceeded');
        setTimeout(function () {
          this.log('resuming scraping')
          this._invokeRequest();
        }.bind(this), 1000 * 60 * 60);
      }
    }.bind(this));
};

Metahub.prototype._resolveRequest = function () {
  this.requestQueue.shift();
  if (this.requestQueue.length) {
    this._invokeRequest();
  } else {
    this.resolvingQueue = false;
  }
};

// grab all data from Github API and cache it
Metahub.prototype._populate = function () {
  this.log('Populating cache');
  return this._populateRepo().
    then(function (repo) {
      if (this.cache.exists('repo')) {
        this.repo = this.cache.get('repo');
        if (Date.parse(repo.updated_at) > Date.parse(this.repo.updated_at)) {
          this.log('Cache is stale');
          this.repo = repo;
          this.cache.set('repo', repo);
        } else {
          this.issues = this.cache.get('issues');
          return;
        }
      } else {
        this.log('No repo cache');
        this.cache.set('repo', repo);
        this.repo = repo;
      }
      return this._populateAndCacheIssues(repo).
        then(function () {
          this.log('Done caching repo issues');
        }.bind(this));
    }.bind(this));
};

Metahub.prototype._populateIssues = require('./lib/scrape-issues');

Metahub.prototype._populateAndCacheIssues = function (repo) {
  this.log('Scraping issue data from Github API');
  return this._populateIssues(repo).
    then(function (issues) {
      this.issues = issues;
      this._cacheIssues();
      this.emit('cacheBuilt');
    }.bind(this));
};

Metahub.prototype._populateRepo = function () {
  return this.rest.repos.get(this.config.msg).
    then(stripUrl);
};

Metahub.prototype.start = function () {
  this._config();
  return this._populate().
    then(function () {
      this.serverInstance = this.server.listen(this.config.hook.port);
    }.bind(this));
};

Metahub.prototype.stop = function () {
  if (this.serverInstance) {
    this.serverInstance.close();
  }
};

Metahub.prototype._config = function () {
  this.config.msg = this.config.msg || {};
  this.config.msg.user = this.config.msg.user || this.config.target.user;
  this.config.msg.repo = this.config.msg.repo || this.config.target.repo;

  this.rest.authenticate({
    type: 'basic',
    username: this.config.login.username,
    password: this.config.login.password
  });
};

Metahub.prototype.clearCache = function () {
  if (this.cache.exists('repo')) {
    this.cache.clear('repo');
  }
};

Metahub.prototype.getHooks = function () {
  return this.rest.repos.getHooks(this.config.msg).
    then(stripUrl);
};

Metahub.prototype.getCommits = function (number) {
  var msg = _.defaults({
    number: number
  }, this.config.msg);
  return this.rest.pullRequests.getCommits(msg).
    then(stripUrl);
};

Metahub.prototype.getIssue = function (number) {
  var msg = _.defaults({
    number: number
  }, this.config.msg);
  return this.rest.issues.getRepoIssue(msg).
    then(stripUrl);
};

Metahub.prototype.getContributors = function () {
  return this.rest.repos.getContributors(this.config.msg).
    then(stripUrl);
};

Metahub.prototype.createComment = function (number, body) {
  var msg = _.defaults({
    number: number,
    body: body
  }, this.config.msg);

  return this.rest.issues.createComment(msg).
    then(stripUrl);
};

Metahub.prototype.createHook = function () {

  var msg = _.defaults({
    name: 'web',
    active: true,
    events: [
      'pull_request',
      'issues',
      'issue_comment'
    ],
    config: {
      url: this.config.hook.url,
      content_type: 'json'
    }
  }, this.config.msg);

  return this.rest.repos.createHook(msg);
};

Metahub.prototype.updateHook = function (id, args) {
  if (!id) {
    if (!this.cache.exists('hook')) {
      throw new Error('No id given');
    }
    id = this.cache.get('hook');
  }

  var msg = _.defaults(args || {}, this.config.msg, {
    id: id,
    name: 'web',
    events: [
      'pull_request',
      'issues',
      'issue_comment'
    ],
    config: {
      url: this.config.hook.url,
      content_type: 'json'
    }
  });

  return this.rest.repos.updateHook(msg);
};

Metahub.prototype.enableHook = function (id) {
  return this.updateHook(id, {
    active: true
  });
};

Metahub.prototype.disableHook = function (id) {
  return this.updateHook(id, {
    active: false
  });
};

Metahub.prototype.deleteHook = function (id) {
  if (!id) {
    if (!this.cache.exists('hook')) {
      throw new Error('No id given');
    }
    id = this.cache.get('hook');
  }

  var msg = _.defaults({
    id: id
  }, this.config.msg);

  return this.rest.repos.deleteHook(msg);
};


Metahub.prototype._tryToMerge = function (data) {
  return this._merge(data);
};

// merge a change event
Metahub.prototype._merge = function (data) {
  this.log('GitHub hook pushed');

  // i have no idea what i'm doing WRT the GitHub API
  try {
    if (data.payload && typeof data.payload === 'string') {
      data = JSON.parse(data.payload);
    }
    data = stripUrl(data);
  } catch (e) {
    this.log('Bad message:\n' + indent(
      JSON.stringify(data, null, 2) +
      '\n=======\n' +
      e.stack
    ));
    return Q.reject();
  }

  var hook = hookName(data);

  if (this['_' + hook]) {
    this.log('Running internal ' + hook + ' book-keeping for #' + issueNumber(data));
    return Q.try(this['_' + hook].bind(this), data).
      then(function () {
        this.log('Emitting ' + hook + ' event', data);
        this.emit(hook, data);
        return data;
      }.bind(this), function (err) {
        this.log('Error from internal ' + hook + ' book-keeping', data, err);
      }.bind(this));
  }

  return Q.resolve(data);
};

// there methods are invoked by merge
// they are applies before event handlers

Metahub.prototype._issueCommentCreated =
Metahub.prototype._pullRequestCommentCreated = function (data) {
  var issue = issueish(data),
      comment = data.comment;

  if (!this.issues[issue.number]) {
    this.log('Tried to add a comment to a non-existant issue', data);
    return Q.resolve();
  }

  var issue = this.issues[issue.number];
  var comments = issue.comments = issue.comments || {};

  if (comments[comment.id] && newerThan(comments[comment.id].updated_at, comment.updated_at)) {
    this.log('Tried to update cache with data older than dates from the cache', data);
    return Q.resolve();
  }

  comments[comment.id] = _.merge({}, comments[comment.id], comment);
  this._cacheIssues();

  return Q.resolve();
};

Metahub.prototype._issueClosed =
Metahub.prototype._issueReopened =
Metahub.prototype._issueMerged =
Metahub.prototype._issueReferenced =
Metahub.prototype._issueAssigned =
Metahub.prototype._issueOpened = function (data) {
  var number = data.issue.number;

  if (this.issues[number] && newerThan(this.issues[number].updated_at, data.updated_at)) {
    return Q.resolve();
  }

  this.issues[number] = _.merge({}, this.issues[number], data.issue);
  this.issues[number]._updated = Date.now();
  this._cacheIssues();

  return Q.resolve();
};

Metahub.prototype._cacheIssues = function () {
  this.cache.set('issues', this.issues);
};

function newerThan (a, b) {
  return timestamp(a) > timestamp(b);
}

function timestamp (str) {
  return +new Date(str);
}

function issueNumber (data) {
  return (data.pull_request || data.issue).number;
}

function hookName (data) {
  var action = data.action;
  var entity = interestingEntity(data);

  return entity +
    action[0].toUpperCase() +
    action.substr(1);
}

function interestingEntity (data) {
  return data.comment ?
      (data.issue ? 'issueComment' : 'pullRequestComment') :
    data.pull_request ? 'pullRequest' :
    data.issue ? 'issue' : '';
}

function indent (str, amount) {
  amount = amount || '  ';
  str = (str instanceof Array) ? str : str.split('\n');
  return str.map(function (line) {
    return amount + line;
  }).join('\n');
}

function issueish (data) {
  return data.pull_request || data.issue;
}

function logDataSummary (data) {
  return logTitle(data) + '\n' +
      indent(
        'issue: ' + summerizeBody(data.issue) +
        'comment: ' + summerizeBody(data.comment)
      );
}

function logTitle (data) {
  return data.repository.full_name + '/#' + issueNumber(data) + ' - ' + data.issue.title;
}

function summerizeBody (data) {
  return data.body ?
      ('"' + data.body.substr(0, 80) + (data.body.length > 80 ? '…' : '') +
          '" -' + data.user.login + '\n') : '';
}

Metahub.prototype.log = function (msg, data, exception) {
  if (data) {
    msg += ' for:\n' + indent(logDataSummary(data));
  }
  if (exception) {
    msg += indent((data ? '\n=======\n' : '') + (exception.stack || exception));
  }
  this.emit('log', msg);
};


module.exports = function (config) {
  return new Metahub(config);
};

module.exports.Metahub = Metahub;
