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
 * @module Versionist.Semver
 */

const semver = require('semver');
const _ = require('lodash');

/**
 * @summary Valid increment levels
 * @type {String[]}
 * @constant
 *
 * The order of the increment levels in this
 * array determines the comparison logic results
 * from `.getHigherIncrementLevel()`.
 * Elements with higher indexes have precedence
 * over other elements with lower indexes.
 */
const VALID_INCREMENT_LEVELS = [
  'patch',
  'minor',
  'major'
];

/**
 * @summary Check if an increment level is valid
 * @function
 * @private
 *
 * @param {String} level - increment level
 * @returns {Boolean} whether the increment level is valid
 *
 * @example
 * if (semver.isValidIncrementLevel('major')) {
 *   console.log('This is a valid increment level');
 * }
 */
exports.isValidIncrementLevel = (level) => {
  return _.includes(VALID_INCREMENT_LEVELS, level);
};

/**
 * @summary Get higher increment level from two levels
 * @function
 * @private
 *
 * @param {String} firstLevel - first increment level
 * @param {String} secondLevel - second increment level
 * @returns {String} higher increment level
 *
 * @example
 * const higherLevel = semver.getHigherIncrementLevel('minor', 'major');
 * console.log(higherLevel);
 * > major
 */
exports.getHigherIncrementLevel = (firstLevel, secondLevel) => {
  _.each([ firstLevel, secondLevel ], (level) => {
    if (_.every([
      !_.isUndefined(level),
      !_.isNull(level),
      !exports.isValidIncrementLevel(level)
    ])) {
      throw new Error(`Invalid increment level: ${level}`);
    }
  });

  if (!firstLevel && !secondLevel) {
    return null;
  }

  const firstLevelIndex = _.indexOf(VALID_INCREMENT_LEVELS, firstLevel);
  const secondLevelIndex = _.indexOf(VALID_INCREMENT_LEVELS, secondLevel);

  return _.nth(VALID_INCREMENT_LEVELS, Math.max(firstLevelIndex, secondLevelIndex));
};

/**
 * @summary Calculate next increment level from commits
 * @function
 * @public
 *
 * @description
 * The `getIncrementLevelFromCommit()` option gets passed the full
 * commit object and should return a valid semver incremenet
 * level extracted from the commit depending on your guidelines.
 *
 * @param {Object[]} commits - commits
 * @param {Object} options - options
 * @param {Function} options.getIncrementLevelFromCommit - get level from commit
 * @returns {String} increment level
 *
 * @example
 * const level = semver.calculateNextIncrementLevel([
 *   {
 *     subject: 'minor - foo bar',
 *     ...
 *   },
 *   {
 *     subject: 'major - hello world',
 *     ...
 *   },
 *   {
 *     subject: 'minor - hey there',
 *     ...
 *   }
 * ], {
 *   getIncrementLevelFromCommit: (commit) => {
 *     return commit.subject.split(' ')[0];
 *   }
 * });
 */
exports.calculateNextIncrementLevel = (commits, options = {}) => {

  if (_.isEmpty(commits)) {
    throw new Error('No commits to calculate the next increment level from');
  }

  return _.reduce(commits, (currentLevel, commit) => {
    const commitLevel = options.getIncrementLevelFromCommit(commit);
    return exports.getHigherIncrementLevel(commitLevel, currentLevel);
  }, null);
};

/**
 * @summary Increment a version following semver
 * @function
 * @public
 *
 * @param {String} version - original version
 * @param {String} incrementLevel - increment level
 * @returns {String} incremented version
 *
 * @example
 * const version = semver.incrementVersion('1.0.0', 'major');
 * console.log(version);
 * > 2.0.0
 */
exports.incrementVersion = (version, incrementLevel) => {
  if (!exports.isValidIncrementLevel(incrementLevel)) {
    throw new Error(`Invalid increment level: ${incrementLevel}`);
  }

  if (!semver.valid(version)) {
    throw new Error(`Invalid version: ${version}`);
  }

  return semver.inc(version, incrementLevel);
};
