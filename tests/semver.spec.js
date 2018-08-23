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
const _ = require('lodash');
const semver = require('../lib/semver');

describe('Semver', function() {

  describe('.isValidIncrementLevel()', function() {

    it('should return true for valid increment levels', function() {
      m.chai.expect(semver.isValidIncrementLevel('major')).to.be.true;
      m.chai.expect(semver.isValidIncrementLevel('minor')).to.be.true;
      m.chai.expect(semver.isValidIncrementLevel('patch')).to.be.true;
    });

    it('should return false for invalid increment levels', function() {
      m.chai.expect(semver.isValidIncrementLevel('foo')).to.be.false;
      m.chai.expect(semver.isValidIncrementLevel('bar')).to.be.false;
      m.chai.expect(semver.isValidIncrementLevel('hello')).to.be.false;
    });

  });

  describe('.getHigherIncrementLevel()', function() {

    it('should throw given an invalid increment level on the left side', function() {
      m.chai.expect(() => {
        semver.getHigherIncrementLevel('foo', 'major');
      }).to.throw('Invalid increment level: foo');
    });

    it('should throw given an invalid increment level on the right side', function() {
      m.chai.expect(() => {
        semver.getHigherIncrementLevel('major', 'foo');
      }).to.throw('Invalid increment level: foo');
    });

    it('should return null given null/null', function() {
      const level = semver.getHigherIncrementLevel(null, null);
      m.chai.expect(level).to.be.null;
    });

    it('should return null given undefined/null', function() {
      const level = semver.getHigherIncrementLevel(undefined, null);
      m.chai.expect(level).to.be.null;
    });

    it('should return null given null/undefined', function() {
      const level = semver.getHigherIncrementLevel(null, undefined);
      m.chai.expect(level).to.be.null;
    });

    it('should return null given undefined/undefined', function() {
      const level = semver.getHigherIncrementLevel(undefined, undefined);
      m.chai.expect(level).to.be.null;
    });

    it('should return major given major/major', function() {
      const level = semver.getHigherIncrementLevel('major', 'major');
      m.chai.expect(level).to.equal('major');
    });

    it('should return major given major/minor', function() {
      const level = semver.getHigherIncrementLevel('major', 'minor');
      m.chai.expect(level).to.equal('major');
    });

    it('should return major given major/patch', function() {
      const level = semver.getHigherIncrementLevel('major', 'patch');
      m.chai.expect(level).to.equal('major');
    });

    it('should return major given major/null', function() {
      const level = semver.getHigherIncrementLevel('major', null);
      m.chai.expect(level).to.equal('major');
    });

    it('should return major given major/undefined', function() {
      const level = semver.getHigherIncrementLevel('major', undefined);
      m.chai.expect(level).to.equal('major');
    });

    it('should return minor given minor/minor', function() {
      const level = semver.getHigherIncrementLevel('minor', 'minor');
      m.chai.expect(level).to.equal('minor');
    });

    it('should return minor given minor/patch', function() {
      const level = semver.getHigherIncrementLevel('minor', 'patch');
      m.chai.expect(level).to.equal('minor');
    });

    it('should return minor given minor/null', function() {
      const level = semver.getHigherIncrementLevel('minor', null);
      m.chai.expect(level).to.equal('minor');
    });

    it('should return minor given minor/undefined', function() {
      const level = semver.getHigherIncrementLevel('minor', undefined);
      m.chai.expect(level).to.equal('minor');
    });

    it('should return patch given patch/patch', function() {
      const level = semver.getHigherIncrementLevel('patch', 'patch');
      m.chai.expect(level).to.equal('patch');
    });

    it('should return patch given patch/null', function() {
      const level = semver.getHigherIncrementLevel('patch', null);
      m.chai.expect(level).to.equal('patch');
    });

    it('should return patch given patch/undefined', function() {
      const level = semver.getHigherIncrementLevel('patch', undefined);
      m.chai.expect(level).to.equal('patch');
    });

  });

  describe('.calculateNextIncrementLevel()', function() {

    it('should throw if getIncrementLevelFromCommit returns an invalid level', function() {
      m.chai.expect(() => {
        semver.calculateNextIncrementLevel([
          {
            subject: 'minor - foo bar'
          }
        ], {
          getIncrementLevelFromCommit: _.constant('foo')
        });
      }).to.throw('Invalid increment level: foo');
    });

    it('should throw if there are no commits', function() {
      m.chai.expect(() => {
        semver.calculateNextIncrementLevel([], {
          getIncrementLevelFromCommit: _.constant('major')
        });
      }).to.throw('No commits to calculate the next increment level from');
    });

    it('should give precedence to major over minor', function() {
      const level = semver.calculateNextIncrementLevel([
        {
          subject: 'minor - foo bar'
        },
        {
          subject: 'major - hello world'
        },
        {
          subject: 'minor - hey there'
        }
      ], {
        getIncrementLevelFromCommit: (commit) => {
          return _.first(_.split(commit.subject, ' '));
        }
      });

      m.chai.expect(level).to.equal('major');
    });

    it('should give precedence to major over patch', function() {
      const level = semver.calculateNextIncrementLevel([
        {
          subject: 'patch - foo bar'
        },
        {
          subject: 'major - hello world'
        },
        {
          subject: 'patch - hey there'
        }
      ], {
        getIncrementLevelFromCommit: (commit) => {
          return _.first(_.split(commit.subject, ' '));
        }
      });

      m.chai.expect(level).to.equal('major');
    });

    it('should give precedence to minor over patch', function() {
      const level = semver.calculateNextIncrementLevel([
        {
          subject: 'patch - foo bar'
        },
        {
          subject: 'minor - hello world'
        },
        {
          subject: 'patch - hey there'
        }
      ], {
        getIncrementLevelFromCommit: (commit) => {
          return _.first(_.split(commit.subject, ' '));
        }
      });

      m.chai.expect(level).to.equal('minor');
    });

    it('should return patch if there is no higher increment level', function() {
      const level = semver.calculateNextIncrementLevel([
        {
          subject: 'patch - foo bar'
        },
        {
          subject: 'patch - hello world'
        },
        {
          subject: 'patch - hey there'
        }
      ], {
        getIncrementLevelFromCommit: (commit) => {
          return _.first(_.split(commit.subject, ' '));
        }
      });

      m.chai.expect(level).to.equal('patch');
    });

  });

  describe('.checkValid()', function() {

    it('should not throw given a valid string', function() {
      m.chai.expect(() => {
        semver.checkValid('1.0.0');
      }).to.not.throw();
    });

    it('should not throw given a version with leading `v`', function() {
      m.chai.expect(() => {
        semver.checkValid('v1.0.0');
      }).to.not.throw();
    });

    it('should not throw given a version containing a release suffix', function() {
      m.chai.expect(() => {
        semver.checkValid('v1.0.0+rev1');
      }).to.not.throw();
    });

    it('should throw given an invalid version', function() {
      m.chai.expect(() => {
        semver.checkValid('foo');
      }).to.throw('Invalid version: foo');
    });

  });

  describe('.getGreaterVersion()', function() {

    it('should throw if there is an invalid version', function() {
      m.chai.expect(() => {
        semver.getGreaterVersion([
          '=====',
          '1.0.0'
        ]);
      }).to.throw('Invalid Version: =====');
    });

    it('should return the greater version', function() {
      const greater = semver.getGreaterVersion([
        '2.0.0',
        '1.1.1',
        '1.9.0-beta.1',
        '2.0.1',
        '2.1.1',
        '1.0.0'
      ]);

      m.chai.expect(greater).to.equal('2.1.1');
    });

    it('should deal with non-normalised versions', function() {
      const greater = semver.getGreaterVersion([
        '2.0.0',
        'v1.1.1',
        '1.9.0-beta.1',
        '  2.0.1',
        '2.1.1   ',
        'v1.0.0'
      ]);

      m.chai.expect(greater).to.equal('2.1.1');
    });

    it('should return the greater version', function() {
      const greater = semver.getGreaterVersion([
        '2.14.3+rev3',
        '2.14.3+rev2',
        '2.14.3+rev1'
      ]);

      m.chai.expect(greater).to.equal('2.14.3+rev3');
    });

    it('should return the greater version', function() {
      const greater = semver.getGreaterVersion([
        '2.14.3+rev1',
        '2.14.3+rev3',
        '2.14.3+rev2'
      ]);

      m.chai.expect(greater).to.equal('2.14.3+rev3');
    });

    it('should return the greater version', function() {
      const greater = semver.getGreaterVersion([
        '2.14.3+rev2',
        '2.14.3',
        '2.14.3+rev3'
      ]);

      m.chai.expect(greater).to.equal('2.14.3+rev3');
    });
  });

});
