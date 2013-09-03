var should = require('should');
var rewire = require('rewire');
var doubleOhSeven = require('007');
var sinon = require('sinon');

describe('Cache', function () {

  var cache,
    fs;

  beforeEach(function () {
    var Cache = rewire('../lib/cache');
    fs = doubleOhSeven(Cache.__get__('fs'));
    Cache.__set__('fs', fs);
    cache = Cache();
  });

  describe('#set', function () {
    it('should save to the right location', function () {
      cache.set('foo', {});
      should.equal(fs.writeFileSync.callHistory[0][0], process.cwd() + '/../.cache/foo.json');
    });
  });

  describe('#get', function () {
    beforeEach(function () {
      fs.readFileSync.implementation = function () {
        return '{"foo": "bar"}';
      };
    });

    it('should parse JSON', function () {
      should.exist(cache.get('foo'));
    });
  });
});
