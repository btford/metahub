var rewire = require('rewire');
var doubleOhSeven = require('007');

var cache = rewire('../lib/cache');
cache.__set__('fs', doubleOhSeven(cache.__get__('fs')));


describe('Cache', function () {

});

