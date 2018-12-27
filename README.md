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

### Dependencies
- helm initialize in cluster
- docker available and logged in already to registry
- git available

### Steps for typical normal project:

- commit project code to git repo
- included deployment attributes and charts in package.json
- use custom tool clone the repo,  build images and push to container register
- launch deploy with helm on k8s

### Sample package.json:

```
{
  "deploy": {
    "registry": "(optional, default registry for images)",
    "images": [
      {
        "dockerfile": "(optional, default: Dockerfile)",
        "name": "app1",
        "tag": "0.1.1",
        "path": "(optional, default: .)",
        "registry": "(optional, registry for images)"
      }
    ],
    "charts": [
      {
        "path": "charts (optional, default: charts)",
        "values": "values.prod.yaml",
        "release": "px.app1"
      }
    ]
  }
}

```

### Commandline
```
$ npm i -g git-to-k8s
$ git-to-k8s https://github.com/devfans/git-to-k8s 
 Checking dependencies... 
 Target git remote url: https://github.com/devfans/git-to-k8s 
 Total 4 steps to run 
 Step: 1 / 4 - Clone repo to local temp work directory 
 - shell: mkdir -p /var/tmp/git-to-k8s  
 - shell: cd /var/tmp/git-to-k8s  
 - shell: rm -rf git-to-k8s  
 - shell: git clone --depth=1 https://github.com/devfans/git-to-k8s /var/tmp/git-to-k8s/git-to-k8s  
Cloning into '/var/tmp/git-to-k8s/git-to-k8s'...
 - shell: cd git-to-k8s  
 Step: 2 / 4 - build docker images and push to registry 
 - shell: docker build -t devfans/test:0.0.1 -f sample/Dockerfile sample  
Sending build context to Docker daemon  18.43kB
Step 1/4 : FROM node:alpine
 ---> cc3ade82a1f2
Step 2/4 : COPY package.json package.json
 ---> Using cache
 ---> 0cec40705c46
Step 3/4 : RUN npm install --production
 ---> Using cache
 ---> 4171db2c8f89
Step 4/4 : CMD npm start
 ---> Using cache
 ---> 1c8b6cab22ae
Successfully built 1c8b6cab22ae
Successfully tagged devfans/test:0.0.1
 - shell: docker push devfans/test:0.0.1  
The push refers to repository [docker.io/devfans/test]
c7762379164b: Preparing
6cfb3c56ee53: Preparing
1fe401b6b7c6: Preparing
b15aad9c911d: Preparing
2aebd096e0e2: Preparing
c7762379164b: Layer already exists
6cfb3c56ee53: Layer already exists
1fe401b6b7c6: Layer already exists
b15aad9c911d: Layer already exists
2aebd096e0e2: Layer already exists
0.0.1: digest: sha256:1375e4af0340bac927b89481b236ca128a8c600ff3f2e6a7f52413ab5f954757 size: 1369
 Step: 3 / 4 - deploy charts 
 - shell: helm install --name test-git-to-k8s -f sample/charts/test/values.yaml ./sample/charts/test  
NAME:   test-git-to-k8s
LAST DEPLOYED: Thu Dec 27 07:53:31 2018
NAMESPACE: default
STATUS: DEPLOYED

RESOURCES:
==> v1beta1/Deployment
NAME             AGE
test-git-to-k8s  0s

==> v1/Pod(related)

NAME                              READY  STATUS   RESTARTS  AGE
test-git-to-k8s-5fd6576659-9cxzl  0/1    Pending  0         0s

==> v1/Service

NAME             AGE
test-git-to-k8s  0s


 Step: 4 / 4 - Clean up 
 - shell: rm -rf /var/tmp/git-to-k8s 

```

[npm-image]: https://img.shields.io/npm/v/git-to-k8s.svg
[npm-url]: https://npmjs.org/package/git-to-k8s
[travis-image]: https://img.shields.io/travis/devfans/git-to-k8s/master.svg
[travis-url]: https://travis-ci.org/devfans/git-to-k8s
[coveralls-image]: https://img.shields.io/coveralls/devfans/git-to-k8s/master.svg
[coveralls-url]: https://coveralls.io/r/devfans/git-to-k8s?branch=master
[downloads-image]: https://img.shields.io/npm/dm/git-to-k8s.svg
[downloads-url]: https://npmjs.org/package/git-to-k8s


