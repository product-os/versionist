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
 * @module Versionist.ArgsParser
 */

const yargs = require('yargs');
const path = require('path');

const packageJSON = require('../package.json');
const configuration = require('./cli/configuration');
const errorHandling = require('./cli/error-handling');

exports.parse = (argv) => {
  const parser = yargs
    .usage('Usage: $0 [OPTIONS]')
    .help()
    .version(packageJSON.version)
    .config('config', 'configuration file', (file) => {
      try {
        return {
          configuration: configuration.parse(configuration.load(file))
        };
      } catch (error) {
        errorHandling.showErrorAndQuit(error);
      }
    })
    .options({
      current: {
        describe: 'set current version',
        string: true,
        alias: 'u'
      },
      dry: {
        describe: 'Dry run',
        boolean: true,
        alias: 'd'
      },
      config: {
        describe: 'configuration file',
        alias: 'c',
        global: true,
        default: configuration.firstExistingFile(
          [ path.join('.', `${packageJSON.name}.conf.js`), path.join(__dirname, `../${packageJSON.name}.conf.js`) ]
        )
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
    .command('get <target>', 'get latest documented version or reference', (yargsGet) => {
      yargsGet.positional('target', {
        choices: [ 'version', 'reference' ],
        describe: 'get current version or reference',
        type: 'string'
      })
      .example('$0 get version');
    })
    .example('$0 --current 1.1.0')
    .fail((message) => {

      // Prints to `stderr` by default
      yargs.showHelp();

      console.error(message);
      process.exit(1);
    });
  return parser.parse(argv);
};
