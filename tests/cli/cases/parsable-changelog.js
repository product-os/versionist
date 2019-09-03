/*
 * Copyright 2019 Balena.io
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

const m = require('mochainon');
const shelljs = require('shelljs');
const utils = require('../utils');
const presets = require('../../../lib/presets');
const yaml = require('js-yaml');
const _ = require('lodash');
const TEST_DIRECTORY = utils.getTestTemporalPathFromFilename(__filename);

shelljs.rm('-rf', TEST_DIRECTORY);
shelljs.mkdir('-p', TEST_DIRECTORY);
shelljs.cd(TEST_DIRECTORY);

utils.createVersionistConfiguration([
  '\'use strict\';',
  'module.exports = {',
  '  subjectParser: \'angular\',',
  '  editVersion: false,',
  '  addEntryToChangelog: \'prepend\',',
  '  includeCommitWhen: (commit) => {',
  '    return commit.footer[\'Changelog-Entry\'];',
  '  },',
  '  getIncrementLevelFromCommit: (commit) => {',
  '    return commit.footer[\'Change-Type\'];',
  '  },',
  '  template: [',
  '    \'## {{version}}\',',
  '    \'\',',
  '    \'{{#each commits}}\',',
  '    \'{{#with footer}}\',',
  '    \'- {{capitalize Changelog-Entry}}\',',
  '    \'{{/with}}\',',
  '    \'{{/each}}\'',
  '  ].join(\'\\n\')',
  '};',
  ''
].join('\n'));

shelljs.exec('git init');
shelljs.mkdir('-p', '.versionbot');

utils.createCommit('feat: implement x', {
  'Changelog-Entry': 'Implement x',
  'Change-Type': 'minor'
});

utils.callVersionist();

m.chai.expect(shelljs.cat('CHANGELOG.md').stdout).to.deep.equal([
  `${presets.INITIAL_CHANGELOG}## 0.1.0`,
  '',
  '- Implement x',
  ''
].join('\n'));

const parsableChangelog = _.map(
  yaml.safeLoad(shelljs.cat('.versionbot/CHANGELOG.yml').stdout),
  (entry) => {
    entry.commits = _.map(entry.commits, (commit) => {
      return _.omit(commit, 'hash');
    });
    return _.omit(entry, 'date');
  });

m.chai.expect(parsableChangelog).to.deep.equal([
  {
    commits: [
      {
        subject: 'Implement x',
        body: '',
        footer: {
          'Changelog-Entry': 'Implement x',
          'changelog-entry': 'Implement x',
          'Change-Type': 'minor',
          'change-type': 'minor'
        },
        author: 'Versionist'
      }
    ],
    version: '0.1.0'
  }
]);
