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

describe('CLIErrorHandling', function() {

  describe('.showErrorAndQuit', function() {

    // expected in output
    const githubIssuesLink = 'https://github.com/resin-io/versionist/issues';
    const errorText = 'example-error';

    // create a script which runs showErrorAndQuit
    const script = [
      'const errorHandling = require(\'./lib/cli/error-handling\');',
      `const error = new Error('${errorText}');`,
      'errorHandling.showErrorAndQuit(error);'
    ].join('\n');

    const execResult = shelljs.echo(script).exec('node');

    it('should set the return code to 1', function() {
      m.chai.expect(execResult.code).to.equal(1);
    });

    it('should print the text of the error', function() {
      m.chai.expect(execResult.stderr).to.contain(errorText);
    });

    it('should link to github issues page for versionist', function() {
      m.chai.expect(execResult.stderr).to.contain(githubIssuesLink);
    });

  });

});
