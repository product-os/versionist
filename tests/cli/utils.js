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

const _ = require('lodash');
const shelljs = require('shelljs');
const path = require('path');

exports.getTestTemporalPathFromFilename = (filename) => {
  const extension = path.extname(filename);
  const name = path.basename(filename, extension);
  return path.join(__dirname, 'temporal', name);
};

exports.createCommit = (title, tags) => {
  const footer = _.join(_.map(tags, (value, name) => {
    return `${name}: ${value}`;
  }), '\n');

  shelljs.echo([
    title,
    '',
    footer
  ].join('\n')).to('message.txt');

  shelljs.exec('git -c "user.name=Versionist" -c "user.email=versionist@resin.io" commit --allow-empty -F message.txt');
};

exports.createVersionistConfiguration = (configuration) => {
  shelljs.echo(configuration).to('versionist.conf.js');
};

exports.callVersionist = (opts) => {
  const cliPath = path.join(__dirname, '..', '..', 'bin', 'cli.js');

  const configString = _.reduce(opts, function(result, value, key) {
    if (key === 'cmd' || key === 'command') {
      result = ` ${value} ${result}`;
    } else {
      result += ` --${key}=${value}`;
    }
    return result;
  }, '');

  return shelljs.exec(`node ${cliPath}${configString}`);
};
