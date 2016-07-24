#!/usr/bin/env node

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
 * @module Versionist.CLI
 */

const yargs = require('yargs');
const _ = require('lodash');
const async = require('async');
const path = require('path');
const chalk = require('chalk');
const versionist = require('../lib/versionist');
const presets = require('../lib/presets');
const semver = require('../lib/semver');
const packageJSON = require('../package.json');

const showErrorAndQuit = (error) => {
  console.error(chalk.red(error.message));
  console.error('Join our Gitter channel if you need any help!');
  console.error('  https://gitter.im/resin-io/versionist');
  process.exit(1);
};

const CONFIGURATION = {
  path: {
    type: 'string',
    default: process.cwd()
  },
  changelogFile: {
    type: 'string',
    default: 'CHANGELOG.md'
  },
  gitDirectory: {
    type: 'string',
    default: '.git'
  },
  parseFooterTags: {
    type: 'boolean',
    default: true
  },
  editChangelog: {
    type: 'boolean',
    default: true
  },
  editVersion: {
    type: 'boolean',
    default: true
  },
  subjectParser: {
    type: 'function',
    default: _.identity,
    allowsPresets: true
  },
  bodyParser: {
    type: 'function',
    default: _.identity,
    allowsPresets: true
  },
  includeCommitWhen: {
    type: 'function',
    default: _.constant(true),
    allowsPresets: true
  },
  transformTemplateData: {
    type: 'function',
    default: _.identity,
    allowsPresets: true
  },
  includeMergeCommits: {
    type: 'boolean',
    default: false
  },
  getChangelogDocumentedVersions: {
    type: 'function',
    default: 'changelog-headers',
    allowsPresets: true
  },
  getIncrementLevelFromCommit: {
    type: 'function',
    default: _.constant(null),
    allowsPresets: true
  },
  getGitReferenceFromVersion: {
    type: 'function',
    default: _.identity,
    allowsPresets: true
  },
  addEntryToChangelog: {
    type: 'function',
    default: 'prepend',
    allowsPresets: true
  },
  updateVersion: {
    type: 'function',
    default: 'npm',
    allowsPresets: true
  },
  template: {
    type: 'string',
    default: [
      '## {{version}} - {{moment date "Y-MM-DD"}}',
      '',
      '{{#each commits}}',
      '{{#if this.subject.title}}',
      '- {{capitalize this.subject.title}}',
      '{{else}}',
      '- {{capitalize this.subject}}',
      '{{/if}}',
      '{{/each}}'
    ].join('\n')
  }
};

const isPresetProperty = (value) => {
  return _.some([
    _.isString(value),
    _.isPlainObject(value) && _.isString(value.preset)
  ]);
};

const parsePresetDefinition = (value) => {
  if (_.isString(value)) {
    return {
      name: value,
      options: {}
    };
  }

  return {
    name: value.preset,
    options: _.omit(value, 'preset')
  };
};

const parseConfiguration = (data) => {
  return _.mapValues(CONFIGURATION, (propertyDescription, propertyName) => {
    const value = _.attempt(() => {
      const currentValue = _.get(data, propertyName);

      if (_.isUndefined(currentValue) || _.isNull(currentValue)) {
        return propertyDescription.default;
      }

      return currentValue;
    });

    if (isPresetProperty(value) && propertyDescription.allowsPresets) {
      const propertyPresets = _.get(presets, propertyName, {});
      const presetDefinition = parsePresetDefinition(value);
      const presetFunction = _.get(propertyPresets, presetDefinition.name);

      if (!presetFunction) {
        throw new Error(`Invalid preset: ${propertyName} -> ${presetDefinition.name}`);
      }

      return _.partial(presetFunction, presetDefinition.options);
    }

    if (typeof value !== propertyDescription.type) {
      throw new Error([
        `Invalid option value: ${value}.`,
        `The \`${propertyName}\` option expects a ${propertyDescription.type},`,
        `but instead got a ${typeof value}.`
      ].join(' '));
    }

    return value;
  });
};

const argv = yargs
  .usage('Usage: $0 [OPTIONS]')
  .help()
  .version(packageJSON.version)
  .config('config', 'configuration file', (file) => {
    try {
      return {
        config: parseConfiguration(_.attempt(() => {
          try {
            return require(file);
          } catch (error) {

            if (error.code === 'MODULE_NOT_FOUND') {
              throw new Error(`Can't find ${file}`);
            } else if (error instanceof SyntaxError) {
              throw new Error(`Syntax error in configuration file: ${file}`);
            }

            throw new Error(error.message);
          }
        }))
      };
    } catch (error) {
      showErrorAndQuit(error);
    }
  })
  .options({
    current: {
      describe: 'current version',
      string: true,
      alias: 'u'
    },
    config: {
      describe: 'configuration file',
      alias: 'c',
      global: true,
      default: path.join('.', `${packageJSON.name}.conf.js`)
    },
    help: {
      describe: 'show help',
      boolean: true,
      alias: 'h'
    },
    version: {
      describe: 'show version number',
      boolean: true,
      alias: 'v'
    }
  })
  .example('$0 --current 1.1.0')
  .fail((message) => {

    // Prints to `stderr` by default
    yargs.showHelp();

    console.error(message);
    process.exit(1);
  })
  .argv;

async.waterfall([

  (callback) => {
    argv.config.getChangelogDocumentedVersions(argv.config.changelogFile, callback);
  },

  (documentedVersions, callback) => {
    versionist.readCommitHistory(path.join(argv.config.path, argv.config.gitDirectory), {
      startReference: argv.config.getGitReferenceFromVersion(semver.getGreaterVersion(documentedVersions)),
      endReference: 'HEAD',
      subjectParser: argv.config.subjectParser,
      bodyParser: argv.config.bodyParser
    }, (error, history) => {
      return callback(error, documentedVersions, history);
    });
  },

  (documentedVersions, history, callback) => {
    const version = versionist.calculateNextVersion(history, {
      getIncrementLevelFromCommit: argv.config.getIncrementLevelFromCommit,
      currentVersion: argv.current || semver.getGreaterVersion(documentedVersions)
    });

    if (_.includes(documentedVersions, version)) {
      console.log(`Omitting: ${version}`);
      return callback(null, null);
    }

    const entry = versionist.generateChangelog(history, {
      template: argv.config.template,
      includeCommitWhen: argv.config.includeCommitWhen,
      transformTemplateData: argv.config.transformTemplateData,
      version: version
    });

    if (argv.config.editChangelog) {
      argv.config.addEntryToChangelog(argv.config.changelogFile, entry, (error) => {
        return callback(error, version);
      });
    } else {
      console.log(entry);
      return callback(null, version);
    }
  },

  (version, callback) => {
    if (argv.config.editVersion) {
      argv.config.updateVersion(process.cwd(), version, callback);
    } else {
      return callback();
    }
  }

], (error) => {
  if (error) {
    return showErrorAndQuit(error);
  }

  console.log('Done');
});

process.on('uncaughtException', showErrorAndQuit);
