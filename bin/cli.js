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
const packageJSON = require('../package.json');

const showErrorAndQuit = (error) => {
  console.error(chalk.red(error.message));
  console.error('Join our Gitter channel if you need any help!');
  console.error('  https://gitter.im/resin-io/chat');
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
  includeMergeCommits: {
    type: 'boolean',
    default: false
  },
  getIncrementLevelFromCommit: {
    type: 'function',
    default: _.constant(null),
    allowsPresets: true
  },
  addEntryToChangelog: {
    type: 'function',
    default: 'prepend',
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

const parseConfiguration = (data) => {
  return _.mapValues(CONFIGURATION, (propertyDescription, propertyName) => {
    const value = _.get(data, propertyName) || propertyDescription.default;

    if (_.isString(value) && propertyDescription.allowsPresets) {
      const propertyPresets = _.get(presets, propertyName, {});
      const presetFunction = _.get(propertyPresets, value);

      if (!presetFunction) {
        throw new Error(`Invalid preset: ${propertyName} -> ${value}`);
      }

      // Set the context to the available presets for that property
      // This is useful to that users can make use of a preset,
      // but extend it depending on their needs, without needing
      // to duplicate functionality from the original preset.
      return _.bind(presetFunction, propertyPresets);

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
    from: {
      describe: 'start reference',
      string: true,
      alias: 'f'
    },
    to: {
      describe: 'end reference',
      string: true,
      alias: 't'
    },
    current: {
      describe: 'current version',
      string: true,
      alias: 'u',
      required: true
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
  .example('$0 --from v1.0.0 --to v1.1.0 --current 1.1.0')
  .fail((message) => {

    // Prints to `stderr` by default
    yargs.showHelp();

    console.error(message);
    process.exit(1);
  })
  .argv;

async.waterfall([

  (callback) => {
    versionist.readCommitHistory(path.join(argv.config.path, argv.config.gitDirectory), {
      startReference: argv.from,
      endReference: argv.to,
      subjectParser: argv.config.subjectParser,
      bodyParser: argv.config.bodyParser
    }, callback);
  },

  (history, callback) => {
    const entry = versionist.generateChangelog(history, {
      template: argv.config.template,
      includeCommitWhen: argv.config.includeCommitWhen,
      version: versionist.calculateNextVersion(history, {
        getIncrementLevelFromCommit: argv.config.getIncrementLevelFromCommit,
        currentVersion: argv.current
      })
    });

    argv.config.addEntryToChangelog(argv.config.changelogFile, entry, callback);
  }

], (error) => {
  if (error) {
    return showErrorAndQuit(error);
  }

  console.log('Done');
});
