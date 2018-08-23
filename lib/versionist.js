/*
 * Copyright 2018 Resin.io
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
 * @module Versionist
 */

const _ = require('lodash');
const childProcess = require('child_process');
const path = require('path');
const async = require('async');
const gitLog = require('./git-log');
const template = require('./template');
const semver = require('./semver');
const argsParser = require('./args-parser');

/**
 * @summary Read history from a git directory
 * @function
 * @public
 *
 * @description
 * This function is a facade around all the other
 * helper functions created in this module, and its
 * the only one the client should call.
 *
 * @param {String} gitDirectory - path to `.git` directory
 * @param {Object} [options={}] - options
 * @param {String} [options.startReference] - start reference
 * @param {String} [options.endReference] - end reference
 * @param {Function} [options.subjectParser] - subject parser hook
 * @param {Function} [options.bodyParser] - body parser hook
 * @param {Boolean} [options.includeMergeCommits=false] - include merge commits
 * @param {Boolean} [options.parseFooterTags=true] - parse footer tags
 * @param {Function} callback - callback (error, commits)
 *
 * @example
 * versionist.readCommitHistory('path/to/.git', {
 *   startReference: 'v1.0.0',
 *   endReference: 'v1.1.0',
 *   subjectParser: (subject) => {
 *     return subject.toUpperCase();
 *   },
 *   bodyParser: (body) => {
 *     return body.split('\n');
 *   }
 * }, (error, commits) => {
 *   if (error) {
 *     throw error;
 *   }
 *
 *   console.log(commits);
 * });
 */
exports.readCommitHistory = (gitDirectory, options = {}, callback) => {

  if (!gitDirectory) {
    throw new Error('Missing gitDirectory');
  }

  const command = gitLog.getGitLogCommandArgumentsThatOutputYaml({
    gitDirectory: gitDirectory,
    startReference: options.startReference,
    endReference: options.endReference,
    includeMergeCommits: options.includeMergeCommits
  });

  const child = childProcess.spawn('git', command);
  let stdout = '';

  child.stdout.on('data', (data) => {
    stdout += data;
  });

  child.stderr.on('data', (data) => {
    child.kill();
    return callback(new Error(data));
  });

  child.on('error', (error) => {
    child.kill();
    return callback(error);
  });

  child.on('close', (code) => {
    if (code !== 0) {
      return callback(new Error(`Child process exitted with error code: ${code}`));
    }

    const parsedCommits = gitLog.parseGitLogYAMLOutput(stdout, {
      subjectParser: options.subjectParser,
      bodyParser: options.bodyParser,
      parseFooterTags: options.parseFooterTags,
      lowerCaseFooterTags: options.lowerCaseFooterTags
    });

    return callback(null, parsedCommits);
  });
};

/**
 * @summary Calculate next Semver version from a list of commits
 * @function
 * @public
 *
 * @param {Object[]} commits - commits
 * @param {Object} options - options
 * @param {String} options.currentVersion - current semver version
 * @param {Function} options.getIncrementLevelFromCommit - get increment level from commit
 * @param {Function} options.incrementVersion - increment version function
 * @returns {String} next version
 *
 * @example
 * const semver = require('semver');
 *
 * const nextVersion = versionist.calculateNextVersion([
 *   {
 *     subject: 'foo bar',
 *     ...
 *   },
 *   ...
 * ], {
 *   currentVersion: '1.1.0',
 *   incrementVersion: semver.inc,
 *   getIncrementLevelFromCommit: (commit) => {
 *     // Return a valid increment level from the commit
 *   }
 * });
 */
exports.calculateNextVersion = (commits, options = {}) => {

  if (!options.currentVersion) {
    throw new Error('Missing the currentVersion option');
  }

  if (!options.getIncrementLevelFromCommit) {
    throw new Error('Missing the getIncrementLevelFromCommit option');
  }

  if (!_.isFunction(options.getIncrementLevelFromCommit)) {
    throw new Error(`Invalid getIncrementLevelFromCommit option: ${options.getIncrementLevelFromCommit}`);
  }

  if (!options.incrementVersion) {
    throw new Error('Missing the incrementVersion option');
  }

  if (!_.isFunction(options.incrementVersion)) {
    throw new Error(`Invalid incrementVersion option: ${options.incrementVersion}`);
  }

  const incrementLevel = semver.calculateNextIncrementLevel(commits, {
    getIncrementLevelFromCommit: options.getIncrementLevelFromCommit
  });

  if (!incrementLevel) {
    return options.currentVersion;
  }

  return options.incrementVersion(options.currentVersion, incrementLevel);
};

/**
 * @summary Generate CHANGELOG from commits
 * @function
 * @public
 *
 * @param {Object[]} commits - commits
 * @param {Object} options - options
 * @param {String} options.version - current semver version
 * @param {Function} [options.includeCommitWhen] - include commit filter predicate
 * @param {Function} [options.transformTemplateData] - transform template data
 * @param {Date} [options.date=new Date()] - date object
 * @returns {String} CHANGELOG
 *
 * @example
 * const CHANGELOG = versionist.generateChangelog([
 *   {
 *     subject: 'foo bar',
 *     ...
 *   },
 *   ...
 * ], {
 *   version: '1.1.0',
 *   template: [
 *     '{{#each commits}}',
 *     '{{this.subject}}',
 *     '{{/each}}'
 *   ].join('\n')
 * });
 */
exports.generateChangelog = (commits, options = {}) => {

  if (_.isEmpty(commits)) {
    throw new Error('No commits to generate the CHANGELOG from');
  }

  if (!options.template) {
    throw new Error('Missing the template option');
  }

  if (!options.version) {
    throw new Error('Missing the version option');
  }

  _.defaults(options, {
    date: new Date(),
    includeCommitWhen: _.constant(true),
    transformTemplateData: _.identity
  });

  if (!(options.date instanceof Date)) {
    throw new Error(`Invalid date option: ${options.date}`);
  }

  semver.checkValid(options.version);

  const templateData = options.transformTemplateData({
    commits: _.filter(commits, options.includeCommitWhen),
    version: options.version,
    date: options.date
  });

  return template.render(options.template, templateData);
};

/**
 * @summary Check if a git reference exists
 * @function
 * @public
 *
 * @param {String} reference - the reference (eg. "v2.14.0" or "4f576d3")
 * @param {Function} callback - an `async.waterfall` callback function (error, params...)
 *
 * @example
 * async.waterfall([
 *      (callback) => { callback(null, 'v12.4.0') },
 *      versionist.referenceExists,
 *      (exists, callback) => {
 *          if (exists) {
 *              // do something
 *          }
 *      },
 *  ],
 *  errorHandler
 * );
 */
exports.referenceExists = (reference, callback) => {
  const child = childProcess.spawn('git', [ 'show-ref', '--quiet', reference ]);
  child.on('error', callback);
  child.on('close', (code) => {
    return callback(null, code === 0);
  });
};

/**
 * @summary Create a sequence of command line arguments for the versionist CLI
 * @function
 * @public
 *
 * @param {Object} opts - a dictionary of key-value pairs with a special
 *  cmd/command key which can be used to define the command (eg. get version)
 * @returns {Array} - an array of args (essentially, argv) which can be used to
 *  construct: `node bin/cli.js ${...argv}`
 *
 */
exports.argvFromOpts = (opts) => {
  let argv = [];

  if (!opts) {
    return '';
  }

  // extract the cmd/command and place it at the front of the argv list we're
  // building
  if (opts.cmd || opts.command) {
    argv = argv.concat((opts.cmd || opts.command).split(' '));
    opts = _.omit(opts, 'cmd', 'command');
  }

  // concat all other key-value pairs to the argv list and return it
  return argv.concat(_.map(opts, (value, key) => {
    return `--${key}=${value}`;
  }));
};

/**
 * @summary Create a parsed args object the likes of which is consumed by
 *  `versionist.run()`
 * @function
 * @public
 *
 * @param {Object} opts - a dictionary of key-value pairs with a special
 *  cmd/command key which can be used to define the command (eg. get version)
 * @returns {Object} - the parsed args object
 *
 */
exports.parsedArgsFromOpts = (opts) => {
  const argv = exports.argvFromOpts(opts);
  return argsParser.parse(argv);
};

/**
 * @summary Run the versionist tool given args passed via an opts object
 * @function
 * @public
 *
 * @param {Object} opts - a dictionary of key-value pairs with a special
 *  cmd/command key which can be used to define the command (eg. get version)
 * @returns {Promise} - resolves with an output object, rejects with any errors encountered
 *
 */
exports.runWithOpts = (opts) => {
  return exports.runWithParsedArgs(exports.parsedArgsFromOpts(opts));
};

/**
 * @summary Run the versionist tool given args parsed from the argParser
 * @function
 * @public
 *
 * @param {Object} parsedArgs - the parsed arguments from cli (or from
 *  `parsedArgsFromOpts()`)
 * @returns {Promise} - resolves with an output object, rejects with any errors encountered
 *
 */
exports.runWithParsedArgs = (parsedArgs) => {

  const stopError = 'E_STOP';

  return new Promise((resolve, reject) => {

    const result = (obj) => {
      resolve(obj);
      return new Error(stopError);
    };

    async.waterfall([

      // get the list of versions already known in the changelog file
      (callback) => {
        parsedArgs.configuration.getChangelogDocumentedVersions(parsedArgs.configuration.changelogFile, callback);
      },

      // given these documented versions,
      // if parsedArgs.target === 'version', return the latest version
      // if parsedArgs.target === 'reference', return the git reference of the latest version
      // else, continue along the async waterfall only if the reference exists
      (documentedVersions, callback) => {
        const versions = _.attempt(() => {
          if (_.isEmpty(documentedVersions)) {
            return [ parsedArgs.configuration.defaultInitialVersion ];
          }

          return documentedVersions;
        });
        const latest = semver.getGreaterVersion(versions);
        if (parsedArgs.target === 'version') {
          return result({
            latest
          });
        }

        const gitReference = parsedArgs.configuration.getGitReferenceFromVersion(latest);
        if (parsedArgs.target === 'reference') {
          return result({
            gitReference
          });
        }
        return exports.referenceExists(gitReference, (error, exists) => {
          if (error) {
            return callback(error);
          }

          if (exists) {
            return callback(null, versions, gitReference);
          }

          if (_.isEmpty(documentedVersions)) {
            return callback(null, versions, null);
          }

          return callback(new Error(`Omitting ${gitReference}. No valid git reference was found.`));
        });
      },

      // read through the commit history between the git reference of the latest version and
      // HEAD, passing the history along to the next function in this waterfall
      (documentedVersions, startReference, callback) => {
        exports.readCommitHistory(path.join(parsedArgs.configuration.path, parsedArgs.configuration.gitDirectory), {
          startReference: startReference,
          endReference: 'HEAD',
          subjectParser: parsedArgs.configuration.subjectParser,
          bodyParser: parsedArgs.configuration.bodyParser,
          parseFooterTags: parsedArgs.configuration.parseFooterTags,
          lowerCaseFooterTags: parsedArgs.configuration.lowerCaseFooterTags
        }, (errorOrNull, history) => {
          return callback(errorOrNull, documentedVersions, history);
        });
      },

      // Check if the user wants to use a custom base version for the increment.
      // Defaulting to the latest documented version returned from
      // `getChangelogDocumentedVersions`.
      (documentedVersions, history, callback) => {
        if (parsedArgs.current) {
          return callback(null, parsedArgs.current, documentedVersions, history);
        }
        return parsedArgs.configuration.getCurrentBaseVersion(documentedVersions, history, (error, current) => {
          return callback(error, current, documentedVersions, history);
        });
      },

      // given the versions in the changelog and the history from parsing the
      // commit log, determine what the next version number should be
      (currentVersion, documentedVersions, history, callback) => {
        const version = exports.calculateNextVersion(history, {
          getIncrementLevelFromCommit: parsedArgs.configuration.getIncrementLevelFromCommit,
          currentVersion: currentVersion,
          incrementVersion: parsedArgs.configuration.incrementVersion
        });

        // if the calculated "next version" is already in the list of versions,
        // we return en error
        if (_.includes(documentedVersions, version)) {
          return callback(new Error(`No commits were annotated with a change type since version ${version}`));
        }

        // generate the changelog entry from the commit history and the calculated
        // next version
        const entry = exports.generateChangelog(history, {
          template: parsedArgs.configuration.template,
          includeCommitWhen: parsedArgs.configuration.includeCommitWhen,
          transformTemplateData: parsedArgs.configuration.transformTemplateData,
          version: version
        });

        // if parsedArgs.dry, simply return the entry as output, otherwise, add the
        // entry to the changelog
        if (parsedArgs.dry) {
          return result({
            entry
          });
        } else if (parsedArgs.configuration.editChangelog) {
          parsedArgs.configuration.addEntryToChangelog(parsedArgs.configuration.changelogFile, entry, (errorOrNull) => {
            return callback(errorOrNull, version);
          });
        } else {
          return callback(null, version);
        }
      },

      // update the version (for example, in package.json) if configured to do so
      (version, callback) => {
        if (parsedArgs.configuration.editVersion) {
          if (_.isFunction(parsedArgs.configuration.updateVersion)) {
            parsedArgs.configuration.updateVersion(process.cwd(), version, callback);
          } else {
            async.applyEachSeries(parsedArgs.configuration.updateVersion, process.cwd(), version, callback);
          }
        } else {
          return result();
        }
      }

    ],
    (error) => {
      // error handler (can receive null, stopError used to terminate the waterfall
      // early, or a real error)
      if (error === null) {
        resolve();
      } else if (!(error.message === stopError)) {
        reject(error);
      }
    }

    // END async.waterfall()
    );

  // END new Promise()
  });

// END exports.runWithParsedArgs()
};
