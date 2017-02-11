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

const m = require('mochainon');
const shelljs = require('shelljs');
const utils = require('../utils');
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

utils.createCommit('feat: implement x', {
  'Changelog-Entry': 'Implement x'
});

const execResult = utils.callVersionist();

m.chai.expect(execResult.code).to.equal(1);
m.chai.expect(execResult.stderr).to.contain('No commits were annotated with a change type');
