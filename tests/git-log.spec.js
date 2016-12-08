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
const gitLog = require('../lib/git-log');
const utils = require('./utils');

describe('GitLog', function() {

  describe('.getGitLogRevisionRange()', function() {

    it('should return HEAD if no start and no end', function() {
      const range = gitLog.getGitLogRevisionRange({});
      m.chai.expect(range).to.equal('HEAD');
    });

    it('should go from start to HEAD if no end', function() {
      const range = gitLog.getGitLogRevisionRange({
        startReference: 'foo'
      });

      m.chai.expect(range).to.equal('foo..HEAD');
    });

    it('should go from the first commit to end if no start', function() {
      const range = gitLog.getGitLogRevisionRange({
        endReference: 'foo'
      });

      m.chai.expect(range).to.equal('foo');
    });

    it('should go from start to end if both options are specified', function() {
      const range = gitLog.getGitLogRevisionRange({
        startReference: 'foo',
        endReference: 'bar'
      });

      m.chai.expect(range).to.equal('foo..bar');
    });

  });

  describe('.getGitLogCommandArgumentsThatOutputYaml()', function() {

    it('should throw if no gitDirectory option', function() {
      m.chai.expect(() => {
        gitLog.getGitLogCommandArgumentsThatOutputYaml({
          startReference: 'foo',
          endReference: 'bar'
        });
      }).to.throw('Missing the gitDirectory option');
    });

    describe('given the includeMergeCommits = true option', function() {

      it('should construct the right command', function() {
        const command = gitLog.getGitLogCommandArgumentsThatOutputYaml({
          includeMergeCommits: true,
          gitDirectory: 'path/to/.git',
          startReference: 'foo',
          endReference: 'bar'
        });

        m.chai.expect(command).to.deep.equal([
          '--git-dir=path/to/.git',
          'log',
          `--pretty=${gitLog.GIT_LOG_YAML_PRETTY_FORMAT}`,
          'foo..bar'
        ]);
      });

    });

    describe('given both startReference and endReference options', function() {

      it('should construct the right command', function() {
        const command = gitLog.getGitLogCommandArgumentsThatOutputYaml({
          gitDirectory: 'path/to/.git',
          startReference: 'foo',
          endReference: 'bar'
        });

        m.chai.expect(command).to.deep.equal([
          '--git-dir=path/to/.git',
          'log',
          `--pretty=${gitLog.GIT_LOG_YAML_PRETTY_FORMAT}`,
          '--no-merges',
          'foo..bar'
        ]);
      });

    });

    describe('given startReference but no endReference option', function() {

      it('should construct the right command', function() {
        const command = gitLog.getGitLogCommandArgumentsThatOutputYaml({
          gitDirectory: 'path/to/.git',
          startReference: 'foo'
        });

        m.chai.expect(command).to.deep.equal([
          '--git-dir=path/to/.git',
          'log',
          `--pretty=${gitLog.GIT_LOG_YAML_PRETTY_FORMAT}`,
          '--no-merges',
          'foo..HEAD'
        ]);
      });

    });

    describe('given endReference but no startReference option', function() {

      it('should construct the right command', function() {
        const command = gitLog.getGitLogCommandArgumentsThatOutputYaml({
          gitDirectory: 'path/to/.git',
          endReference: 'foo'
        });

        m.chai.expect(command).to.deep.equal([
          '--git-dir=path/to/.git',
          'log',
          `--pretty=${gitLog.GIT_LOG_YAML_PRETTY_FORMAT}`,
          '--no-merges',
          'foo'
        ]);
      });

    });

    describe('given neither startReference nor endReference options', function() {

      it('should construct the right command', function() {
        const command = gitLog.getGitLogCommandArgumentsThatOutputYaml({
          gitDirectory: 'path/to/.git'
        });

        m.chai.expect(command).to.deep.equal([
          '--git-dir=path/to/.git',
          'log',
          `--pretty=${gitLog.GIT_LOG_YAML_PRETTY_FORMAT}`,
          '--no-merges',
          'HEAD'
        ]);
      });

    });

  });

  describe('.parseGitLogYAMLOutput()', function() {

    it('should parse the output as it is if no hooks', function() {
      const result = gitLog.parseGitLogYAMLOutput(utils.formatCommit({
        subject: 'refactor: group AppImage related stuff (#498)',
        body: [
          'Currently we had AppImage scripts and other resources in various',
          'different places in the code base.'
        ].join('\n'),
        hash: '17c514e223e882289eebd61909bfe97857eab3b9'
      }));

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: [
            'Currently we had AppImage scripts and other resources in various',
            'different places in the code base.'
          ].join('\n'),
          hash: '17c514e223e882289eebd61909bfe97857eab3b9',
          footer: {}
        }
      ]);
    });

    it('should throw if any commit has no subject', function() {
      m.chai.expect(() => {
        gitLog.parseGitLogYAMLOutput([
          '- body: |-',
          '    Currently we had AppImage scripts and other resources in various',
          '    different places in the code base.'
        ].join('\n'));
      }).to.throw('Invalid commit: no subject');
    });

    it('should throw if any commit has no body', function() {
      m.chai.expect(() => {
        gitLog.parseGitLogYAMLOutput([
          '- subject: >-',
          '    refactor: group AppImage related stuff (#498)'
        ].join('\n'));
      }).to.throw('Invalid commit: no body');
    });

    it('should support a subjectParser hook', function() {
      const result = gitLog.parseGitLogYAMLOutput(utils.formatCommit({
        subject: 'refactor: group AppImage related stuff (#498)',
        body: [
          'Currently we had AppImage scripts and other resources in various',
          'different places in the code base.'
        ].join('\n'),
        hash: 'd9370b808f5532c5d66297b5f3ae6c1430fc6d32'
      }), {
        subjectParser: (subject) => {
          return subject.toUpperCase();
        }
      });

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'REFACTOR: GROUP APPIMAGE RELATED STUFF (#498)',
          body: [
            'Currently we had AppImage scripts and other resources in various',
            'different places in the code base.'
          ].join('\n'),
          hash: 'd9370b808f5532c5d66297b5f3ae6c1430fc6d32',
          footer: {}
        }
      ]);
    });

    it('should support a bodyParser hook', function() {
      const result = gitLog.parseGitLogYAMLOutput(utils.formatCommit({
        subject: 'refactor: group AppImage related stuff (#498)',
        body: [
          'Currently we had AppImage scripts and other resources in various',
          'different places in the code base.'
        ].join('\n'),
        hash: 'bc568b96be471a81512fb7df9b5fc53c4fd94b7d'
      }), {
        bodyParser: (subject) => {
          return subject.toUpperCase();
        }
      });

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: [
            'CURRENTLY WE HAD APPIMAGE SCRIPTS AND OTHER RESOURCES IN VARIOUS',
            'DIFFERENT PLACES IN THE CODE BASE.'
          ].join('\n'),
          hash: 'bc568b96be471a81512fb7df9b5fc53c4fd94b7d',
          footer: {}
        }
      ]);
    });

    it('should parse footer tags by default', function() {
      const result = gitLog.parseGitLogYAMLOutput(utils.formatCommit({
        subject: 'refactor: group AppImage related stuff (#498)',
        body: [
          'Currently we had AppImage scripts and other resources in various',
          'different places in the code base.',
          '',
          'Foo: bar',
          'Bar: baz'
        ].join('\n'),
        hash: '63f26f2b43e98aa6b735e0b6eeaa6e538b7cb40c'
      }));

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: [
            'Currently we had AppImage scripts and other resources in various',
            'different places in the code base.',
            ''
          ].join('\n'),
          footer: {
            Foo: 'bar',
            Bar: 'baz'
          },
          hash: '63f26f2b43e98aa6b735e0b6eeaa6e538b7cb40c'
        }
      ]);
    });

    it('should not parse footer tags if parseFooterTags is false', function() {
      const result = gitLog.parseGitLogYAMLOutput(utils.formatCommit({
        subject: 'refactor: group AppImage related stuff (#498)',
        body: [
          'Currently we had AppImage scripts and other resources in various',
          'different places in the code base.',
          '',
          'Foo: bar',
          'Bar: baz'
        ].join('\n'),
        hash: '177b0d5015c2b5c0ac0be9bf2052945c00411a2e'
      }), {
        parseFooterTags: false
      });

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: [
            'Currently we had AppImage scripts and other resources in various',
            'different places in the code base.',
            '',
            'Foo: bar',
            'Bar: baz'
          ].join('\n'),
          hash: '177b0d5015c2b5c0ac0be9bf2052945c00411a2e'
        }
      ]);
    });

    it('should parse footer tags when no body', function() {
      const result = gitLog.parseGitLogYAMLOutput(utils.formatCommit({
        subject: 'refactor: group AppImage related stuff (#498)',
        body: [
          'Foo: bar',
          'Bar: baz'
        ].join('\n'),
        hash: '60ee30fb86a592cad90f82cc94bbaaa7a2929624'
      }));

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: '',
          footer: {
            Foo: 'bar',
            Bar: 'baz'
          },
          hash: '60ee30fb86a592cad90f82cc94bbaaa7a2929624'
        }
      ]);
    });

    it('should parse footer tags with hyphens', function() {
      const result = gitLog.parseGitLogYAMLOutput(utils.formatCommit({
        subject: 'refactor: group AppImage related stuff (#498)',
        body: [
          'Hello-World: bar',
          '-hey-: there',
          'Bar--Foo: baz'
        ].join('\n'),
        hash: '6d564d68e1d3aadf86e6b39304b1339aaee37192'
      }));

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: '',
          footer: {
            'Hello-World': 'bar',
            '-hey-': 'there',
            'Bar--Foo': 'baz'
          },
          hash: '6d564d68e1d3aadf86e6b39304b1339aaee37192'
        }
      ]);
    });

    it('should stop parsing footer tags after a new line', function() {
      const result = gitLog.parseGitLogYAMLOutput(utils.formatCommit({
        subject: 'refactor: group AppImage related stuff (#498)',
        body: [
          'Currently we had AppImage scripts and other resources in various',
          'different places in the code base.',
          '',
          'Foo: bar',
          'Bar: baz',
          '',
          'Baz: qux'
        ].join('\n'),
        hash: '6bcb77a9aa58c102445269bc8f08bedd5ebfe434'
      }));

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: [
            'Currently we had AppImage scripts and other resources in various',
            'different places in the code base.',
            '',
            'Foo: bar',
            'Bar: baz',
            ''
          ].join('\n'),
          footer: {
            Baz: 'qux'
          },
          hash: '6bcb77a9aa58c102445269bc8f08bedd5ebfe434'
        }
      ]);
    });

    it('should stop parsing footer tags after a non tag line', function() {
      const result = gitLog.parseGitLogYAMLOutput(utils.formatCommit({
        subject: 'refactor: group AppImage related stuff (#498)',
        body: [
          'Currently we had AppImage scripts and other resources in various',
          'different places in the code base.',
          '',
          'Foo: bar',
          'Hello World',
          'Baz: qux'
        ].join('\n'),
        hash: '1216b3c8ab58c2ea0d3dbae18aa694fa2b63fe70'
      }));

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: [
            'Currently we had AppImage scripts and other resources in various',
            'different places in the code base.',
            '',
            'Foo: bar',
            'Hello World'
          ].join('\n'),
          footer: {
            Baz: 'qux'
          },
          hash: '1216b3c8ab58c2ea0d3dbae18aa694fa2b63fe70'
        }
      ]);
    });

    it('should parse footer tags with weird colon spacings', function() {
      const result = gitLog.parseGitLogYAMLOutput(utils.formatCommit({
        subject: 'refactor: group AppImage related stuff (#498)',
        body: [
          'Foo     :     bar',
          'Bar:baz',
          'Baz    :qux',
          'Hey:    there'
        ].join('\n'),
        hash: 'bfdcbe70142feec679ba001e03fb98d41b0db7be'
      }));

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: '',
          footer: {
            Foo: 'bar',
            Bar: 'baz',
            Baz: 'qux',
            Hey: 'there'
          },
          hash: 'bfdcbe70142feec679ba001e03fb98d41b0db7be'
        }
      ]);
    });

    it('should parse a commit with an initial single space indented body', function() {
      const result = gitLog.parseGitLogYAMLOutput(utils.formatCommit({
        subject: 'refactor: group AppImage related stuff (#498)',
        body: [
          ' Currently we had AppImage scripts and other resources in various',
          ' different places in the code base.',
          '',
          'Foo: bar',
          'Bar: baz'
        ].join('\n'),
        hash: 'e638bb9737665e87f052e55bd3647a1c28a989d9'
      }));

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: [
            ' Currently we had AppImage scripts and other resources in various',
            ' different places in the code base.',
            ''
          ].join('\n'),
          footer: {
            Foo: 'bar',
            Bar: 'baz'
          },
          hash: 'e638bb9737665e87f052e55bd3647a1c28a989d9'
        }
      ]);
    });

    it('should parse a commit with an initial multiple space indented body', function() {

      const result = gitLog.parseGitLogYAMLOutput(utils.formatCommit({
        subject: 'refactor: group AppImage related stuff (#498)',
        body: [
          '    Currently we had AppImage scripts and other resources in various',
          '    different places in the code base.',
          '',
          'Foo: bar',
          'Bar: baz'
        ].join('\n'),
        hash: 'ad0882ee7e7f5787811f019165281f36b53b5efb'
      }));

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: [
            '    Currently we had AppImage scripts and other resources in various',
            '    different places in the code base.',
            ''
          ].join('\n'),
          footer: {
            Foo: 'bar',
            Bar: 'baz'
          },
          hash: 'ad0882ee7e7f5787811f019165281f36b53b5efb'
        }
      ]);
    });

  });

});
