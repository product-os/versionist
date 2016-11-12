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

/**
 * @module Versionist.Tags
 */

const _ = require('lodash');

/**
 * @summary Is line a tag line?
 * @function
 * @public
 *
 * @param {String} line - commit line
 * @returns {Boolean} whether the line represents a tag line
 *
 * @example
 * if (tags.isTagLine('Foo: bar')) {
 *   console.log('This line represents a tag');
 * }
 */
exports.isTagLine = (line) => {
  return _.some([
    /^[\w-]+(\s+)?:[^//]/.test(line),
    /^[\w-]+(\s+)?:$/.test(line)
  ]);
};

/**
 * @summary Parse a tag line
 * @function
 * @private
 *
 * @param {String} line - commit line
 * @returns {Object} parsed tag
 *
 * @example
 * const parsedTag = tags.parseTagLine('Foo: bar');
 *
 * console.log(parsedTag.key);
 * > Foo
 * console.log(parsedTag.value);
 * > bar
 */
exports.parseTagLine = (line) => {
  const firstColonIndex = _.indexOf(line, ':');

  return {
    key: line.slice(0, firstColonIndex).trim(),
    value: line.slice(firstColonIndex + 1).trim() || undefined
  };
};

/**
 * @summary Parse footer tags lines
 * @function
 * @public
 *
 * @param {String[]} footerTagLines - footer tag lines
 * @returns {Object} parsed tags
 *
 * @example
 * const footer = tags.parseFooterTagLines([
 *   'Foo: bar',
 *   'Bar: baz'
 * ]);
 *
 * console.log(footer.Foo);
 * > bar
 *
 * console.log(footer.Bar);
 * > baz
 */
exports.parseFooterTagLines = (footerTagLines) => {
  return _.chain(footerTagLines)
    .reject((line) => {
      return _.isEmpty(line.trim());
    })
    .map((tagLine) => {
      const tag = exports.parseTagLine(tagLine);

      return [
        tag.key,
        tag.value
      ];
    })
    .fromPairs()
    .value();
};
