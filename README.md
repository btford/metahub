# metahub

A per-repo, always-up-to-date cache of Github's meta-data (like issues, PRs, and comments).
Great for speeding up requests and avoiding running over GitHub's API limits.


## Usage

```
var config = {

};

var meta = require('metahub')(config);

meta.start();

meta.on('issueReopened', function (data) {
  console.log('this issue was reopened: ' + data.number);
});
```

## How does it work?

First, metahub makes a bajillion requests to Github to scrape all the data.
Then, it launches an Express instance and uses Github's WebHooks API to stay up-to-date.


## API
Uses promises (sorry, not sorry).

### `config`

The factory takes a config object:

```
config = {
  server: obj, // express instance
}
```

### `meta.start`

## License
MIT
