var should = require('should');

var stripUrl = require('../lib/strip-url');

describe('strip-url', function () {
  it('should remove url property from an object', function () {
    stripUrl({ url: 'github.com' }).should.not.have.property('url');
  });

  it('should remove all properties suffixed with `url`', function () {
    stripUrl({ some_url: 'github.com' }).should.not.have.property('some_url');
  });

  it('should remove url properties in a deeply nested object', function () {
    var result = stripUrl({ foo: { url: 'github.com' } });
    result.should.have.property('foo');
    result.foo.should.not.have.property('url');
  });

  it('should remove url properties from objects in an array', function () {
    stripUrl([{ url: 'github.com' }]).should.have.lengthOf(1).and.includeEql({});
  });

  it('should not strip non-url properties', function () {
    stripUrl({ uri: 'not/a/url' }).should.have.property('uri', 'not/a/url');
  });
});

