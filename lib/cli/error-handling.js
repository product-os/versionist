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
 * @module Versionist.CLI.ErrorHandling
 */

const chalk = require('chalk');

const packageJSON = require('../../package.json');
const debug = require('debug')(packageJSON.name);

exports.showErrorAndQuit = (error) => {
  console.error(chalk.red(error.message));
  debug(chalk.red(error.stack));
  console.error('If you run into any issues, feel free to let us know on GitHub!');
  console.error('  https://github.com/resin-io/versionist/issues');
  process.exit(1);
};
