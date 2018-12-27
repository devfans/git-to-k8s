process.env.NO_DEPRECATION = 'git-to-k8s';

var after = require('after')
var assert = require('assert')
var lib = require('../')

describe('git-to-k8s', function(){
  it('should success', function() {
    const mf = new lib.MainFlow();
    lib.logger.info('Testing')
    lib.shell.run('pwd')
  })

})
