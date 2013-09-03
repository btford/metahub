var Q = require('q');

var resolve = function (to) {
  var def = Q.defer();
  def.resolve(to);
  return def.promise;
};

module.exports = {
  issues: {
    repoIssues: function (msg) {
      return resolve(msg.page <= 1 ? [{
        number: 1,
        updated_at: "2011-04-22T13:33:48Z"
      }] : []);
    },
    getComments: function (msg) {
      return resolve([{
        id: 123,
        body: 'hello'
      }]);
    }
  },
  authenticate: function () {},
  repos: {
    get: function () {
      return resolve({
        updated_at: (new Date).toString()
      });
    }
  }
};
