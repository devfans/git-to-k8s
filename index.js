#! /usr/bin/env node

const fs = require('fs');
const path = require('path');
const argio = require('argio');
const parser = argio();
const _shell = require('shelljs');
const pkg = require('./package.json');

class Logger {
  constructor() {
  }

  log(...args) {
    console.log(...args)
  }

  info(...args) {
    args.push("\x1b[0m")
    console.log("\x1b[36m", ...args)
  }

  iinfo(...args) {
    args.push("\x1b[0m")
    console.log("\x1b[46m", ...args)
  }


  tip(...args) {
    args.push("\x1b[0m")
    console.log("\x1b[32m", ...args)
  }

  note(...args) {
    args.push("\x1b[0m")
    console.log("\x1b[2m", ...args)
  }


  head(...args) {
    args.push("\x1b[0m")
    console.log("\x1b[42m", ...args)
  }

  warn(...args) {
    args.push("\x1b[0m")
    console.log("\x1b[33m", ...args)
  }

  error(...args) {
    args.push("\x1b[0m")
    console.log("\x1b[31m",  ...args)
  }

  fatal(...args) {
    args.push("\x1b[0m")
    console.log("\x1b[41m", ...args)
    this.exit_error()
  }

  exit_success () {
    process.exit(0)
  }

  exit_error () {
    this.error('Exiting now..')
    process.exit(2)
  }

}

const logger = new Logger();
const shell = {
  parse_special (cmd, ...args) {
    if (/^cd /.test(cmd)) {
      _shell.cd(cmd.replace(/^cd /, ''))
      return false
    } else {
      return true
    }
  },
  run (cmd, ...args) {
    if (!shell.parse_special(cmd, ...args)) return
    const ctx = _shell.exec(cmd, ...args)
    if (ctx.code !== 0) logger.fatal(`Failed to run ${args.join(' ')}`)
    return ctx
  },
  safe_run(cmd, ...args) {
    if (!shell.parse_special(cmd, ...args)) return
    const ctx = _shell.exec(cmd, ...args)
    if (ctx.code !== 0) logger.warn(`Failed to run ${args.join(' ')}`)
    return ctx
  }
}

class Step {
  constructor (options = {}) {
    this.pre_hook = options.pre
    this.post_hook = options.post
    this.name = options.name
    this.cmds = options.cmds
    this.fatal = options.fatal !== false
    this.checked = false
    this.dry_cmds = options.dry_cmds || []
  }
}

class Image {
  constructor (options = {}) {
    this.dockerfile = options.dockerfile || 'Dockerfile'
    this.name = options.name
    this.tag = options.tag
    this.path = options.path || '.'
    this.registry = options.registry
  } 
}

class Chart {
  constructor (options = {}) {
    this.path = options.path || 'charts'
    this.values = options.values
    this.release = options.release
  }
}

class MainFlow {
  constructor () {
    this.deps = ['git', 'docker', 'helm', 'kubectl']
    this.dry = parser.get('dry') !== undefined
    this.steps = []
  }

  run () {
    if (parser.get('version')) {
      logger.info(pkg.version)
      logger.exit_success()
    }

    if (parser.subcommand === undefined) logger.fatal('Git remote url is required!')
    this.repo_url = parser.subcommand
    const _repo_name = /\/([^\/]+)$/.exec(this.repo_url)
    if (!_repo_name) logger.fatal(`Invalid repo url!`)
    this.repo_name = _repo_name[1].replace(/.git$/, '').replace(/[^\w.-]/g, '')
    this.check_deps()

    if (this.dry) this._dry_run()
    else this._run()
  }

  parse_proj() {
    // read package.json in project
    try {
      this.proj = JSON.parse(fs.readFileSync(path.join(pkg.tmp_dir, this.repo_name, pkg.proj_file)))
      this.images = this.proj.deploy.images.map(_image => new Image({
        name: _image.name,
        path: _image.path,
        tag: _image.tag,
        dockerfile: _image.dockerfile,
        registry: _image.registry || this.proj.deploy.registry
      }))
      this.charts = this.proj.deploy.charts.map(_chart => new Chart({
        path: _chart.path,
        values: _chart.values,
        release: _chart.release
      }))
    } catch (e) {
      logger.error(e)
      logger.fatal(`Invalid file: ${pkg.proj_file}`)
    }

  }

  prepare() {
    const parse_proj = this.parse_proj.bind(this)
    parse_proj.dry = true

    // STEP-1: clone repo
    this.steps.push(new Step({
      name: 'Clone repo to local temp work directory',
      cmds: [
        `mkdir -p ${pkg.tmp_dir}`,
        `cd ${pkg.tmp_dir}`,
        `rm -rf ${this.repo_name}`,
        `git clone --depth=1 ${this.repo_url} ${path.join(pkg.tmp_dir, this.repo_name)}`,
        `cd ${this.repo_name}`
      ],
      dry_cmds: [
        `mkdir -p ${pkg.tmp_dir}`,
        `cd ${pkg.tmp_dir}`,
        `rm -rf ${this.repo_name}`,
        `git clone --depth=1 ${this.repo_url} ${path.join(pkg.tmp_dir, this.repo_name)}`,
        `cd ${this.repo_name}`
      ],
      post: parse_proj
    }))

    // STEP-2: build and images
    this.steps.push(() => new Step({
      name: 'build docker images and push to registry',
      cmds: this.images.map(image => {
        const tag = path.join(image.registry, image.name) + ':' + image.tag
        const dir = image.path || '.'
        return `docker build -t ${tag} -f ${path.join(dir, image.dockerfile)} ${dir}`
      }).concat(this.images.map(image => `docker push ${path.join(image.registry, image.name) + ':' + image.tag}`)),
      dry_cmds: this.images.map(image => {
        const tag = path.join(image.registry, image.name) + ':' + image.tag
        const dir = image.path || '.'
        return `docker build -t ${tag} -f ${path.join(dir, image.dockerfile)} ${dir}`
      })
    }))

    // STEP-3: deploy charts
    this.steps.push(() => new Step({
      name: 'deploy charts',
      cmds: this.charts.map(chart => {
        const dir = path.join(chart.path, chart.values)
        if (_shell.exec(`helm list | grep ${chart.release}`).code == 0) {
          return `helm upgrade --name ${chart.release} -f ${dir} ./${chart.path}`
        }
        return `helm install --name ${chart.release} -f ${dir} ./${chart.path}`
      })
    }))

    // STEP-4: clean up
    this.steps.push(new Step({
      name: 'Clean up',
      cmds: [
        `rm -rf ${pkg.tmp_dir}`
      ],
      dry_cmds: [
        `rm -rf ${pkg.tmp_dir}`
      ]
    }))

    logger.iinfo(`Target git remote url: ${this.repo_url}`)
    logger.info(`Total ${this.steps.length} steps to run`)
  }

  _run () {
    this.prepare() 
    this.steps.forEach((_step, index) => {
      const step = typeof(_step) === 'object' ? _step : _step()
      logger.iinfo(`Step: ${1 + index} / ${this.steps.length} - ${step.name}`)
      if (step.pre_hook) step.pre_hook()
      step.cmds.forEach(cmd => {
        logger.tip(`- shell: ${cmd} `)
        if (step.fatal) shell.run(cmd)
        else shell.safe_run(cmd)
      })
      if (step.post_hook) step.post_hook()
    })

  }

  _dry_run() {
    logger.iinfo('dry running...')
    this.prepare() 
    this.steps.forEach((_step, index) => {
      const step = typeof(_step) === 'function' ? _step() : _step
      logger.iinfo(`Step: ${1 + index} / ${this.steps.length} - ${step.name}`)
      if (step.pre_hook && step.pre_hook.dry) step.pre_hook()
      step.dry_cmds.forEach(cmd => {
        logger.tip(`- shell: ${cmd} `)
        if (step.fatal) shell.run(cmd)
        else shell.safe_run(cmd)
      })
      if (step.post_hook && step.post_hook.dry) step.post_hook()
    })
  }

  check_deps() {
    logger.note(`Checking dependencies...`)
    this.deps.forEach(dep => {
      if (!_shell.which(dep)) logger.fatal(`No ${dep} was installed!`)
    })
  }
}

(function () {
  const mf = new MainFlow()
  mf.run()
}) ()

