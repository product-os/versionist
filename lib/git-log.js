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
 * @module Versionist.GitLog
 */

const _ = require('lodash');
const yaml = require('js-yaml');
const tags = require('./tags');

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
exports.GIT_LOG_YAML_PRETTY_FORMAT = [
  '- subject: >-',
  '    %s',
  '  body: |-',
  '    %w(0,0,4)%b'
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
exports.getGitLogRevisionRange = (options = {}) => {

  _.defaults(options, {
    endReference: 'HEAD'
  });

  if (options.startReference) {
    return `${options.startReference}..${options.endReference}`;
  }

  // Passing a single reference causes git to list
  // commits from the beginning of the repository
  // to the tag you specify.
  return options.endReference;

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
 * @returns {String} `git log` command
 *
 * @throws Will throw if the `gitDirectory` option is missing.
 *
 * @example
 * const command = gitLog.getGitLogCommandThatOutputsYaml({
 *   gitDirectory: 'path/to/.git',
 *   startReference: 'mytag1',
 *   endReference: 'mytag2',
 *   includeMergeCommits: false
 * });
 */
exports.getGitLogCommandThatOutputsYaml = (options = {}) => {

  if (!options.gitDirectory) {
    throw new Error('Missing the gitDirectory option');
  }

  const command = [
    'git',
    `--git-dir=${options.gitDirectory}`,
    'log',
    `--pretty="${exports.GIT_LOG_YAML_PRETTY_FORMAT}"`
  ];

  if (!options.includeMergeCommits) {
    command.push('--no-merges');
  }

  return `${command.join(' ')} ${exports.getGitLogRevisionRange(options)}`;
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
 * @returns {Object[]} parsed commits
 *
 * @example
 * const command = gitLog.getGitLogCommandThatOutputsYaml({
 *   gitDirectory: 'path/to/.git',
 *   startReference: 'mytag1',
 *   endReference: 'mytag2'
 * });
 *
 * const output = childProcess.execSync(command).toString();
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
exports.parseGitLogYAMLOutput = (output, options = {}) => {

  _.defaults(options, {
    subjectParser: _.identity,
    bodyParser: _.identity,
    parseFooterTags: true
  });

  return _.map(yaml.safeLoad(output), (commit) => {

    if (_.isUndefined(commit.subject)) {
      throw new Error('Invalid commit: no subject');
    }

    if (_.isUndefined(commit.body)) {
      throw new Error('Invalid commit: no body');
    }

    if (!options.parseFooterTags) {
      return {
        subject: options.subjectParser(commit.subject),
        body: options.bodyParser(commit.body)
      };
    }

    // We iterate on the commit body lines in reverse, and
    // start considering footer tags. Footer tags are parsed
    // until a blank line or an invalid footer tag is
    // encountered, in which case the remaining of the
    // commit is considered to be the body.

    const commitDescription = _.chain(commit.body)
      .split('\n')
      .reduceRight((accumulator, commitLine) => {
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
      }, {
        considerTags: true,
        body: [],
        footer: []
      })
      .value();

    return {
      subject: options.subjectParser(commit.subject),
      body: options.bodyParser(commitDescription.body.join('\n')),
      footer: tags.parseFooterTagLines(commitDescription.footer)
    };
  });
};

