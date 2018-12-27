# git-to-k8s
[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

Small tool to automate the git to url flow on k8s

## Installation
```
npm install -g git-to-k8s
```

## Get Started
# Steps for typical normal project:

- commit project code to git repo
- included deployment attributes and charts in package.json
- use custom tool clone the repo,  build images and push to container register
- launch deploy with helm on k8s

Sample package.json:
```
{
  "deploy": {
    "images": [
      {
        "dockerfile": "(optional, default: Dockerfile)",
        "name": "app1",
        "tag": "0.1.1",
        "dir": "(optional, default: .)"
      }
    ],
    "charts": [
      {
        "path": "charts (optional, default: charts)",
        "values": "values.prod.yaml",
        "release": "app1"
      }
    ]
  }
}
```

[npm-image]: https://img.shields.io/npm/v/git-to-k8s.svg
[npm-url]: https://npmjs.org/package/git-to-k8s
[travis-image]: https://img.shields.io/travis/devfans/git-to-k8s/master.svg
[travis-url]: https://travis-ci.org/devfans/git-to-k8s
[coveralls-image]: https://img.shields.io/coveralls/devfans/git-to-k8s/master.svg
[coveralls-url]: https://coveralls.io/r/devfans/git-to-k8s?branch=master
[downloads-image]: https://img.shields.io/npm/dm/git-to-k8s.svg
[downloads-url]: https://npmjs.org/package/git-to-k8s


