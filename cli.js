#! /usr/bin/env node

const MainFlow = require('./index').MainFlow;

(function () {
  const mf = new MainFlow()
  mf.run()
}) ()

