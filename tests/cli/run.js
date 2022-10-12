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
const fs = require('fs');
const path = require('path');
const shelljs = require('shelljs');

_.each(fs.readdirSync(path.join(__dirname, 'cases')), (file) => {
	if (!file.endsWith('.js')) {
		return;
	}

	const exitCode = shelljs.exec(
		`node ${path.join(__dirname, 'cases', file)}`,
	).code;

	if (exitCode !== 0) {
		console.error(`${file} - Test failed with exit code: ${exitCode}`);
		process.exit(1);
	}
});
