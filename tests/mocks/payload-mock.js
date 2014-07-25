var mockUser = module.exports.user = {
  "login": "btford",
  "id": 5445410,
  "type": "User",
  "site_admin": false
};

var mockRepository = module.exports.repository = {
  full_name: 'angular/angular.js'
};

var toMergeTemplate = module.exports.commentCreated = {
  action: 'created',
  comment: {
    id: 2,
    body: 'help it broked',
    user: mockUser
  },
  issue: {
    number: 1,
    title: 'everything is broken',
    body: ':(',
    user: mockUser
  },
  repository: mockRepository
};
