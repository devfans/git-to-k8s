# git-to-k8s
Small tool to automate the git to url flow on k8s


# Steps for typical normal project:

 commit project code to git repo
 included deployment attributes and charts in package.json
 use custom tool clone the repo,  build images and push to container register
 launch deploy with helm on k8s

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
