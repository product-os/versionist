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
const path = require('path');
const updateJSON = require('./update-json');
const fs = require('fs');
const semver = require('./semver');
const github = require('./github');
const replaceInFile = require('replace-in-file');
const markdown = require('./markdown');
const yaml = require('yaml');
const execSync = require('child_process').execSync;
const { Octokit } = require('@octokit/rest');
const childProcess = require('child_process');

const octokit = new Octokit({
	debug: Boolean(process.env.DEBUG),
	auth: process.env.GITHUB_TOKEN,
});

// prettier-ignore
const templateDefaults = [
  '{{#*inline "commits"}}',
  '{{> render-header }}',
  '{{> block-newline}}',
  '{{#each commits}}',
    '{{> render-with-nesting nesting=../nesting block=../block ~}}',
  '{{/each}}',
  '{{> block-newline}}',
  '{{/inline~}}',

  '{{#*inline "render-with-nesting"}}',
    '{{~#if this.nested ~}}',
      '{{> block-newline}}',
      '{{> block-prefix}}<details>',
      '{{> block-prefix}}<summary> {{> render-with-author-inline}} </summary>',
      '{{> block-newline}}',
        '{{#each this.nested}}',
          '{{> commits nesting=(append ../nesting "#") block=(append ../block ">") }}',
        '{{/each}}',
      '{{> block-prefix}}</details>',
      '{{> block-newline}}',
    '{{~else~}}',
      '{{> block-prefix}}* {{> render-with-author}}',
    '{{~/if~}}',
  '{{/inline}}',

  '{{#*inline "render-with-author"}}',
    '{{#if this.author}}',
      '{{this.subject}} [{{this.author}}]',
    '{{else}}',
      '{{this.subject}}',
    '{{/if}}',
  '{{/inline}}',

  '{{#*inline "render-with-author-inline"}}',
    '{{#if this.author ~}}',
      '{{this.subject}} [{{this.author}}] ',
    '{{~else~}}',
      '{{this.subject}} ',
    '{{~/if~}}',
  '{{/inline}}',

  '{{#*inline "block-prefix"}}',
    '{{#isnt block "" ~}}{{block}} {{/isnt~}}',
  '{{/inline}}',

  '{{#*inline "block-newline"}}',
    '{{#isnt block ""}}{{block}} {{else}}{{/isnt}}',
  '{{/inline}}',
  ''
].join('\n');

const isIncrementalCommit = (changeType) => {
	return Boolean(changeType) && changeType.trim().toLowerCase() !== 'none';
};

const getAuthor = (commitHash) => {
	if (commitHash) {
		return execSync(`git show --quiet --format="%an" ${commitHash}`, {
			encoding: 'utf8',
		}).replace('\n', '');
	}
	return 'Unknown author';
};

const getChangeType = (footer) => {
	return footer[
		Object.keys(footer).find((k) => k.toLowerCase() === 'change-type')
	];
};

const extractContentsBetween = (changelog, repo, start, end) => {
	return _(changelog)
		.filter((entry) => {
			return semver.lt(start, entry.version) && semver.lte(entry.version, end);
		})
		.map((entry) => {
			entry.version = `${repo}-${entry.version}`;
			return entry;
		})
		.value();
};

const getNestedChangeLog = async (
	options,
	commit,
	startVersion,
	endVersion,
	callback,
) => {
	const {
		owner,
		repo,
		ref = await github.getDefaultBranch(octokit, owner, repo),
	} = options;

	try {
		const response = await github.getChangelogYML(owner, repo, ref, octokit);
		const changelog = yaml.parse(Buffer.from(response, 'base64').toString());
		const nested = extractContentsBetween(
			changelog,
			repo,
			startVersion,
			endVersion,
		);
		return callback(null, nested);
	} catch (err) {
		return callback(
			new Error(
				`Could not find .versionbot/CHANGELOG.yml in ${repo} under branch ${ref}`,
			),
		);
	}
};

const resolveTag = (shash, upstream) => {
	const result = childProcess.spawnSync(
		'git',
		['describe', '--abbrev=0', shash],
		{
			cwd: `${process.cwd()}/${upstream}`,
		},
	);

	return result.stdout.toString().trim();
};

const processSubmoduleOutput = (data, upstream) => {
	var lines = `${data}`.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const regexp = new RegExp(`Submodule ${upstream} (\\S+)\\.\\.(\\S+):`);
		const match = line.match(regexp);
		if (match) {
			const previousVersion = resolveTag(match[1], upstream);
			const newVersion = resolveTag(match[2], upstream);
			return [previousVersion, newVersion];
		}
	}
};

const attachNestedChangelog = (upstreams, commit, callback) => {
	async.map(
		upstreams,
		(upstream, cb) => {
			const regexp = new RegExp(
				`[Uu]pdate ${upstream.pattern} from (\\S+) to (\\S+)`,
			);
			const match = commit.body.match(regexp);
			if (match) {
				const currentVersion = match[1];
				const targetVersion = match[2];
				return getNestedChangeLog(
					upstream,
					commit,
					currentVersion,
					targetVersion,
					cb,
				);
			}
			const regexp1 = new RegExp(`[Uu]pdate ${upstream.pattern}`);
			const match1 = commit.body.match(regexp1);
			if (match1) {
				const result = childProcess.spawnSync('git', [
					'log',
					'--oneline',
					'--submodule',
					'-U0',
					'HEAD^1..HEAD',
				]);
				const response = processSubmoduleOutput(
					result.stdout,
					`${upstream.pattern}`,
				);
				if (response) {
					const currentVersion = response[0];
					const targetVersion = response[1];
					return getNestedChangeLog(
						upstream,
						commit,
						currentVersion,
						targetVersion,
						cb,
					);
				}
			}
			return cb(null);
		},
		(err, nestedCommits) => {
			commit.nested = _(nestedCommits).compact().flatten().value();
			return callback(err, commit);
		},
	);
};

const INITIAL_CHANGELOG = `# Changelog

All notable changes to this project will be documented in this file
automatically by Versionist. DO NOT EDIT THIS FILE MANUALLY!
This project adheres to [Semantic Versioning](http://semver.org/).

`;

const touchChangelog = (changelogPath, done) => {
	if (fs.existsSync(changelogPath)) {
		return done(null, changelogPath);
	}
	return fs.writeFile(changelogPath, INITIAL_CHANGELOG, (err) => {
		return done(err, changelogPath);
	});
};

/**
 * @summary Replaces the contents of a file using a regular expression
 * @function
 * @private
 *
 * @param {String} file - target filename
 * @param {RegExp} pattern - pattern used in str.replace
 * @param {String} replacement - replacement used in str.replace
 * @param {Function} callback - callback (error)
 */
const replace = (file, pattern, replacement, callback) => {
	async.waterfall(
		[
			(done) => {
				fs.readFile(file, 'utf8', done);
			},

			(contents, done) => {
				if (pattern.test(contents)) {
					done(null, contents);
				} else {
					done(new Error(`Pattern does not match ${file}`));
				}
			},

			(contents, done) => {
				const updated = contents.replace(pattern, replacement);
				done(null, updated);
			},

			_.partial(fs.writeFile, file),
		],
		callback,
	);
};

/**
 * @summary Returns an appropriate function to clean the version
 * @function
 * @private
 *
 * @param {Object} options - Full options object
 * @param {Boolean|RegExp} [options.clean] - If true semver.clean is returned, if a
 * regexp is supplied, a function that replaces every match with the empty string is returned.
 * If false the identity function is returned.
 * @returns {Function}
 */
const getCleanFunction = (options) => {
	_.defaults(options, {
		clean: true,
	});

	if (_.isRegExp(options.clean)) {
		return (version) => {
			return version.replace(options.clean, '');
		};
	}
	return options.clean ? semver.valid : _.identity;
};

/**
 * @summary Read the given file and return its contents parsed as JSON
 * @function
 * @private
 *
 * @param {string} filePath - Path of file to be read and parsed
 * @param {Function} callback - Error-first callback
 */
function readJSON(filePath, callback) {
	fs.readFile(filePath, 'utf8', (error, data) => {
		let pjObj;
		if (error) {
			if (error.code === 'ENOENT') {
				error.message = `No such file or directory: ${filePath}`;
			}
		} else {
			try {
				pjObj = JSON.parse(data);
			} catch (err) {
				error = err;
			}
		}
		callback(error, pjObj);
	});
}

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
		 * @param {Object} options - options
		 * @param {String} subject - commit subject
		 * @returns {Object} parsed subject
		 *
		 * @example
		 * const subject = presets.subjectParser.angular({}, 'feat($ngInclude): lorem ipsum');
		 *
		 * console.log(subject.type);
		 * > feat
		 * console.log(subject.scope);
		 * > $ngInclude
		 * console.log(subject.title);
		 * > lorem ipsum
		 */
		angular: (options, subject) => {
			const subjectParts = subject.match(
				/^(?:fixup!\s*)?(\w*)(\(([\w$.*/-]*)\))?: (.*)$/,
			);

			return {
				type: _.nth(subjectParts, 1),
				scope: _.nth(subjectParts, 3),
				title: _.nth(subjectParts, 4) || subject,
			};
		},
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
		 * @param {Object} options - options
		 * @param {Object} commit - commit
		 * @returns {Boolean} whether the commit should be included
		 *
		 * @example
		 * if (presets.includeCommitWhen.angular({}, {
		 *   subject: {
		 *     type: 'feat'
		 *   }
		 * })) {
		 *   console.log('The commit should be included');
		 * }
		 *
		 * @example
		 * if (presets.includeCommitWhen.angular({}, {
		 *   subject: 'feat(Scope): my commit'
		 * })) {
		 *   console.log('The commit should be included');
		 * }
		 */
		angular: (options, commit) => {
			if (_.isString(commit.subject)) {
				return _.some([
					_.startsWith(commit.subject, 'feat'),
					_.startsWith(commit.subject, 'fix'),
					_.startsWith(commit.subject, 'perf'),
				]);
			}

			return _.includes(['feat', 'fix', 'perf'], commit.subject.type);
		},

		/**
		 * @summary Include commit only if it contains a change-type, either in a footer or the subject
		 * @function
		 * @public
		 *
		 *
		 * @param {Object} options - options
		 * @param {Object} commit - commit
		 * @returns {Boolean} whether the commit should be included
		 *
		 * @example
		 * if (presets.includeCommitWhen['has-changetype']({}, {
		 *   subject: 'A change',
		 *   footer: {
		 *     'change-type': 'minor'
		 *   }
		 * })) {
		 *   console.log('The commit should be included');
		 * }
		 */
		'has-changetype': (options, commit) => {
			const changeType = getChangeType(commit.footer);
			return (
				isIncrementalCommit(changeType) ||
				isIncrementalCommit(
					module.exports.getIncrementLevelFromCommit.subject({}, commit),
				)
			);
		},

		/**
		 * @summary Include commit only if it contains a changelog-entry footer
		 * @function
		 * @public
		 *
		 *
		 * @param {Object} options - options
		 * @param {Object} commit - commit
		 * @returns {Boolean} whether the commit should be included
		 *
		 * @example
		 * if (presets.includeCommitWhen['has-changelog-entry']({}, {
		 *   subject: 'A change',
		 *   footer: {
		 *     'changelog-entry': 'Longer explanation of the change'
		 *   }
		 * })) {
		 *   console.log('The commit should be included');
		 * }
		 */
		'has-changelog-entry': (options, commit) => {
			return Boolean(commit.footer['changelog-entry']);
		},
	},

	getIncrementLevelFromCommit: {
		/**
		 * @summary Calculate increment level from change-type
		 * @function
		 * @public
		 *
		 *
		 * @param {Object} options - options
		 * @param {Object} commit - commit
		 * @returns {String} Increment level
		 *
		 * @example
		 * if (presets.getIncrementLevelFromCommit['change-type']({}, {
		 *   subject: 'A change',
		 *   footer: {
		 *     'change-type': 'minor'
		 *   }
		 * })) {
		 *   console.log('minor');
		 * }
		 */
		'change-type': (options, commit) => {
			const changeType = getChangeType(commit.footer);

			if (isIncrementalCommit(changeType)) {
				return changeType.trim().toLowerCase();
			}
		},

		/**
		 * @summary Calculate increment level from subject
		 * @function
		 * @public
		 *
		 *
		 * @param {Object} options - options
		 * @param {Object} commit - commit
		 * @returns {String} Increment level
		 *
		 * @example
		 * if (presets.getIncrementLevelFromCommit['title']({}, {
		 *   subject: 'patch: a change',
		 *   footer: {
		 *     'foo': 'bar'
		 *   }
		 * })) {
		 *   console.log('patch');
		 * }
		 */
		subject: (options, commit) => {
			if (!_.isString(commit.subject)) {
				return null;
			}
			const match = commit.subject.match(/^(patch|minor|major):/i);
			if (_.isArray(match) && isIncrementalCommit(match[1])) {
				return match[1].trim().toLowerCase();
			}
		},

		/**
		 * @summary Calculate increment level from footers or title if not change-type footer is present
		 * @function
		 * @public
		 *
		 *
		 * @param {Object} options - options
		 * @param {Object} commit - commit
		 * @returns {String} Increment level
		 *
		 * @example
		 * if (presets.getIncrementLevelFromCommit['change-type-or-subject']({}, {
		 *   subject: 'patch: a change',
		 *   footer: {
		 *     'change-type': 'minor'
		 *   }
		 * })) {
		 *   console.log('minor');
		 * }
		 */
		'change-type-or-subject': (options, commit) => {
			const ctIncrement = module.exports.getIncrementLevelFromCommit[
				'change-type'
			](options, commit);
			if (_.isString(ctIncrement)) {
				return ctIncrement;
			}
			return module.exports.getIncrementLevelFromCommit.subject(
				options,
				commit,
			);
		},
	},

	getChangelogDocumentedVersions: {
		/**
		 * @summary Get CHANGELOG documented versions from CHANGELOG titles
		 * @function
		 * @public
		 *
		 * @param {Object} options - options
		 * @param {String} file - changelog file
		 * @param {Function} callback - callback (error, versions)
		 *
		 * @example
		 * presets.getChangelogDocumentedVersions['changelog-headers']({}, 'CHANGELOG.md', (error, versions) => {
		 *   if (error) {
		 *     throw error;
		 *   }
		 *
		 *   console.log(versions);
		 * });
		 */
		'changelog-headers': (options, file, callback) => {
			const cleanFn = getCleanFunction(options);

			fs.readFile(
				file,
				{
					encoding: 'utf8',
				},
				(error, changelog) => {
					if (error) {
						if (error.code === 'ENOENT') {
							return callback(null, []);
						}

						return callback(error);
					}

					const versions = _.chain(markdown.extractTitles(changelog))
						.map((title) => {
							return _.filter(_.split(title, ' '), semver.valid);
						})
						.flattenDeep()
						.map(cleanFn)
						.value();

					return callback(null, versions);
				},
			);
		},
	},

	getCurrentBaseVersion: {
		/**
		 * @summary Get greater semantic version from documentedVersions
		 * @function
		 * @public
		 *
		 * @param {Object} options - options
		 * @param {String[]} documentedVersions - documented versions
		 * @param {Object[]} history - relevant commit history
		 * @param {Function} callback - callback
		 * @returns {String} version
		 *
		 * @example
		 * const version = presets.getCurrentBaseVersion['latest-documented']({}, [
		 *   '2.1.1',
		 *   '2.1.0',
		 *   '2.0.0'
		 * ], [], (version) => {
		 *  console.log(version)
		 *  > 2.1.1
		 * });
		 *
		 */
		'latest-documented': (options, documentedVersions, history, callback) => {
			return callback(null, semver.getGreaterVersion(documentedVersions));
		},
	},

	addEntryToChangelog: {
		/**
		 * @summary Prepend entry to CHANGELOG
		 * @function
		 * @public
		 *
		 * @param {Object} options - options
		 * @param {Number} [options.fromLine=0] - prepend from line
		 * @param {String} file - changelog file path
		 * @param {String} entry - changelog entry
		 * @param {Function} callback - callback
		 *
		 * @example
		 * presets.addEntryToChangelog.prepend({}, 'changelog.md', 'My Entry\n', (error) => {
		 *   if (error) {
		 *     throw error;
		 *   }
		 * });
		 */
		prepend: (options, file, entry, callback) => {
			_.defaults(options, {
				fromLine: 6,
			});

			async.waterfall(
				[
					_.partial(touchChangelog, file),

					(touchedFiles, done) => {
						fs.readFile(
							file,
							{
								encoding: 'utf8',
							},
							done,
						);
					},

					(contents, done) => {
						const changelogLines = _.split(contents, '\n');

						return done(
							null,
							_.join(
								_.reduce(
									[
										_.slice(changelogLines, 0, options.fromLine),
										_.split(entry, '\n'),
										_.slice(changelogLines, options.fromLine),
									],
									(accumulator, array) => {
										const head = _.dropRightWhile(accumulator, _.isEmpty);
										const body = _.dropWhile(array, _.isEmpty);

										if (_.isEmpty(head)) {
											return body;
										}

										return _.concat(head, [''], body);
									},
									[],
								),
								'\n',
							),
						);
					},

					_.partial(fs.writeFile, file),
				],
				callback,
			);
		},
	},

	addEntryToHistoryFile: {
		/**
		 * @summary Prepend entry to .versionbot/CHANGELOG.yml
		 * @function
		 * @public
		 *
		 * @param {Object} options - options
		 * @param {String} file - path to version file
		 * @param {String} raw - changelog raw entry
		 * @param {Function} callback - callback
		 * @returns {null}
		 *
		 * @example
		 * presets.addEntryToHistoryFile.ymlPrepend({},
		 * { commits:
		 *    [ { subject: 'Subject',
		 *      body: '',
		 *      footer: {},
		 *      author: 'test'
		 *    }
		 *  ],
		 *  version: '5.4.4',
		 *  date: 2019-12-26T16:53:28.111Z
		 * }, (error) => {
		 *   if (error) {
		 *     throw error;
		 *   }
		 * });
		 */
		'yml-prepend': (options, file, raw, callback) => {
			if (fs.existsSync(file)) {
				let changelog = [];
				try {
					changelog = yaml.parse(fs.readFileSync(file, 'utf8'));

					// If the file was empty we explicitly set as empty array
					if (!changelog) {
						changelog = [];
					}
				} catch (e) {
					if (e.code !== 'ENOENT') {
						return callback(e);
					}
				}

				changelog.unshift(raw);
				fs.writeFile(file, yaml.stringify(changelog), callback);
			} else {
				return callback(null);
			}
		},
	},

	transformTemplateDataAsync: {
		'nested-changelogs': (options, data, callback) => {
			async.map(
				data.commits,
				_.partial(attachNestedChangelog, options.upstream),
				(err, commits) => {
					if (err) {
						return callback(err);
					}
					data.commits = _.sortBy(commits, (commit) => {
						return Boolean(commit.nested);
					});

					return callback(err, data);
				},
			);
		},
	},

	transformTemplateData: {
		/**
		 * @summary If a commit has a changelog-entry use that instead of the subject.
		 *          Throws if there are no commits in data
		 * @function
		 * @public
		 *
		 * @param {Object} options - options
		 * @param {Object} data - templateData
		 * @returns {Object} transformed template data
		 *
		 * @example
		 * const data = preset.transformTemplateData['changelog-entry']({}, {
		 *  commits: [{
		 *      subject: 'Commit subject',
		 *      footer: {
		 *        'changelog-entry': 'User facing message'
		 *      }
		 *    }]
		 *  })
		 * console.log(data.commits);
		 * > [{
		 *     subject: 'User facing message',
		 *     footer: {
		 *       'changelog-entry': 'User facing message'
		 *     }
		 *   }]
		 */
		'changelog-entry': (options, data) => {
			if (_.isEmpty(data.commits)) {
				throw new Error('All commits were filtered out for this version');
			}

			data.commits.forEach((commit) => {
				if (commit.footer) {
					commit.subject = commit.footer['changelog-entry'] || commit.subject;
				}
				commit.author = getAuthor(commit.hash);
			});

			return data;
		},
	},

	getGitReferenceFromVersion: {
		/**
		 * @summary Add a `v` prefix to the version
		 * @function
		 * @public
		 *
		 * @param {Object} options - options
		 * @param {String} version - version
		 * @returns {String} git reference
		 *
		 * @example
		 * const reference = presets.getGitReferenceFromVersion['v-prefix']({}, '1.0.0');
		 * console.log(reference);
		 * > v1.0.0
		 */
		'v-prefix': (options, version) => {
			if (_.startsWith(version, 'v')) {
				return version;
			}

			return `v${version}`;
		},
	},

	updateVersion: {
		/**
		 * @summary Update NPM version
		 * @function
		 * @public
		 *
		 * @param {Object} options - options
		 * @param {Boolean|RegExp} [options.clean=true] - determines how to sanitise the version
		 * @param {String} cwd - current working directory
		 * @param {String} version - version
		 * @param {Function} callback - callback (error)
		 * @returns {null}
		 *
		 * @example
		 * presets.updateVersion.npm({}, process.cwd(), '1.0.0', (error) => {
		 *   if (error) {
		 *     throw error;
		 *   }
		 * });
		 */
		npm: (options, cwd, version, callback) => {
			const cleanFn = getCleanFunction(options);
			const packageJSON = path.join(cwd, 'package.json');
			const packageLockJSON = path.join(cwd, 'package-lock.json');
			const npmShrinkwrapJSON = path.join(cwd, 'npm-shrinkwrap.json');
			const cleanedVersion = cleanFn(version);

			if (!cleanedVersion) {
				return callback(new Error(`Invalid version: ${version}`));
			}

			async.waterfall(
				[
					(done) => readJSON(packageJSON, done),
					(pjObj, done) => {
						const publishedAt = new Date().toISOString();
						updateJSON(
							packageJSON,
							{
								version: cleanedVersion,
								versionist: { ...pjObj.versionist, publishedAt },
							},
							done,
						);
					},
					(done) => {
						updateJSON(
							packageLockJSON,
							{
								version: cleanedVersion,
							},
							(error) => {
								if (error && error.code === 'ENOENT') {
									return done(null);
								}
								return done(error);
							},
						);
					},
					(done) =>
						readJSON(packageLockJSON, (readError, pljObj) => {
							if (readError && readError.code === 'ENOENT') {
								return done(null);
							}

							if (
								pljObj.lockfileVersion >= 2 &&
								pljObj.packages &&
								pljObj.packages[''] &&
								pljObj.packages[''].version
							) {
								pljObj.packages[''].version = cleanedVersion;
								updateJSON(
									packageLockJSON,
									{
										packages: pljObj.packages,
									},
									(updateError) => {
										if (updateError && updateError.code === 'ENOENT') {
											return done(null);
										}
										return done(updateError);
									},
								);
							} else {
								return done(null);
							}
						}),

					(done) => {
						updateJSON(
							npmShrinkwrapJSON,
							{
								version: cleanedVersion,
							},
							(error) => {
								if (error && error.code === 'ENOENT') {
									return done(null);
								}
								return done(error);
							},
						);
					},
				],
				callback,
			);
		},

		/**
		 * @summary Update Rust Cargo crate version
		 * @function
		 * @public
		 *
		 * @param {Object} options - options
		 * @param {Boolean|RegExp} [options.clean=true] - determines how to sanitise the version
		 * @param {String} cwd - current working directory
		 * @param {String} version - version
		 * @param {Function} callback - callback (error)
		 * @returns {null}
		 *
		 * @example
		 * presets.updateVersion.cargo({}, process.cwd(), '1.0.0', (error) => {
		 *   if (error) {
		 *     throw error;
		 *   }
		 * });
		 */
		cargo: (options, cwd, version, callback) => {
			const cleanFn = getCleanFunction(options);
			const cargoToml = path.join(cwd, 'Cargo.toml');
			const cargoLock = path.join(cwd, 'Cargo.lock');

			const cleanedVersion = cleanFn(version);

			if (!cleanedVersion) {
				return callback(new Error(`Invalid version: ${version}`));
			}

			async.waterfall(
				[
					(done) => {
						return fs.readFile(cargoToml, 'utf8', done);
					},

					(contents, done) => {
						// Capture first `name = "..."` occurrence immediately after `[package]`
						const matches = contents.match(
							/\[package\][^[]+?name\s*=\s*("|')(.+?)\1/m,
						);
						if (_.isNull(matches)) {
							done(new Error(`Package name not found in ${cargoToml}`));
						} else {
							done(null, matches[2]);
						}
					},

					(packageName, done) => {
						if (fs.existsSync(cargoLock)) {
							// Update first `version = "..."` occurrence immediately after `name = "${packageName}"`
							replace(
								cargoLock,
								new RegExp(
									`(name\\s*=\\s*(?:"|')${packageName}(?:"|')[^[]+?version\\s*=\\s*)("|').*?\\2`,
									'm',
								),
								'$1$2' + cleanedVersion + '$2',
								(err) => {
									return done(err || null);
								},
							);
						} else {
							done(null);
						}
					},

					(done) => {
						// Update first `version = "..."` occurrence immediately after `[package]`
						replace(
							cargoToml,
							/(\[package\][^[]+?version\s*=\s*)("|').*?\2/m,
							'$1$2' + cleanedVersion + '$2',
							done,
						);
					},
				],
				callback,
			);
		},

		/**
		 * @summary Update package version in Python Init file
		 * @function
		 * @public
		 *
		 * @param {Object} options - options
		 * @param {String} [options.targetFile] - path to target python file, defaults to `__init__.py`
		 * @param {Boolean|RegExp} [options.clean=true] - determines how to sanitise the version
		 * @param {String} cwd - current working directory
		 * @param {String} version - version
		 * @param {Function} callback - callback (error)
		 * @returns {null}
		 *
		 * @example
		 * presets.updateVersion.initPy({}, process.cwd(), '1.0.0', (error) => {
		 *   if (error) {
		 *     throw error;
		 *   }
		 * });
		 */
		initPy: (options, cwd, version, callback) => {
			_.defaults(options, {
				targetFile: '__init__.py',
			});

			const cleanFn = getCleanFunction(options);
			const initFile = path.join(cwd, options.targetFile);
			const cleanedVersion = cleanFn(version);

			if (!cleanedVersion) {
				return callback(new Error(`Invalid version: ${version}`));
			}

			replaceInFile(
				{
					files: initFile,
					from: /(__version__\s*=\s*)('|")(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\2/g,
					to: '$1$2' + cleanedVersion + '$2',
				},
				(error) => {
					if (error) {
						return callback(error);
					}
				},
			);
		},

		/**
		 * @summary Update quoted version immediately following a regex
		 * @function
		 * @public
		 *
		 * @param {Object} options - options
		 * @param {String} [options.baseDir] - relative directory to append to cwd
		 * @param {String} options.file - file to modify
		 * @param {String} options.regex - regex leading up to the quoted version string
		 * @param {String} [options.regexFlags] - any modifier flags as used in RegExp
		 * @param {Boolean|RegExp} [options.clean=true] - determines how to sanitise the version
		 * @param {String} cwd - current working directory
		 * @param {String} version - version
		 * @param {Function} callback - callback (error)
		 * @returns {null}
		 *
		 * @example
		 * presets.updateVersion.quoted({
		 *   file: 'myfile.h',
		 *   regex: /^VERSION\s+=\s+/,
		 *   regexFlags: 'm'
		 * }, process.cwd(), '1.0.0', (error) => {
		 *   if (error) {
		 *     throw error;
		 *   }
		 * });
		 */
		quoted: (options, cwd, version, callback) => {
			_.defaults(options, {
				baseDir: '.',
				regexFlags: '',
			});

			if (path.isAbsolute(options.baseDir)) {
				return callback(new Error("baseDir option can't be an absolute path"));
			}
			if (_.isUndefined(options.file)) {
				return callback(new Error('Missing file option'));
			}
			if (path.isAbsolute(options.file)) {
				return callback(new Error("file option can't be an absolute path"));
			}
			if (_.isUndefined(options.regex)) {
				return callback(new Error('Missing regex option'));
			}

			const updateFile = path.join(cwd, options.baseDir, options.file);
			const cleanFn = getCleanFunction(options);

			const cleanedVersion = cleanFn(version);

			if (!cleanedVersion) {
				return callback(new Error(`Invalid version: ${version}`));
			}

			const innerRegex = RegExp(options.regex);
			const combinedRegexSource = '(' + innerRegex.source + ')("|\').*?\\2';
			const combinedRegexFlags = _.join(
				_.uniqBy(innerRegex.flags + options.regexFlags),
				'',
			);

			replace(
				updateFile,
				new RegExp(combinedRegexSource, combinedRegexFlags),
				'$1$2' + cleanedVersion + '$2',
				callback,
			);
		},

		/**
		 * @summary Update version file
		 * @function
		 * @public
		 * @returns {null}
		 *
		 * @param {Object} options - options
		 * @param {Boolean|RegExp} [options.clean=true] - determines how to sanitise the version
		 * @param {String} cwd - current working directory
		 * @param {String} version - version
		 * @param {Function} callback - callback (error)
		 *
		 * @example
		 * presets.updateVersion["update-version-file"]({}, process.cwd(), '1.0.0', (error) => {
		 *   if (error) {
		 *     throw error;
		 *   }
		 * });
		 */
		'update-version-file': (options, cwd, version, callback) => {
			const versionFile = path.join(cwd, 'VERSION');

			// Write with w+ mode, this will create the file if not preset
			return fs.writeFile(
				versionFile,
				version,
				{
					flag: 'w+',
				},
				callback,
			);
		},

		/**
		 * @summary Will attempt to update several possible targets and ignore failures
		 * @function
		 * @public
		 * @returns {null}
		 *
		 * @param {Object} options - options
		 * @param {Boolean|RegExp} [options.clean=true] - determines how to sanitise the version
		 * @param {String} cwd - current working directory
		 * @param {String} version - version
		 * @param {Function} callback - callback (error)
		 *
		 * @example
		 * presets.updateVersion.mixed({}, process.cwd(), '1.0.0', (error) => {
		 *   if (error) {
		 *     throw error;
		 *   }
		 * });
		 */
		mixed: (options, cwd, version, callback) => {
			// Wrap update functions to ignore any errors
			const wrapped = _.map(
				[
					module.exports.updateVersion.npm,
					module.exports.updateVersion.cargo,
					module.exports.updateVersion['update-version-file'],
					module.exports.updateVersion.initPy,
				],
				(updateFn) => {
					// This will be used for async.parallel
					return (cb) => {
						return updateFn(options, cwd, version, () => {
							// Ignoring errors will cause async.parallel to run through all
							// possibilities without short-circuiting
							return cb(null);
						});
					};
				},
			);
			return async.parallel(wrapped, callback);
		},
	},

	updateContract: {
		/**
		 * @summary Update contract version
		 * @function
		 * @public
		 *
		 * @param {Object} options - options
		 * @param {Boolean|RegExp} [options.clean=true] - determines how to sanitise the version
		 * @param {String} cwd - current working directory
		 * @param {String} version - version
		 * @param {Function} callback - callback (error)
		 * @returns {null}
		 *
		 * @example
		 * presets.updateContract.version({}, process.cwd(), '1.0.0', (error) => {
		 *   if (error) {
		 *     throw error;
		 *   }
		 * });
		 */
		version: (options, cwd, version, callback) => {
			const cleanFn = getCleanFunction(options);
			const cleanedVersion = cleanFn(version);

			if (!cleanedVersion) {
				return callback(new Error(`Invalid version: ${version}`));
			}

			const contract = path.join(cwd, 'balena.yml');
			if (!fs.existsSync(contract)) {
				return callback(null, version);
			}

			const content = yaml.parseDocument(fs.readFileSync(contract, 'utf8'));
			content.set('version', cleanedVersion);
			fs.writeFile(contract, content.toString(), callback);
		},
	},

	incrementVersion: {
		/**
		 * @summary Increment a version following semver
		 * @function
		 * @public
		 *
		 * @param {Object} options - options
		 * @param {String} version - original version
		 * @param {String} incrementLevel - increment level
		 * @returns {String} incremented version
		 *
		 * @example
		 * const version = presets.incrementVersion.semver({}, '1.0.0', 'major');
		 * console.log(version);
		 * > 2.0.0
		 */
		semver: (options, version, incrementLevel) => {
			if (!semver.valid(version)) {
				throw new Error(`Invalid version: ${version}`);
			}

			const incrementedVersion = semver.inc(version, incrementLevel);

			if (!incrementedVersion) {
				throw new Error(`Invalid increment level: ${incrementLevel}`);
			}

			return incrementedVersion;
		},
	},
	// prettier-ignore
	template: {
    oneline: templateDefaults.concat([
      '{{#*inline "render-header"}}',
        '{{> block-prefix}}{{nesting}} {{version}} - {{moment date "Y-MM-DD"}}',
      '{{/inline}}',

      '{{> commits nesting="##" block=""}}'
    ].join('\n')),
    default: templateDefaults.concat([
      '{{~#*inline "render-header"}}',
        '{{> block-prefix}}{{nesting}} {{#eq nesting "#"}}v{{else}}{{/eq}}{{version}}',
        '{{> block-prefix}}{{nesting}}# ({{moment date "Y-MM-DD"}})',
      '{{/inline}}',

      '{{> commits nesting="#" block=""}}'
    ].join('\n'))
  },

	INITIAL_CHANGELOG: INITIAL_CHANGELOG,
};
