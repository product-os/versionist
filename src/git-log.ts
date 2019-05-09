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
 * @module Versionist.GitLog
 */

import * as yaml from 'js-yaml';
import * as _ from 'lodash';
import * as tags from './tags';

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
type OptionalField<T, F extends keyof T> = Overwrite<T, Partial<Pick<T, F>>>;
export interface Commit {
	subject: string;
	hash?: string;
	body: string;
	footer?: _.Dictionary<string>;
}

/**
 * @summary Git log `--pretty` option that outputs YAML
 * @type {String}
 * @private
 * @constant
 *
 * This constant is extracted for testing purposes,
 * so we can use it in our assertions instead of
 * having to harcode the ugly result of this
 * string in all tests cases.
 *
 * See https://git-scm.com/docs/pretty-formats
 */
export const GIT_LOG_YAML_PRETTY_FORMAT = [
	'- hash: %H',
	'  subject: >-',
	'    %s',
	'  body: |-',

	// This is a hack to force the YAML parser
	// to parse indented body strings.
	// If we have a commit whose body is indented, like:
	//
	//   My commit
	//
	//    Lorem ipsum
	//
	//   Foo bar
	//
	// YAML will (rightfully) complain that the body is
	// not indented correctly.
	//
	// As a workaround, we pass a static string on the
	// correct indentation as the first line of the body
	// and then omit it in the parser.
	'    XXX',

	'    %w(0,0,4)%b',
].join('%n');

/**
 * @summary Get `git log` revision range
 * @function
 * @private
 *
 * @description
 * See `man git-log` for a more in-depth explanation
 * of revision ranges.
 *
 * @param {Object} [options={}] - options
 * @param {String} [options.startReference] - start reference
 * @param {String} [options.endReference] - end reference
 * @returns {String} `git log` revision range
 *
 * @example
 * const revisionRange = gitLog.getGitLogRevisionRange({
 *   startReference: 'mytag1',
 *   endReference: 'mytag2'
 * });
 */
export const getGitLogRevisionRange = ({
	startReference,
	endReference = 'HEAD',
}: { startReference?: string; endReference?: string } = {}): string => {
	if (startReference) {
		return `${startReference}..${endReference}`;
	}

	// Passing a single reference causes git to list
	// commits from the beginning of the repository
	// to the tag you specify.
	return endReference;
};

/**
 * @summary Get `git log` command that outputs YAML
 * @function
 * @private
 *
 * @param {Object} options - options
 * @param {String} options.gitDirectory - path to `.git` directory
 * @param {String} [options.startReference] - start reference
 * @param {String} [options.endReference] - end reference
 * @param {Boolean} [options.includeMergeCommits=false] - include merge commits
 * @returns {String[]} log command arguments
 *
 * @throws Will throw if the `gitDirectory` option is missing.
 *
 * @example
 * const command = gitLog.getGitLogCommandArgumentsThatOutputYaml({
 *   gitDirectory: 'path/to/.git',
 *   startReference: 'mytag1',
 *   endReference: 'mytag2',
 *   includeMergeCommits: false
 * });
 */
export const getGitLogCommandArgumentsThatOutputYaml = (
	options: { gitDirectory: string; includeMergeCommits?: boolean } & Parameters<
		typeof getGitLogRevisionRange
	>[0],
): string[] => {
	if (!options) {
		throw new Error('Missing the options');
	}

	if (!options.gitDirectory) {
		throw new Error('Missing the gitDirectory option');
	}

	const command = [
		`--git-dir=${options.gitDirectory}`,
		'log',
		`--pretty=${GIT_LOG_YAML_PRETTY_FORMAT}`,
	];

	if (!options.includeMergeCommits) {
		command.push('--no-merges');
	}

	command.push(getGitLogRevisionRange(options));

	return command;
};

/**
 * @summary Parse `git log` YAML output
 * @function
 * @private
 *
 * @description
 * This function allows to inject project-specific extra
 * parsing logic by the use of hooks.
 *
 * @param {String} output - git log YAML output
 * @param {Object} [options={}] - options
 * @param {Function} [options.subjectParser] - subject parser hook
 * @param {Function} [options.bodyParser] - body parser hook
 * @param {Boolean} [options.parseFooterTags=true] - parse footer tags
 * @param {Boolean} [options.lowerCaseFooterTags] - lowercase footer tag keys
 * @returns {Object[]} parsed commits
 *
 * @example
 * const command = gitLog.getGitLogCommandArgumentsThatOutputYaml({
 *   gitDirectory: 'path/to/.git',
 *   startReference: 'mytag1',
 *   endReference: 'mytag2'
 * });
 *
 * const output = childProcess.execSync(`git ${command.join(' ')}`).toString();
 *
 * const commits = gitLog.parseGitLogYAMLOutput(output, {
 *   parseFooterTags: true,
 *   subjectParser: (subject) => {
 *     return subject.toUpperCase();
 *   },
 *   bodyParser: (body) => {
 *     return body.split('\n');
 *   }
 * });
 */
export const parseGitLogYAMLOutput = (
	output: string,
	{
		subjectParser = _.identity,
		bodyParser = _.identity,
		parseFooterTags = true,
		lowerCaseFooterTags = false,
	} = {},
): Commit[] => {
	return _.map(
		yaml.safeLoad(output),
		(commit: Commit): Commit => {
			if (_.isUndefined(commit.subject)) {
				throw new Error('Invalid commit: no subject');
			}

			if (_.isUndefined(commit.body)) {
				throw new Error('Invalid commit: no body');
			}

			// Omit the first line in the body
			commit.body = _.chain(commit.body)
				.split('\n')
				.tail()
				.join('\n')
				.value();

			// The commit object to be returned
			const commitObj: OptionalField<Commit, 'body'> = {
				subject: subjectParser(commit.subject),
				hash: commit.hash,
			};

			if (!parseFooterTags) {
				return {
					...commitObj,
					body: bodyParser(commit.body),
				};
			}

			// We iterate on the commit body lines in reverse, and
			// start considering footer tags. Footer tags are parsed
			// until a blank line or an invalid footer tag is
			// encountered, in which case the remaining of the
			// commit is considered to be the body.

			const commitDescription = _.chain(commit.body)
				.split('\n')
				.reduceRight(
					(accumulator, commitLine) => {
						const isTag = tags.isTagLine(commitLine);

						if (_.isEmpty(commitLine.trim()) || !isTag) {
							accumulator.considerTags = false;
						}

						if (accumulator.considerTags && isTag) {
							accumulator.footer.unshift(commitLine);
						} else {
							accumulator.body.unshift(commitLine);
						}

						return accumulator;
					},
					{
						considerTags: true,
						body: [] as string[],
						footer: [] as string[],
					},
				)
				.value();

			// Assign the formatted body and footer tags
			return {
				...commitObj,
				body: bodyParser(commitDescription.body.join('\n')),
				footer: tags.parseFooterTagLines(commitDescription.footer, {
					lowerCaseFooterTags,
				}),
			};
		},
	);
};
