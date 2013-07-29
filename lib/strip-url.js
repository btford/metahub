// recursively remove *url props
var stripUrl = module.exports = function (obj) {
  if (obj instanceof Array) {
    return obj.map(stripUrl);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).
      filter(function (key) {
        return key.substr(-3) !== 'url';
      }).
      reduce(function (newObj, prop) {
        newObj[prop] = stripUrl(obj[prop]);
        return newObj;
      }, {});
  } else {
    return obj;
  }
};
