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

const indentString = require('indent-string');

/**
 * @summary Format commit in a similar way we ask git to do it with `--pretty`
 * @function
 * @public
 *
 * @param {Object} options - options
 * @param {String} options.subject - commit subject
 * @param {String} options.body - commit body
 * @returns {String} formatted commit
 *
 * @example
 * const formattedCommit = utils.formatCommit({
 *   subject: 'Do x, y, and z',
 *   body: 'Foo\nbar'
 * });
 */
exports.formatCommit = (options) => {
  return [
    '- subject: >-',
    `    ${options.subject}`,
    '  body: |-',
    '    XXX',
    indentString(options.body, 4)
  ].join('\n');
};
