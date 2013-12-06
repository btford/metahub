var Q = require('q');

module.exports = {
  issues: {
    repoIssues: function (msg) {
      return Q.resolve(msg.page <= 1 ? [{
        number: 1,
        updated_at: "2011-04-22T13:33:48Z"
      }] : []);
    },
    getComments: function (msg) {
      return Q.resolve([{
        id: 123,
        body: 'hello'
      }]);
    },
    createComment: function(msg) {
      return Q.resolve('result');
    }
  },
  authenticate: function () {},
  repos: {
    get: function () {
      return Q.resolve({
        updated_at: (new Date).toString()
      });
    }
  }
};
