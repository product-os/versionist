#!/usr/bin/env node

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
 * @module Versionist.CLI
 */

const chalk = require('chalk');

const errorHandling = require('../lib/cli/error-handling');
const argsParser = require('../lib/args-parser');
const versionist = require('../lib/versionist');

// parse args
const parsedArgs = argsParser.parse(process.argv.slice(2));

// set global error handler
process.on('uncaughtException', errorHandling.showErrorAndQuit);

// run the rool
versionist.runWithParsedArgs(parsedArgs)
  .then((output) => {

    // display output depending on output object
    if (output) {
      const {
        latest, gitReference, entry
      } = output;
      if (latest) {
        console.log(latest);
      } else if (gitReference) {
        console.log(gitReference);
      } else if (entry) {
        console.log(chalk.green(entry));
        console.log('Done');
      }
    }
  })
  .catch(errorHandling.showErrorAndQuit);
