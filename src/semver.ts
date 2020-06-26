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

/**
 * @module Versionist.Semver
 */

import * as _ from 'lodash';
import * as semver from 'resin-semver';
import { Commit } from './git-log';

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
const VALID_INCREMENT_LEVELS = ['patch', 'minor', 'major'] as const;
export type ValidIncrementLevel = typeof VALID_INCREMENT_LEVELS[number];

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
export const isValidIncrementLevel = (
	level: string,
): level is ValidIncrementLevel => {
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
export const getHigherIncrementLevel = (
	firstLevel?: string | null,
	secondLevel?: string | null,
): ValidIncrementLevel | null => {
	_.each([firstLevel, secondLevel], (level) => {
		if (level != null && !isValidIncrementLevel(level)) {
			throw new Error(`Invalid increment level: ${level}`);
		}
	});

	if (!firstLevel && !secondLevel) {
		return null;
	}

	const firstLevelIndex = _.indexOf(VALID_INCREMENT_LEVELS, firstLevel);
	const secondLevelIndex = _.indexOf(VALID_INCREMENT_LEVELS, secondLevel);

	return VALID_INCREMENT_LEVELS[Math.max(firstLevelIndex, secondLevelIndex)];
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
export const calculateNextIncrementLevel = (
	commits: Commit[],
	options: {
		getIncrementLevelFromCommit: (commit: Commit) => ValidIncrementLevel;
	},
): ValidIncrementLevel | null => {
	if (_.isEmpty(commits)) {
		throw new Error('No commits to calculate the next increment level from');
	}

	return _.reduce(
		commits,
		(currentLevel, commit) => {
			const commitLevel = options.getIncrementLevelFromCommit(commit);
			return getHigherIncrementLevel(commitLevel, currentLevel);
		},
		null,
	);
};

/**
 * @summary Check if a semver version is valid
 * @function
 * @public
 *
 * @param {String} version - version
 * @return {Boolean} true if the version is valid
 *
 * @example
 * const valid = semver.checkValid('v1.0.0');
 * console.log(valid);
 * > true
 * semver.checkValid('foo');
 * > Error: invalid version foo
 */
export const checkValid = (version: string): boolean => {
	if (!semver.valid(version)) {
		throw new Error(`Invalid version: ${version}`);
	}
	return true;
};

/**
 * @summary Get greater semantic version
 * @function
 * @public
 *
 * @param {String[]} versions - versions
 * @returns {String} greater version
 *
 * @example
 * const version = semver.getGreaterVersion([
 *   '2.1.1',
 *   '2.1.0',
 *   '2.0.0'
 * ]);
 *
 * console.log(version);
 * > 2.1.1
 */
export const getGreaterVersion = (versions: string[]): string | undefined => {
	return _.first(
		versions
			.map((v) => {
				return v.trim();
			})
			.sort(semver.rcompare),
	);
};

export * from 'resin-semver';
