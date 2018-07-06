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
  '  getGitReferenceFromVersion: (version) => {',
  '    return `TEST ${version}`;',
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
  'Changelog-Entry': 'Implement x',
  'Change-Type': 'minor'
});

utils.createCommit('fix: fix y', {
  'Changelog-Entry': 'Fix y',
  'Change-Type': 'patch'
});

utils.createCommit('fix: fix z', {
  'Changelog-Entry': 'Fix z',
  'Change-Type': 'patch'
});

const initialVersion = utils.callVersionist({
  cmd: 'get version'
}).stdout;

const initialReference = utils.callVersionist({
  cmd: 'get reference'
}).stdout;

utils.callVersionist();

const nextVersion = utils.callVersionist({
  cmd: 'get version'
}).stdout;

const nextReference = utils.callVersionist({
  cmd: 'get reference'
}).stdout;

m.chai.expect(shelljs.cat('CHANGELOG.md').stdout).to.deep.equal([
  '## 0.1.0',
  '',
  '- Fix z',
  '- Fix y',
  '- Implement x',
  ''
].join('\n'));

m.chai.expect(initialVersion).to.equal('0.0.1\n');
m.chai.expect(initialReference).to.equal('TEST 0.0.1\n');
m.chai.expect(nextVersion).to.equal('0.1.0\n');
m.chai.expect(nextReference).to.equal('TEST 0.1.0\n');
