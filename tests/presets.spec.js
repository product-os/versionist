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
const fs = require('fs');
const tmp = require('tmp');
const presets = require('../lib/presets');

describe('Presets', function() {

  describe('.subjectParser', function() {

    describe('.angular', function() {

      it('should pass the whole commit as a title when parsing non-angular commits', function() {
        const subject = 'Do x, y and z';
        const result = presets.subjectParser.angular(subject);

        m.chai.expect(result).to.deep.equal({
          type: undefined,
          scope: undefined,
          title: 'Do x, y and z'
        });
      });

      it('should parse subjects without a scope', function() {
        const subject = 'feat: hello world';
        const result = presets.subjectParser.angular(subject);

        m.chai.expect(result).to.deep.equal({
          type: 'feat',
          scope: undefined,
          title: 'hello world'
        });
      });

      it('should parse subjects with scopes', function() {
        const subject = 'feat(foo): hello world';
        const result = presets.subjectParser.angular(subject);

        m.chai.expect(result).to.deep.equal({
          type: 'feat',
          scope: 'foo',
          title: 'hello world'
        });
      });

      it('should preserve scope casing', function() {
        const subject = 'feat(fooBar): hello world';
        const result = presets.subjectParser.angular(subject);

        m.chai.expect(result).to.deep.equal({
          type: 'feat',
          scope: 'fooBar',
          title: 'hello world'
        });
      });

    });

  });

  describe('.includeCommitWhen', function() {

    describe('.angular', function() {

      it('should return true if commit.subject.type equals feat', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: {
            type: 'feat'
          }
        })).to.be.true;
      });

      it('should return true if commit.subject.type equals fix', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: {
            type: 'fix'
          }
        })).to.be.true;
      });

      it('should return true if commit.subject.type equals perf', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: {
            type: 'perf'
          }
        })).to.be.true;
      });

      it('should return false if commit.subject.type is docs', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: {
            type: 'docs'
          }
        })).to.be.false;
      });

      it('should return false if commit.subject.type is style', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: {
            type: 'style'
          }
        })).to.be.false;
      });

      it('should return false if commit.subject.type is refactor', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: {
            type: 'refactor'
          }
        })).to.be.false;
      });

      it('should return false if commit.subject.type is test', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: {
            type: 'test'
          }
        })).to.be.false;
      });

      it('should return false if commit.subject.type is chore', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: {
            type: 'chore'
          }
        })).to.be.false;
      });

      it('should return false if commit.subject.type is an unknown type', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: {
            type: 'foobar'
          }
        })).to.be.false;
      });

      it('should return false if commit.subject.type is not defined', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: {}
        })).to.be.false;
      });

      it('should return true if commit.subject starts with feat', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: 'feat($ngRepeat): hello world'
        })).to.be.true;
      });

      it('should return true if commit.subject starts with fix', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: 'fix($ngRepeat): hello world'
        })).to.be.true;
      });

      it('should return true if commit.subject starts with perf', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: 'perf($ngRepeat): hello world'
        })).to.be.true;
      });

      it('should return false if commit.subject starts with docs', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: 'docs($ngRepeat): hello world'
        })).to.be.false;
      });

      it('should return false if commit.subject starts with style', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: 'style($ngRepeat): hello world'
        })).to.be.false;
      });

      it('should return false if commit.subject starts with refactor', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: 'refactor($ngRepeat): hello world'
        })).to.be.false;
      });

      it('should return false if commit.subject starts with test', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: 'test($ngRepeat): hello world'
        })).to.be.false;
      });

      it('should return false if commit.subject starts with chore', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: 'chore($ngRepeat): hello world'
        })).to.be.false;
      });

      it('should return false if commit.subject starts with an unknown type', function() {
        m.chai.expect(presets.includeCommitWhen.angular({
          subject: 'foobar($ngRepeat): hello world'
        })).to.be.false;
      });

    });

  });

  describe('.getChangelogDocumentedVersions', function() {

    describe('.`changelog-headers`', function() {

      describe('given there was an error reading the file', function() {

        beforeEach(function() {
          this.fsReadFileStub = m.sinon.stub(fs, 'readFile');
          this.fsReadFileStub.yields(new Error('read error'));
        });

        afterEach(function() {
          this.fsReadFileStub.restore();
        });

        it('should yield back the error', function(done) {
          const fn = presets.getChangelogDocumentedVersions['changelog-headers'];
          fn('CHANGELOG.md', (error, versions) => {
            m.chai.expect(error).to.be.an.instanceof(Error);
            m.chai.expect(error.message).to.equal('read error');
            m.chai.expect(versions).to.not.exist;
            done();
          });
        });

      });

      describe('given the file contained versions as headers', function() {

        beforeEach(function() {
          this.fsReadFileStub = m.sinon.stub(fs, 'readFile');
          this.fsReadFileStub.yields(null, [
            '# My markdown document',
            '',
            '## 1.1.0',
            '',
            '- foo',
            '',
            '## 1.0.0',
            '',
            '- foo'
          ].join('\n'));
        });

        afterEach(function() {
          this.fsReadFileStub.restore();
        });

        it('should yield the documented versions', function(done) {
          const fn = presets.getChangelogDocumentedVersions['changelog-headers'];
          fn('CHANGELOG.md', (error, versions) => {
            m.chai.expect(error).to.not.exist;
            m.chai.expect(versions).to.deep.equal([
              '1.1.0',
              '1.0.0'
            ]);
            done();
          });

        });

      });

      describe('given the file contained non-normalised versions as headers', function() {

        beforeEach(function() {
          this.fsReadFileStub = m.sinon.stub(fs, 'readFile');
          this.fsReadFileStub.yields(null, [
            '# My markdown document',
            '',
            '## v1.1.0',
            '',
            '- foo',
            '',
            '## v1.0.0',
            '',
            '- foo'
          ].join('\n'));
        });

        afterEach(function() {
          this.fsReadFileStub.restore();
        });

        it('should normalize the versions', function(done) {
          const fn = presets.getChangelogDocumentedVersions['changelog-headers'];
          fn('CHANGELOG.md', (error, versions) => {
            m.chai.expect(error).to.not.exist;
            m.chai.expect(versions).to.deep.equal([
              '1.1.0',
              '1.0.0'
            ]);
            done();
          });

        });

      });

      describe('given the file contained versions plus other text as headers', function() {

        beforeEach(function() {
          this.fsReadFileStub = m.sinon.stub(fs, 'readFile');
          this.fsReadFileStub.yields(null, [
            '# My markdown document',
            '',
            '## Foo 1.1.0',
            '',
            '- foo',
            '',
            '## 1.0.0 Bar',
            '',
            '- foo'
          ].join('\n'));
        });

        afterEach(function() {
          this.fsReadFileStub.restore();
        });

        it('should yield the documented versions', function(done) {
          const fn = presets.getChangelogDocumentedVersions['changelog-headers'];
          fn('CHANGELOG.md', (error, versions) => {
            m.chai.expect(error).to.not.exist;
            m.chai.expect(versions).to.deep.equal([
              '1.1.0',
              '1.0.0'
            ]);
            done();
          });

        });

      });

    });

  });

  describe('.addEntryToChangelog', function() {

    describe('.prepend', function() {

      describe('given the file does not exist', function() {

        beforeEach(function() {
          this.tmp = tmp.tmpNameSync();
        });

        afterEach(function() {
          fs.unlinkSync(this.tmp);
        });

        it('should create the file', function(done) {
          presets.addEntryToChangelog.prepend(this.tmp, [
            'Lorem ipsum'
          ].join('\n'), (error) => {
            m.chai.expect(error).to.not.exist;

            const contents = fs.readFileSync(this.tmp, {
              encoding: 'utf8'
            });

            m.chai.expect(contents).to.equal([
              'Lorem ipsum'
            ].join('\n'));

            done();
          });
        });

      });

      describe('given a temporary file with contents', function() {

        beforeEach(function() {
          this.tmp = tmp.fileSync();
          fs.writeFileSync(this.tmp.fd, 'Foo Bar\nHello World');
        });

        afterEach(function() {
          this.tmp.removeCallback();
        });

        it('should not add a white line if not necessary', function(done) {
          presets.addEntryToChangelog.prepend(this.tmp.name, [
            'Lorem ipsum',
            ''
          ].join('\n'), (error) => {
            m.chai.expect(error).to.not.exist;

            const contents = fs.readFileSync(this.tmp.name, {
              encoding: 'utf8'
            });

            m.chai.expect(contents).to.equal([
              'Lorem ipsum',
              '',
              'Foo Bar',
              'Hello World'
            ].join('\n'));

            done();
          });
        });

        it('should add a white line if necessary', function(done) {
          presets.addEntryToChangelog.prepend(this.tmp.name, [
            'Lorem ipsum'
          ].join('\n'), (error) => {
            m.chai.expect(error).to.not.exist;

            const contents = fs.readFileSync(this.tmp.name, {
              encoding: 'utf8'
            });

            m.chai.expect(contents).to.equal([
              'Lorem ipsum',
              '',
              'Foo Bar',
              'Hello World'
            ].join('\n'));

            done();
          });
        });

        it('should remove extra white lines', function(done) {
          presets.addEntryToChangelog.prepend(this.tmp.name, [
            'Lorem ipsum',
            '',
            '',
            ''
          ].join('\n'), (error) => {
            m.chai.expect(error).to.not.exist;

            const contents = fs.readFileSync(this.tmp.name, {
              encoding: 'utf8'
            });

            m.chai.expect(contents).to.equal([
              'Lorem ipsum',
              '',
              'Foo Bar',
              'Hello World'
            ].join('\n'));

            done();
          });
        });

      });

      describe('given a temporary file with contents and leading white lines', function() {

        beforeEach(function() {
          this.tmp = tmp.fileSync();
          fs.writeFileSync(this.tmp.fd, '\n\n\nFoo Bar\nHello World');
        });

        afterEach(function() {
          this.tmp.removeCallback();
        });

        it('should normalize white lines', function(done) {
          presets.addEntryToChangelog.prepend(this.tmp.name, [
            'Lorem ipsum',
            '',
            '',
            ''
          ].join('\n'), (error) => {
            m.chai.expect(error).to.not.exist;

            const contents = fs.readFileSync(this.tmp.name, {
              encoding: 'utf8'
            });

            m.chai.expect(contents).to.equal([
              'Lorem ipsum',
              '',
              'Foo Bar',
              'Hello World'
            ].join('\n'));

            done();
          });
        });

      });

      describe('given a temporary file with contents and trailing white lines', function() {

        beforeEach(function() {
          this.tmp = tmp.fileSync();
          fs.writeFileSync(this.tmp.fd, 'Foo Bar\nHello World\n\n');
        });

        afterEach(function() {
          this.tmp.removeCallback();
        });

        it('should keep the trailing white lines intact', function(done) {
          presets.addEntryToChangelog.prepend(this.tmp.name, [
            'Lorem ipsum'
          ].join('\n'), (error) => {
            m.chai.expect(error).to.not.exist;

            const contents = fs.readFileSync(this.tmp.name, {
              encoding: 'utf8'
            });

            m.chai.expect(contents).to.equal([
              'Lorem ipsum',
              '',
              'Foo Bar',
              'Hello World',
              '',
              ''
            ].join('\n'));

            done();
          });

        });

      });

    });

  });

  describe('.getGitReferenceFromVersion', function() {

    describe('.`v-prefix`', function() {

      it('should prepend a `v` to the version', function() {
        const version = presets.getGitReferenceFromVersion['v-prefix']('1.0.0');
        m.chai.expect(version).to.equal('v1.0.0');
      });

      it('should not prepend a `v` to the version if it already has one', function() {
        const version = presets.getGitReferenceFromVersion['v-prefix']('v1.0.0');
        m.chai.expect(version).to.equal('v1.0.0');
      });

    });

  });

});
