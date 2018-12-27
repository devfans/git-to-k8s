process.env.NO_DEPRECATION = 'argio';

var after = require('after')
var assert = require('assert')
var argio = require('../')

describe('argio', function(){
  process.argv = 'node script.js subcommand1 subcommand2 -p1 v1 v2 v3 --s1 -p2 v4 v5'.split(' ')
  parser = argio()

  it('get function', function(){
    assert.equal(typeof argio, 'function')
  })

  it('should success', function() {
    assert.equal(parser.params.s1, true)
    assert.equal(parser.subcommand, 'subcommand1')
    assert.equal(parser.params.s2, undefined)
    assert.equal(parser.get('p1'), 'v1')
    assert.equal(parser.get('s1'), true)
  })

})
