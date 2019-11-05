/**
 * Copyright 2018, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Commit: https://github.com/census-instrumentation/opencensus-node/commit/79d10bc3ddb8502959e23f046c04a154d444114e
/* eslint-disable camelcase */
/* eslint-disable prefer-rest-params */

Object.defineProperty(exports, '__esModule', { value: true })
const core_1 = require('@opencensus/core')
const shimmer = require('shimmer')
const replacer = require('./replacer')

/** MongoDB instrumentation plugin for Opencensus */
class MongoDBPlugin extends core_1.BasePlugin {
  /** Constructs a new MongoDBPlugin instance. */
  constructor(moduleName) {
    super(moduleName)
    this.SERVER_FNS = ['insert', 'update', 'remove']
    this.CURSOR_FNS_FIRST = ['next', '_next']
    this.extensiveDbInformation = !!process.env.TRACING_CAPTURE_MONGO_QUERIES_ENABLED
  }
  /**
   * Patches MongoDB operations.
   */
  applyPatch() {
    this.logger.debug('Patched MongoDB')
    if (this.moduleExports.Server) {
      this.logger.debug('patching mongodb-core.Server.prototype.command')
      shimmer.wrap(this.moduleExports.Server.prototype, 'command', this.getPatchCommand())
      this.SERVER_FNS.forEach(fnName => {
        this.logger.debug(`patching mongodb-core.Server.prototype.${fnName}`)
        shimmer.wrap(this.moduleExports.Server.prototype, fnName, this.getPatchQuery(fnName))
      })
    }
    if (this.moduleExports.Cursor) {
      this.logger.debug('patching mongodb-core.Cursor.prototype functions:', this.CURSOR_FNS_FIRST)
      shimmer.massWrap([this.moduleExports.Cursor.prototype], this.CURSOR_FNS_FIRST, this.getPatchCursor())
    }
    return this.moduleExports
  }
  /** Unpatches all MongoDB patched functions. */
  applyUnpatch() {
    shimmer.unwrap(this.moduleExports.Server.prototype, 'command')
    shimmer.massUnwrap(this.moduleExports.Server.prototype, this.SERVER_FNS)
    shimmer.massUnwrap(this.moduleExports.Cursor.prototype, this.CURSOR_FNS_FIRST)
  }
  /** Creates spans for Command operations */
  getPatchCommand() {
    const plugin = this
    return (original) => function(
      ns,
      // tslint:disable-next-line:no-any
      command, options, callback
    ) {
      const resultHandler = typeof options === 'function' ? options : callback

      if (plugin.tracer.currentRootSpan &&
        arguments.length > 0 &&
                    typeof resultHandler === 'function') {
        let type
        let database = ''
        if (command.createIndexes) {
          type = 'createIndexes'
        } else if (command.findandmodify) {
          type = 'findAndModify'
        } else if (command.findAndModify) {
          type = 'findAndModify'
          database = `.${command.findAndModify}`
        } else if (command.ismaster) {
          type = 'isMaster'
        } else if (command.count) {
          type = 'count'
        } else {
          type = 'command'
        }

        const span = plugin.tracer.startChildSpan({
          name: `${ns}${database}.${type}`,
          kind: core_1.SpanKind.SERVER
        })

        if (plugin.extensiveDbInformation) {
          const maskedCmd = JSON.stringify(command, replacer)
          span.addAttribute('cmd', maskedCmd)
        }

        if (typeof options === 'function') {
          return original.call(this, ns, command, plugin.patchEnd(span, options))
        }

        return original.call(this, ns, command, options, plugin.patchEnd(span, callback))
      }
      return original.apply(this, arguments)
    }
  }
  /** Creates spans for Query operations */
  getPatchQuery(label) {
    const plugin = this
    return (original) => function(
      ns,
      // tslint:disable-next-line:no-any
      command,
      // tslint:disable-next-line:no-any
      options, callback
    ) {
      const resultHandler = typeof options === 'function' ? options : callback
      if (plugin.tracer.currentRootSpan &&
                    arguments.length > 0 &&
                    typeof resultHandler === 'function') {
        const span = plugin.tracer.startChildSpan({
          name: `${ns}.query.${label}`,
          kind: core_1.SpanKind.SERVER
        })
        if (plugin.extensiveDbInformation) {
          const maskedCmd = JSON.stringify(command, replacer)
          span.addAttribute('cmd', maskedCmd)
        }
        if (typeof options === 'function') {
          return original.call(this, ns, command, plugin.patchEnd(span, options))
        }

        return original.call(this, ns, command, options, plugin.patchEnd(span, callback))
      }
      return original.apply(this, arguments)
    }
  }
  /** Creates spans for Cursor operations */
  getPatchCursor() {
    const plugin = this
    return (original) =>
    // tslint:disable-next-line:no-any
      function(...args) {
        let resultHandler = args[0]
        if (plugin.tracer.currentRootSpan &&
                    arguments.length > 0 &&
                    typeof resultHandler === 'function') {
          const span = plugin.tracer.startChildSpan({
            name: `${this.ns}.cursor`,
            kind: core_1.SpanKind.SERVER
          })
          if (plugin.extensiveDbInformation) {
            const maskedCmd = JSON.stringify(this.cmd, replacer)
            span.addAttribute('cmd', maskedCmd)
          }
          resultHandler = plugin.patchEnd(span, resultHandler)
        }
        return original.call(this, resultHandler)
      }
  }

  /**
     * Ends a created span.
     * @param span The created span to end.
     * @param resultHandler A callback function.
     */
  patchEnd(span, resultHandler) {
    // tslint:disable-next-line:no-any
    return function patchedEnd() {
      span.end()
      return resultHandler.apply(this, arguments)
    }
  }
}
exports.MongoDBPlugin = MongoDBPlugin
const plugin = new MongoDBPlugin('mongodb')
exports.plugin = plugin
