/*
 * Copyright 2016 Resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const _ = require('lodash');
const EventEmitter = require('events').EventEmitter;
const indentString = require('indent-string');

/**
 * @summary Format commit in a similar way we ask git to do it with `--pretty`
 * @function
 * @public
 *
 * @param {Object} options - options
 * @param {String} options.hash - commit hash
 * @param {String} options.subject - commit subject
 * @param {String} options.body - commit body
 * @returns {String} formatted commit
 *
 * @example
 * const formattedCommit = utils.formatCommit({
 *   hash: b8ca72ee58bddc9d174b71615aaa0159849b2aca
 *   subject: 'Do x, y, and z',
 *   body: 'Foo\nbar'
 * });
 */
exports.formatCommit = (options) => {
  return [
    `- hash: ${options.hash}`,
    '  subject: >-',
    `    ${options.subject}`,
    '  body: |-',
    '    XXX',
    indentString(options.body, 4)
  ].join('\n');
};

/**
 * @summary Create a ChildProcess object stub
 * @function
 * @public
 *
 * @returns {EventEmitter} ChildProcess stub
 *
 * @example
 * const child = utils.createChildProcessStub();
 * child.stdout.emit('foo');
 */
exports.createChildProcessStub = () => {
  const child = new EventEmitter();

  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = _.noop;

  return child;
};
