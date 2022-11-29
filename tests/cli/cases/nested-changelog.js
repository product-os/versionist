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

utils.createVersionistConfiguration(
	[
		"'use strict';",
		'module.exports = {',
		"  addEntryToChangelog: 'prepend',",
		'  editVersion: false,',
		'  transformTemplateData: (data) => {',
		"    data.date = '2018-09-23T15:05:11.877Z'",
		'    return data',
		'  },',
		'  transformTemplateDataAsync: (data, cb) => {',
		'    data.commits[1].nested = [{',
		"      version: '0.1.1',",
		"      date: '2018-09-23T15:05:11.877Z',",
		'      commits: [',
		'        {',
		"          subject: 'foo',",
		"          author: 'Test'",
		'        }, {',
		"          subject: 'baz',",
		"          author: 'Test'",
		'        }',
		'      ]',
		'    }, {',
		"      version: '0.1.0',",
		"      date: '2018-09-23T15:05:00.000Z',",
		'      commits: [',
		'        {',
		"          subject: 'qux',",
		"          author: 'Test'",
		'        }',
		'      ]',
		'    }]',
		'    return cb(null, data)',
		'  },',
		"  template: 'default'",
		'};',
		'',
	].join('\n'),
);

shelljs.exec('git init');
shelljs.exec('nodetouch CHANGELOG.md');

utils.createCommit('feat: implement x', {
	'Change-Type': 'patch',
});

utils.createCommit('feat: implement y', {
	'Change-Type': 'patch',
});

utils.createCommit('feat: implement z', {
	'Change-Type': 'patch',
});

utils.callVersionist();

m.chai
	.expect(shelljs.cat('CHANGELOG.md').stdout)
	.to.deep.equal(
		[
			'# v0.0.2',
			'## (2018-09-23)',
			'',
			'* feat: implement z',
			'',
			'<details>',
			'<summary> feat: implement y </summary>',
			'',
			'> ## 0.1.1',
			'> ### (2018-09-23)',
			'> ',
			'> * foo [Test]',
			'> * baz [Test]',
			'> ',
			'> ## 0.1.0',
			'> ### (2018-09-23)',
			'> ',
			'> * qux [Test]',
			'> ',
			'',
			'</details>',
			'',
			'* feat: implement x',
			'',
		].join('\n'),
	);
