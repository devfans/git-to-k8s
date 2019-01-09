'use strict'

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
    this.prepare = options.prepare
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
    this.debug = parser.get('debug') !== undefined
    this.local = parser.get('local') !== undefined
    this.purge_first = parser.get('purge') !== undefined
    this.repo_branch = parser.get('b') || 'master'
    this.steps = []
  }

  run () {
    if (parser.get('version')) {
      logger.info(pkg.version)
      logger.exit_success()
    }

    if (parser.get('help')) {
      logger.info('Usage: git-to-k8s repo_url [--dry] [-b branch] [--purge] [--debug] [--local]')
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
        registry: _image.registry || this.proj.deploy.registry,
        prepare: _image.prepare
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
    const make_repo_copy = () => {
      let get_repo_cmd = `git clone --single-branch --branch ${this.repo_branch} --depth=1 ${this.repo_url} ${path.join(pkg.tmp_dir, this.repo_name)}`
      if (this.local) get_repo_cmd = `cp -rf ${path.resolve(this.repo_url)} ${path.join(pkg.tmp_dir, this.repo_name)}`
      const cmds = [
        `mkdir -p ${pkg.tmp_dir}`,
        `cd ${pkg.tmp_dir}`,
        `rm -rf ${this.repo_name}`,
        get_repo_cmd,
        `cd ${this.repo_name}`
      ]
      return {
        name: `${this.local? 'Copy' : 'Clone'} repo to local temp work directory`,
        cmds,
        dry_cmds: cmds,
        post: parse_proj
      }
    }
    this.steps.push(new Step(make_repo_copy()))

    // STEP-2: build and images
    this.steps.push(() => {
      // build image
      const cmds_build_image = []
      this.images.forEach(image => {
        const tag = path.join(image.registry, image.name) + ':' + image.tag
        const dir = image.path || '.'
        if (image.prepare && image.prepare.length > 0) cmds_build_image.push(image.prepare)
        cmds_build_image.push(`docker build -t ${tag} -f ${path.join(dir, image.dockerfile)} ${dir}`)
      })

      // push image
      const cmds_push_image = this.images.map(image => `docker push ${path.join(image.registry, image.name) + ':' + image.tag}`)

      return new Step({
        name: 'Build docker images and push to registry',
        cmds: cmds_build_image.concat(cmds_push_image),
        dry_cmds: cmds_build_image
      })
    })

    // STEP-3: deploy charts
    this.steps.push(() => {
      const cmds = []

      this.charts.forEach(chart => {
        const dir = path.join(chart.path, chart.values)
        if (_shell.exec(`helm get ${chart.release}`).code == 0) {
          if (this.purge_first) {
            cmds.push(`helm delete ${chart.release} --purge${this.debug ? ' --debug': ''}`)
          } else {
            cmds.push(`helm upgrade -f ${dir} ${chart.release} ${chart.path}${this.debug ? ' --debug': ''}`)
            return
          }
        }
        cmds.push(`helm install --name ${chart.release} -f ${dir} ${chart.path}${this.debug ? ' --debug': ''}`)
      })
      return new Step({
        name: 'Deploy charts',
        cmds
      })
    })

    // STEP-4: clean up
    this.steps.push(new Step({
      name: 'Clean up',
      cmds: [
        `rm -rf ${path.join(pkg.tmp_dir, this.repo_name)}`
      ],
      dry_cmds: [
        `rm -rf ${path.join(pkg.tmp_dir, this.repo_name)}`
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

module.exports = { MainFlow, Logger, logger, shell, Image, Step, Chart }
