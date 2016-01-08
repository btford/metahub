# metahub

[![Build Status](https://travis-ci.org/btford/metahub.svg)](https://travis-ci.org/btford/metahub)


A per-repo, always-up-to-date cache of Github's meta-data (like issues, PRs, and comments).
Great for speeding up requests and avoiding running over GitHub's API limits.

## What is it good for?
Long-running services that want to frequently calculate/respond to metrics based on Github Issues, PRs, and comments.
Metahub was created for [Mary Poppins](https://github.com/btford/mary-poppins), a tool for helping to manage issues and PRs on popular Github repos.

For a more lightweight approach, you might want to look into:

* [`node-github`](https://github.com/ajaxorg/node-github)

## Usage

```
var config = {
  // Github repo to watch
  // https://github.com/myname/myrepo
  target: {
    user: 'myname',
    repo: 'myrepo'
  },

  // credentials for user who leaves comments, etc
  login: {
    username: 'myrobotname',
    password: 'supersecretpassword'
  },

  // You may also use basic token authentication in place of username and password
  // by generating a personal access token at 
  // https://github.com/settings/applications 
  
  //login: {
  //  username: 'yourTokenHere3098438ef098dsf709834',
  //  password: 'x-oauth-basic'
  //},

  // port to listen on,
  // and URL for Github to ping
  hook: {
    url: 'http://example.com:1234',
    port: 1234
  }
};

var meta = require('metahub')(config);

meta.on('issueReopened', function (data) {
  console.log('this issue was reopened: ' + data.number);
});

meta.start();
```

## How does it work?

First, metahub makes a bajillion requests to Github to scrape all the data.
Then, it launches an Express instance and uses Github's WebHooks API to stay up-to-date.


## API
Uses promises (sorry, not sorry).

### `makeMeta(config)`

Metahub factory;

```
var makeMeta = require('metahub');
var config = {
  // etc...
};
var meta = makeMeta(config);
```

### `Metahub`

Useful if you want to extend `Metahub`:

```
var util = require('util');
var Metahub = require('metahub').Metahub;

var MyHub = function MyHub () {
  Metahub.apply(this, arguments);
};

util.inherits(MyHub, Metahub);
```

-------------------------------------------------------------------------------

### `meta.issues`

This property contains all of the issue info [scraped from Github](http://developer.github.com/v3/issues/#get-a-single-issue), organized by `number`.

```
console.log(meta.issues[1347].title);
// -> "The Issue Title"
```


### `meta.repo`

This property contains all of the repo info [scraped from Github](http://developer.github.com/v3/repos/#get):

```
console.log(meta.repo);
// -> { "id": 1296269, "owner": { ... }, "name": "Hello-World", ... }
```

-------------------------------------------------------------------------------

### `meta.start()`

Starts the Github hook server, which listens to the port specified in the config.

-------------------------------------------------------------------------------

### `meta.getCommits(number)`

Returns the commits for the specified PR.

### `meta.createComment(number, body)`

Creates a comment for the specified issue/PR with the given moarkdown-formatted body.


## License
MIT
