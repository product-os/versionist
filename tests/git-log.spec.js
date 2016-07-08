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
        ].join('\n')
      }));

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: [
            'Currently we had AppImage scripts and other resources in various',
            'different places in the code base.'
          ].join('\n'),
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
        ].join('\n')
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
        ].join('\n')
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
        ].join('\n')
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
          }
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
        ].join('\n')
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
          ].join('\n')
        }
      ]);
    });

    it('should parse footer tags when no body', function() {
      const result = gitLog.parseGitLogYAMLOutput(utils.formatCommit({
        subject: 'refactor: group AppImage related stuff (#498)',
        body: [
          'Foo: bar',
          'Bar: baz'
        ].join('\n')
      }));

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: '',
          footer: {
            Foo: 'bar',
            Bar: 'baz'
          }
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
        ].join('\n')
      }));

      m.chai.expect(result).to.deep.equal([
        {
          subject: 'refactor: group AppImage related stuff (#498)',
          body: '',
          footer: {
            'Hello-World': 'bar',
            '-hey-': 'there',
            'Bar--Foo': 'baz'
          }
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
        ].join('\n')
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
          }
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
        ].join('\n')
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
          }
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
        ].join('\n')
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
          }
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
        ].join('\n')
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
          }
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
        ].join('\n')
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
          }
        }
      ]);
    });

  });

});
