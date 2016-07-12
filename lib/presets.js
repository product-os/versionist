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

/**
 * @module Versionist.Presets
 */

const _ = require('lodash');
const async = require('async');
const touch = require('touch');
const fs = require('fs');
const semver = require('semver');
const markdown = require('./markdown');

module.exports = {

  subjectParser: {

    /**
     * @summary Angular's `subjectParser`
     * @function
     * @public
     *
     * @description
     * Based on https://github.com/angular/angular.js/blob/master/CONTRIBUTING.md
     *
     * @param {String} subject - commit subject
     * @returns {Object} parsed subject
     *
     * @example
     * const subject = presets.subjectParser.angular('feat($ngInclude): lorem ipsum');
     *
     * console.log(subject.type);
     * > feat
     * console.log(subject.scope);
     * > $ngInclude
     * console.log(subject.title);
     * > lorem ipsum
     */
    angular: (subject) => {
      const subjectParts = subject.match(/^(?:fixup!\s*)?(\w*)(\(([\w\$\.\*/-]*)\))?: (.*)$/);

      return {
        type: _.nth(subjectParts, 1),
        scope: _.nth(subjectParts, 3),
        title: _.nth(subjectParts, 4) || subject
      };
    }

  },

  includeCommitWhen: {

    /**
     * @summary Angular's `includeCommitWhen`
     * @function
     * @public
     *
     * @description
     * Based on https://github.com/angular/angular.js/blob/master/changelog.js
     *
     * @param {Object} commit - commit
     * @returns {Boolean} whether the commit should be included
     *
     * @example
     * if (presets.includeCommitWhen.angular({
     *   subject: {
     *     type: 'feat'
     *   }
     * })) {
     *   console.log('The commit should be included');
     * }
     *
     * @example
     * if (presets.includeCommitWhen.angular({
     *   subject: 'feat(Scope): my commit'
     * })) {
     *   console.log('The commit should be included');
     * }
     */
    angular: (commit) => {
      if (_.isString(commit.subject)) {
        return _.some([
          _.startsWith(commit.subject, 'feat'),
          _.startsWith(commit.subject, 'fix'),
          _.startsWith(commit.subject, 'perf')
        ]);
      }

      return _.includes([
        'feat',
        'fix',
        'perf'
      ], commit.subject.type);
    }

  },

  getChangelogDocumentedVersions: {

    /**
     * @summary Get CHANGELOG documented versions from CHANGELOG titles
     * @function
     * @public
     *
     * @param {String} file - changelog file
     * @param {Function} callback - callback (error, versions)
     *
     * @example
     * presets.getChangelogDocumentedVersions['changelog-headers']('CHANGELOG.md', (error, versions) => {
     *   if (error) {
     *     throw error;
     *   }
     *
     *   console.log(versions);
     * });
     */
    'changelog-headers': (file, callback) => {
      fs.readFile(file, {
        encoding: 'utf8'
      }, (error, changelog) => {
        if (error) {
          return callback(error);
        }

        const versions = _.chain(markdown.extractTitles(changelog))
          .map((title) => {
            return _.filter(_.split(title, ' '), semver.valid);
          })
          .flattenDeep()
          .map(semver.clean)
          .value();

        return callback(null, versions);
      });
    }

  },

  addEntryToChangelog: {

    /**
     * @summary Prepend entry to CHANGELOG
     * @function
     * @public
     *
     * @param {String} file - changelog file path
     * @param {String} entry - changelog entry
     * @param {Function} callback - callback
     *
     * @example
     * presets.addEntryToChangelog.prepend('changelog.md', 'My Entry\n', (error) => {
     *   if (error) {
     *     throw error;
     *   }
     * });
     */
    prepend: (file, entry, callback) => {
      async.waterfall([
        _.partial(touch, file, {}),

        (touchedFiles, done) => {
          fs.readFile(file, {
            encoding: 'utf8'
          }, done);
        },

        (contents, done) => {
          const entryWithoutTrailingSpace = entry.replace(/(\n)+$/, '');
          const changelogWithoutLeadingSpace = contents.replace(/^(\n)+/, '');

          return done(null, _.attempt(() => {
            if (_.isEmpty(changelogWithoutLeadingSpace)) {
              return entryWithoutTrailingSpace;
            }

            return entryWithoutTrailingSpace + '\n\n' + changelogWithoutLeadingSpace;
          }));
        },

        _.partial(fs.writeFile, file)
      ], callback);
    }

  },

  getGitReferenceFromVersion: {

    /**
     * @summary Add a `v` prefix to the version
     * @function
     * @public
     *
     * @param {String} version - version
     * @returns {String} git reference
     *
     * @example
     * const reference = presets.getGitReferenceFromVersion['v-prefix']('1.0.0');
     * console.log(reference);
     * > v1.0.0
     */
    'v-prefix': (version) => {
      if (_.startsWith(version, 'v')) {
        return version;
      }

      return `v${version}`;
    }

  }

};
