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
- helm initialized in Kubernetes cluster (Support helm v3 since 0.4.0)
- docker available and logged in already to registry
- git available

### Steps for a normal project:

- commit project code to git repo
- include deployment attributes in package.json and add charts
- clone the repo to local, build images and push to container registry
- launch deployment with helm on k8s (helm install or helm upgrade)

### Sample package.json:

```
{
  "deploy": {
    "registry": "(optional, default registry for images)",
    "images": [
      {
        "prepare": "npm build (optional)",
        "dockerfile": "(optional, default: Dockerfile)",
        "name": "app1",
        "tag": "0.1.1",
        "path": "(optional, default: .)",
        "registry": "(optional, registry for images)"
      }
    ],
    "namespace": "(optional, default namespace to use for deployments)",
    "charts": [
      {
        "path": "charts (optional, default: charts)",
        "values": "values.prod.yaml",
        "release": "px.app1",
        "namespace": "(optional, namespace for deployment of this chart)"
      }
    ]
  }
}

```

### Commands

Installation
```
$ npm i -g git-to-k8s
$ git-to-k8s --help
Usage: git-to-k8s repo_url [--dry] [-b branch] [-n namespace] [--purge] [--debug] [--local] [--image-only] [--chart-only] 
 Options: 
     -b branch: specify the git branch for a remote repository 
     -n namespace: specify the target namespace for deployment(When specified, 
                   it will override the one specified in package.json if there is any) 
     --help: get help info 
     --local: use a local file system copy as source 
     --purge: purge helm release first before deploy each chart 
     --image-only: only update images to registry 
     --chart-only: only deploy charts without touching images 
     --dry: dry run only and shows commands to execute, with images will be built 
     --debug: show debug info from helm
```
Sample:
```
# Or git-to-k8s https://github.com/devfans/git-to-k8s 
$ git-to-k8s ../git-to-k8s --local 
 Checking dependencies... 
 Target git remote url: ../git-to-k8s 
 Total 4 steps to run 
 Step: 1 / 4 - Copy repo to local temp work directory 
 - shell: mkdir -p /var/tmp/git-to-k8s  
 - shell: cd /var/tmp/git-to-k8s  
 - shell: rm -rf git-to-k8s  
 - shell: cp -rf /Users/stefan/git/git-to-k8s /var/tmp/git-to-k8s/git-to-k8s  
 - shell: cd git-to-k8s  
 Step: 2 / 4 - Build docker images and push to registry 
 - shell: docker build -t devfans/test:0.0.1 -f sample/Dockerfile sample  
Sending build context to Docker daemon  18.43kB
Step 1/5 : FROM node:alpine
 ---> d97a436daee9
Step 2/5 : COPY package.json package.json
 ---> Using cache
 ---> 10b9ecfdaad0
Step 3/5 : COPY index.js index.js
 ---> Using cache
 ---> 791a2c9ae772
Step 4/5 : RUN npm install --production
 ---> Using cache
 ---> cf5e9c30358c
Step 5/5 : CMD npm start
 ---> Using cache
 ---> f3685f97d68f
Successfully built f3685f97d68f
Successfully tagged devfans/test:0.0.1
 - shell: docker push devfans/test:0.0.1  
The push refers to repository [docker.io/devfans/test]
a42f2337f3ac: Preparing
e69bf457f958: Preparing
050688a0d9a4: Preparing
edbc4261579a: Preparing
899ccf6367e3: Preparing
61ab2b48f3de: Preparing
f1b5933fe4b5: Preparing
f1b5933fe4b5: Waiting
61ab2b48f3de: Waiting
e69bf457f958: Layer already exists
edbc4261579a: Layer already exists
050688a0d9a4: Layer already exists
899ccf6367e3: Layer already exists
a42f2337f3ac: Layer already exists
f1b5933fe4b5: Layer already exists
61ab2b48f3de: Layer already exists
0.0.1: digest: sha256:5606ad82de703b895576b0ab6846b5da9aedaa0c0f2e852fd00fea4a408c8757 size: 1783
REVISION: 1
RELEASED: Mon Aug  5 20:06:42 2019
CHART: test-5.0.3
USER-SUPPLIED VALUES:
fullname: test-git-to-k8s
image:
  pullPolicy: IfNotPresent
  registry: docker.io
  repository: devfans/test
  tag: 0.0.1
ingress:
  annotations: {}
  enabled: false
  hosts:
  - test.local
  path: /
  tls: []
resources:
  requests:
    cpu: 10m
    memory: 10Mi
serviceType: ClusterIP
testPath: /
testPort: 80

COMPUTED VALUES:
fullname: test-git-to-k8s
image:
  pullPolicy: IfNotPresent
  registry: docker.io
  repository: devfans/test
  tag: 0.0.1
ingress:
  annotations: {}
  enabled: false
  hosts:
  - test.local
  path: /
  tls: []
resources:
  requests:
    cpu: 10m
    memory: 10Mi
serviceType: ClusterIP
testPath: /
testPort: 80

HOOKS:
MANIFEST:

---
# Source: test/templates/svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: test-git-to-k8s
  labels:
    app: test-git-to-k8s
    chart: "test-5.0.3"
    release: "test-git-to-k8s"
    heritage: "Tiller"
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 80
    targetPort: http
  selector:
    app: test-git-to-k8s
---
# Source: test/templates/deployment.yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: test-git-to-k8s
  labels:
    app: test-git-to-k8s
    chart: "test-5.0.3"
    release: "test-git-to-k8s"
    heritage: "Tiller"
spec:
  selector:
    matchLabels:
      app: test-git-to-k8s
      release: "test-git-to-k8s"
  replicas: 1
  template:
    metadata:
      labels:
        app: test-git-to-k8s
        chart: "test-5.0.3"
        release: "test-git-to-k8s"
    spec:
      containers:
      - name: test-git-to-k8s
        image: "docker.io/devfans/test:0.0.1"
        imagePullPolicy: "IfNotPresent"
        ports:
        - name: http
          containerPort: 3000
        livenessProbe:
          httpGet:
            path: /
            port: http
            httpHeaders:
            - name: Host
              value: "127.0.0.1"
          initialDelaySeconds: 120
          timeoutSeconds: 5
          failureThreshold: 6
        readinessProbe:
          httpGet:
            path: /
            port: http
            httpHeaders:
            - name: Host
              value: "127.0.0.1"
          initialDelaySeconds: 30
          timeoutSeconds: 3
          periodSeconds: 5
        resources:
          requests:
            cpu: 10m
            memory: 10Mi
 Step: 3 / 4 - Deploy charts 
 - shell: helm upgrade -f sample/charts/test/values.yaml test-git-to-k8s sample/charts/test  
Release "test-git-to-k8s" has been upgraded.
LAST DEPLOYED: Mon Aug  5 20:08:26 2019
NAMESPACE: default
STATUS: DEPLOYED

RESOURCES:
==> v1/Pod(related)
NAME                              READY  STATUS   RESTARTS  AGE
test-git-to-k8s-5bb8d969bc-j6p5t  1/1    Running  0         105s

==> v1/Service
NAME             TYPE       CLUSTER-IP    EXTERNAL-IP  PORT(S)  AGE
test-git-to-k8s  ClusterIP  172.20.36.14  <none>       80/TCP   105s

==> v1beta1/Deployment
NAME             READY  UP-TO-DATE  AVAILABLE  AGE
test-git-to-k8s  1/1    1           1          105s


 Step: 4 / 4 - Clean up 
 - shell: rm -rf /var/tmp/git-to-k8s/git-to-k8s  
```

[npm-image]: https://img.shields.io/npm/v/git-to-k8s.svg
[npm-url]: https://npmjs.org/package/git-to-k8s
[travis-image]: https://img.shields.io/travis/devfans/git-to-k8s/master.svg
[travis-url]: https://travis-ci.org/devfans/git-to-k8s
[coveralls-image]: https://img.shields.io/coveralls/devfans/git-to-k8s/master.svg
[coveralls-url]: https://coveralls.io/r/devfans/git-to-k8s?branch=master
[downloads-image]: https://img.shields.io/npm/dm/git-to-k8s.svg
[downloads-url]: https://npmjs.org/package/git-to-k8s


