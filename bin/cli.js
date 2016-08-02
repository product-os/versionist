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

const childProcess = require('child_process');
const yargs = require('yargs');
const _ = require('lodash');
const async = require('async');
const path = require('path');
const chalk = require('chalk');
const versionist = require('../lib/versionist');
const semver = require('../lib/semver');
const configuration = require('../lib/cli/configuration');
const packageJSON = require('../package.json');

const showErrorAndQuit = (error) => {
  console.error(chalk.red(error.message));
  console.error(chalk.red(error.stack));
  console.error('Join our Gitter channel if you need any help!');
  console.error('  https://gitter.im/resin-io/versionist');
  process.exit(1);
};

const referenceExists = (reference, callback) => {
  const child = childProcess.spawn('git', [ 'show-ref', '--quiet', reference ]);
  child.on('error', callback);
  child.on('close', (code) => {
    return callback(null, code === 0);
  });
};

const argv = yargs
  .usage('Usage: $0 [OPTIONS]')
  .help()
  .version(packageJSON.version)
  .config('config', 'configuration file', (file) => {
    try {
      return {
        config: configuration.parse(configuration.load(file))
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
    const versions = _.attempt(() => {
      if (_.isEmpty(documentedVersions)) {
        return [ argv.config.defaultInitialVersion ];
      }

      return documentedVersions;
    });

    const gitReference = argv.config.getGitReferenceFromVersion(semver.getGreaterVersion(versions));
    return referenceExists(gitReference, (error, exists) => {
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

  (documentedVersions, startReference, callback) => {
    versionist.readCommitHistory(path.join(argv.config.path, argv.config.gitDirectory), {
      startReference: startReference,
      endReference: 'HEAD',
      subjectParser: argv.config.subjectParser,
      bodyParser: argv.config.bodyParser,
      parseFooterTags: argv.config.parseFooterTags
    }, (error, history) => {
      return callback(error, documentedVersions, history);
    });
  },

  (documentedVersions, history, callback) => {
    const version = versionist.calculateNextVersion(history, {
      getIncrementLevelFromCommit: argv.config.getIncrementLevelFromCommit,
      currentVersion: argv.current || semver.getGreaterVersion(documentedVersions),
      incrementVersion: argv.config.incrementVersion
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
