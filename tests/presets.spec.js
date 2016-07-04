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

});
