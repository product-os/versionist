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
  '  editVersion: false,',
  '  parseFooterTags: false,',
  '  addEntryToChangelog: \'prepend\',',
  '  getIncrementLevelFromCommit: () => {',
  '    return \'major\';',
  '  },',
  '  template: [',
  '    \'## {{version}}\',',
  '    \'\',',
  '    \'{{#each commits}}\',',
  '    \'- {{this.subject}}\',',
  '    \'{{this.body}}\',',
  '    \'\',',
  '    \'{{/each}}\'',
  '  ].join(\'\\n\')',
  '};',
  ''
].join('\n'));

shelljs.exec('git init');

utils.createCommit('Implement x', {
  'My-Tag': 'Foo'
});

utils.createCommit('Fix y', {
  'My-Tag': 'Bar'
});

utils.createCommit('Fix z', {
  'My-Tag': 'Baz'
});

utils.callVersionist();

m.chai.expect(shelljs.cat('CHANGELOG.md').stdout).to.deep.equal([
  '## 1.0.0',
  '',
  '- Fix z',
  'My-Tag: Baz',
  '',
  '- Fix y',
  'My-Tag: Bar',
  '',
  '- Implement x',
  'My-Tag: Foo',
  ''
].join('\n'));
