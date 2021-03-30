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
const path = require('path');
const fs = require('fs');
const os = require('os');
const tmp = require('tmp');
const yaml = require('js-yaml');
const presets = require('../lib/presets');

describe('Presets', function () {
	describe('.subjectParser', function () {
		describe('.angular', function () {
			it('should pass the whole commit as a title when parsing non-angular commits', function () {
				const subject = 'Do x, y and z';
				const result = presets.subjectParser.angular({}, subject);

				m.chai.expect(result).to.deep.equal({
					type: undefined,
					scope: undefined,
					title: 'Do x, y and z',
				});
			});

			it('should parse subjects without a scope', function () {
				const subject = 'feat: hello world';
				const result = presets.subjectParser.angular({}, subject);

				m.chai.expect(result).to.deep.equal({
					type: 'feat',
					scope: undefined,
					title: 'hello world',
				});
			});

			it('should parse subjects with scopes', function () {
				const subject = 'feat(foo): hello world';
				const result = presets.subjectParser.angular({}, subject);

				m.chai.expect(result).to.deep.equal({
					type: 'feat',
					scope: 'foo',
					title: 'hello world',
				});
			});

			it('should preserve scope casing', function () {
				const subject = 'feat(fooBar): hello world';
				const result = presets.subjectParser.angular({}, subject);

				m.chai.expect(result).to.deep.equal({
					type: 'feat',
					scope: 'fooBar',
					title: 'hello world',
				});
			});
		});
	});

	describe('.includeCommitWhen', function () {
		describe('.angular', function () {
			it('should return true if commit.subject.type equals feat', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: {
								type: 'feat',
							},
						},
					),
				).to.be.true;
			});

			it('should return true if commit.subject.type equals fix', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: {
								type: 'fix',
							},
						},
					),
				).to.be.true;
			});

			it('should return true if commit.subject.type equals perf', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: {
								type: 'perf',
							},
						},
					),
				).to.be.true;
			});

			it('should return false if commit.subject.type is docs', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: {
								type: 'docs',
							},
						},
					),
				).to.be.false;
			});

			it('should return false if commit.subject.type is style', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: {
								type: 'style',
							},
						},
					),
				).to.be.false;
			});

			it('should return false if commit.subject.type is refactor', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: {
								type: 'refactor',
							},
						},
					),
				).to.be.false;
			});

			it('should return false if commit.subject.type is test', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: {
								type: 'test',
							},
						},
					),
				).to.be.false;
			});

			it('should return false if commit.subject.type is chore', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: {
								type: 'chore',
							},
						},
					),
				).to.be.false;
			});

			it('should return false if commit.subject.type is an unknown type', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: {
								type: 'foobar',
							},
						},
					),
				).to.be.false;
			});

			it('should return false if commit.subject.type is not defined', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: {},
						},
					),
				).to.be.false;
			});

			it('should return true if commit.subject starts with feat', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: 'feat($ngRepeat): hello world',
						},
					),
				).to.be.true;
			});

			it('should return true if commit.subject starts with fix', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: 'fix($ngRepeat): hello world',
						},
					),
				).to.be.true;
			});

			it('should return true if commit.subject starts with perf', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: 'perf($ngRepeat): hello world',
						},
					),
				).to.be.true;
			});

			it('should return false if commit.subject starts with docs', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: 'docs($ngRepeat): hello world',
						},
					),
				).to.be.false;
			});

			it('should return false if commit.subject starts with style', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: 'style($ngRepeat): hello world',
						},
					),
				).to.be.false;
			});

			it('should return false if commit.subject starts with refactor', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: 'refactor($ngRepeat): hello world',
						},
					),
				).to.be.false;
			});

			it('should return false if commit.subject starts with test', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: 'test($ngRepeat): hello world',
						},
					),
				).to.be.false;
			});

			it('should return false if commit.subject starts with chore', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: 'chore($ngRepeat): hello world',
						},
					),
				).to.be.false;
			});

			it('should return false if commit.subject starts with an unknown type', function () {
				m.chai.expect(
					presets.includeCommitWhen.angular(
						{},
						{
							subject: 'foobar($ngRepeat): hello world',
						},
					),
				).to.be.false;
			});
		});

		describe('.has-changetype', function () {
			it('should return true if has has change-type lower case', function () {
				const data = {
					subject: 'subject',
					footer: {
						'change-type': 'patch',
					},
				};
				m.chai.expect(presets.includeCommitWhen['has-changetype']({}, data)).to
					.be.true;
			});

			it('should return true if has has change-type titled', function () {
				const data = {
					subject: 'subject',
					footer: {
						'Change-Type': 'patch',
					},
				};
				m.chai.expect(presets.includeCommitWhen['has-changetype']({}, data)).to
					.be.true;
			});

			it('should return fase if has has no change-type', function () {
				const data = {
					subject: 'subject',
					footer: {
						'missing-change-type': 'patch',
					},
				};
				m.chai.expect(presets.includeCommitWhen['has-changetype']({}, data)).to
					.be.false;
			});
		});
	});

	describe('.getChangelogDocumentedVersions', function () {
		describe('.`changelog-headers`', function () {
			describe('given there was an error reading the file', function () {
				beforeEach(function () {
					this.fsReadFileStub = m.sinon.stub(fs, 'readFile');
					this.fsReadFileStub.yields(new Error('read error'));
				});

				afterEach(function () {
					this.fsReadFileStub.restore();
				});

				it('should yield back the error', function (done) {
					const fn =
						presets.getChangelogDocumentedVersions['changelog-headers'];
					fn({}, 'CHANGELOG.md', (error, versions) => {
						m.chai.expect(error).to.be.an.instanceof(Error);
						m.chai.expect(error.message).to.equal('read error');
						m.chai.expect(versions).to.not.exist;
						done();
					});
				});
			});

			describe('given the file does not exist', function () {
				beforeEach(function () {
					this.fsReadFileStub = m.sinon.stub(fs, 'readFile');
					const ENOENT = new Error('ENOENT');
					ENOENT.code = 'ENOENT';
					this.fsReadFileStub.yields(ENOENT);
				});

				afterEach(function () {
					this.fsReadFileStub.restore();
				});

				it('should yield back an empty array', function (done) {
					const fn =
						presets.getChangelogDocumentedVersions['changelog-headers'];
					fn({}, 'CHANGELOG.md', (error, versions) => {
						m.chai.expect(error).to.not.exist;
						m.chai.expect(versions).to.deep.equal([]);
						done();
					});
				});
			});

			describe('given the file contained versions as headers', function () {
				beforeEach(function () {
					this.fsReadFileStub = m.sinon.stub(fs, 'readFile');
					this.fsReadFileStub.yields(
						null,
						[
							'# My markdown document',
							'',
							'## 1.1.0',
							'',
							'- foo',
							'',
							'## 1.0.0',
							'',
							'- foo',
						].join('\n'),
					);
				});

				afterEach(function () {
					this.fsReadFileStub.restore();
				});

				it('should yield the documented versions', function (done) {
					const fn =
						presets.getChangelogDocumentedVersions['changelog-headers'];
					fn({}, 'CHANGELOG.md', (error, versions) => {
						m.chai.expect(error).to.not.exist;
						m.chai.expect(versions).to.deep.equal(['1.1.0', '1.0.0']);
						done();
					});
				});
			});

			describe('given the file contained non-normalised versions as headers', function () {
				beforeEach(function () {
					this.fsReadFileStub = m.sinon.stub(fs, 'readFile');
					this.fsReadFileStub.yields(
						null,
						[
							'# My markdown document',
							'',
							'## v1.1.0+rev0',
							'',
							'- foo',
							'',
							'## v1.0.0+rev1',
							'',
							'- foo',
						].join('\n'),
					);
				});

				afterEach(function () {
					this.fsReadFileStub.restore();
				});

				it('should normalize the versions by default', function (done) {
					const fn =
						presets.getChangelogDocumentedVersions['changelog-headers'];
					fn({}, 'CHANGELOG.md', (error, versions) => {
						m.chai.expect(error).to.not.exist;
						m.chai.expect(versions).to.deep.equal(['1.1.0', '1.0.0']);
						done();
					});
				});

				it('should normalize the versions with the correct regexp', function (done) {
					const fn =
						presets.getChangelogDocumentedVersions['changelog-headers'];
					fn(
						{
							clean: /v/,
						},
						'CHANGELOG.md',
						(error, versions) => {
							m.chai.expect(error).to.not.exist;
							m.chai
								.expect(versions)
								.to.deep.equal(['1.1.0+rev0', '1.0.0+rev1']);
							done();
						},
					);
				});

				it('should not normalize the versions if clean is false', function (done) {
					const fn =
						presets.getChangelogDocumentedVersions['changelog-headers'];
					fn(
						{
							clean: false,
						},
						'CHANGELOG.md',
						(error, versions) => {
							m.chai.expect(error).to.not.exist;
							m.chai
								.expect(versions)
								.to.deep.equal(['v1.1.0+rev0', 'v1.0.0+rev1']);
							done();
						},
					);
				});
			});

			describe('given the file contained versions plus other text as headers', function () {
				beforeEach(function () {
					this.fsReadFileStub = m.sinon.stub(fs, 'readFile');
					this.fsReadFileStub.yields(
						null,
						[
							'# My markdown document',
							'',
							'## Foo 1.1.0',
							'',
							'- foo',
							'',
							'## 1.0.0 Bar',
							'',
							'- foo',
						].join('\n'),
					);
				});

				afterEach(function () {
					this.fsReadFileStub.restore();
				});

				it('should yield the documented versions', function (done) {
					const fn =
						presets.getChangelogDocumentedVersions['changelog-headers'];
					fn({}, 'CHANGELOG.md', (error, versions) => {
						m.chai.expect(error).to.not.exist;
						m.chai.expect(versions).to.deep.equal(['1.1.0', '1.0.0']);
						done();
					});
				});
			});
		});
	});

	describe('.getCurrentBaseVersion', function () {
		describe('.`latest-documented`', function () {
			it('should yield the greatest documented version in the supplied array', function (done) {
				const fn = presets.getCurrentBaseVersion['latest-documented'];
				fn({}, ['1.1.0', '1.0.0', '0.1.3+rev0'], [], (error, latest) => {
					m.chai.expect(error).to.not.exist;
					m.chai.expect(latest).to.equal('1.1.0');
					done();
				});
			});

			it('should yield the greatest documented version in the supplied array', function (done) {
				const fn = presets.getCurrentBaseVersion['latest-documented'];
				fn({}, ['1.0.0', '0.1.3+rev0', '1.1.0'], [], (error, latest) => {
					m.chai.expect(error).to.not.exist;
					m.chai.expect(latest).to.equal('1.1.0');
					done();
				});
			});
		});
	});

	describe('.addEntryToChangelog', function () {
		describe('.prepend', function () {
			describe('given the file does not exist', function () {
				beforeEach(function () {
					this.tmp = tmp.tmpNameSync();
				});

				afterEach(function () {
					fs.unlinkSync(this.tmp);
				});

				it('should create the file', function (done) {
					presets.addEntryToChangelog.prepend(
						{},
						this.tmp,
						['Lorem ipsum'].join('\n'),
						(error) => {
							m.chai.expect(error).to.not.exist;

							const contents = fs.readFileSync(this.tmp, {
								encoding: 'utf8',
							});

							m.chai
								.expect(contents)
								.to.equal(`${presets.INITIAL_CHANGELOG}Lorem ipsum\n`);

							done();
						},
					);
				});
			});

			describe('given a temporary file with contents', function () {
				beforeEach(function () {
					this.tmp = tmp.fileSync();
					fs.writeFileSync(this.tmp.fd, 'Foo Bar\nHello World');
				});

				afterEach(function () {
					this.tmp.removeCallback();
				});

				it('should not add a white line if not necessary', function (done) {
					presets.addEntryToChangelog.prepend(
						{
							fromLine: 0,
						},
						this.tmp.name,
						['Lorem ipsum', ''].join('\n'),
						(error) => {
							m.chai.expect(error).to.not.exist;

							const contents = fs.readFileSync(this.tmp.name, {
								encoding: 'utf8',
							});

							m.chai
								.expect(contents)
								.to.equal(
									['Lorem ipsum', '', 'Foo Bar', 'Hello World'].join('\n'),
								);

							done();
						},
					);
				});

				it('should add a white line if necessary', function (done) {
					presets.addEntryToChangelog.prepend(
						{
							fromLine: 0,
						},
						this.tmp.name,
						['Lorem ipsum'].join('\n'),
						(error) => {
							m.chai.expect(error).to.not.exist;

							const contents = fs.readFileSync(this.tmp.name, {
								encoding: 'utf8',
							});

							m.chai
								.expect(contents)
								.to.equal(
									['Lorem ipsum', '', 'Foo Bar', 'Hello World'].join('\n'),
								);

							done();
						},
					);
				});

				it('should remove extra white lines', function (done) {
					presets.addEntryToChangelog.prepend(
						{
							fromLine: 0,
						},
						this.tmp.name,
						['Lorem ipsum', '', '', ''].join('\n'),
						(error) => {
							m.chai.expect(error).to.not.exist;

							const contents = fs.readFileSync(this.tmp.name, {
								encoding: 'utf8',
							});

							m.chai
								.expect(contents)
								.to.equal(
									['Lorem ipsum', '', 'Foo Bar', 'Hello World'].join('\n'),
								);

							done();
						},
					);
				});
			});

			describe('given a temporary file with contents and leading white lines', function () {
				beforeEach(function () {
					this.tmp = tmp.fileSync();
					fs.writeFileSync(this.tmp.fd, '\n\n\nFoo Bar\nHello World');
				});

				afterEach(function () {
					this.tmp.removeCallback();
				});

				it('should normalize white lines', function (done) {
					presets.addEntryToChangelog.prepend(
						{
							fromLine: 0,
						},
						this.tmp.name,
						['Lorem ipsum', '', '', ''].join('\n'),
						(error) => {
							m.chai.expect(error).to.not.exist;

							const contents = fs.readFileSync(this.tmp.name, {
								encoding: 'utf8',
							});

							m.chai
								.expect(contents)
								.to.equal(
									['Lorem ipsum', '', 'Foo Bar', 'Hello World'].join('\n'),
								);

							done();
						},
					);
				});
			});

			describe('given a temporary file with contents and trailing white lines', function () {
				beforeEach(function () {
					this.tmp = tmp.fileSync();
					fs.writeFileSync(this.tmp.fd, 'Foo Bar\nHello World\n\n');
				});

				afterEach(function () {
					this.tmp.removeCallback();
				});

				it('should keep the trailing white lines intact', function (done) {
					presets.addEntryToChangelog.prepend(
						{
							fromLine: 0,
						},
						this.tmp.name,
						['Lorem ipsum'].join('\n'),
						(error) => {
							m.chai.expect(error).to.not.exist;

							const contents = fs.readFileSync(this.tmp.name, {
								encoding: 'utf8',
							});

							m.chai
								.expect(contents)
								.to.equal(
									['Lorem ipsum', '', 'Foo Bar', 'Hello World', '', ''].join(
										'\n',
									),
								);

							done();
						},
					);
				});
			});

			describe('given a temporary file with a header', function () {
				beforeEach(function () {
					this.tmp = tmp.fileSync();
					fs.writeFileSync(
						this.tmp.fd,
						[
							'This is my CHANGELOG',
							'====================',
							'',
							'Entry 1',
						].join('\n'),
					);
				});

				afterEach(function () {
					this.tmp.removeCallback();
				});

				it('should support a `fromLine` option', function (done) {
					presets.addEntryToChangelog.prepend(
						{
							fromLine: 3,
						},
						this.tmp.name,
						['Entry 2'].join('\n'),
						(error) => {
							m.chai.expect(error).to.not.exist;

							const contents = fs.readFileSync(this.tmp.name, {
								encoding: 'utf8',
							});

							m.chai
								.expect(contents)
								.to.equal(
									[
										'This is my CHANGELOG',
										'====================',
										'',
										'Entry 2',
										'',
										'Entry 1',
									].join('\n'),
								);

							done();
						},
					);
				});
			});
		});
	});

	describe('.getGitReferenceFromVersion', function () {
		describe('.`v-prefix`', function () {
			it('should prepend a `v` to the version', function () {
				const version = presets.getGitReferenceFromVersion['v-prefix'](
					{},
					'1.0.0',
				);
				m.chai.expect(version).to.equal('v1.0.0');
			});

			it('should not prepend a `v` to the version if it already has one', function () {
				const version = presets.getGitReferenceFromVersion['v-prefix'](
					{},
					'v1.0.0',
				);
				m.chai.expect(version).to.equal('v1.0.0');
			});
		});
	});

	describe('.updateVersion', function () {
		describe('.npm', function () {
			describe('given package.json does not exist', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
				});

				afterEach(function () {
					this.cwd.removeCallback();
				});

				it('should yield an error', function (done) {
					presets.updateVersion.npm({}, this.cwd.name, '1.0.0', (error) => {
						m.chai.expect(error).to.be.an.instanceof(Error);
						m.chai.expect(error.code).to.equal('ENOENT');
						done();
					});
				});
			});

			describe('given package.json exists', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.packageJSON = path.join(this.cwd.name, 'package.json');

					fs.writeFileSync(
						this.packageJSON,
						JSON.stringify(
							{
								name: 'foo',
								version: '1.0.0',
							},
							null,
							2,
						),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.packageJSON);
					this.cwd.removeCallback();
				});

				it('should be able to update the version', function (done) {
					presets.updateVersion.npm({}, this.cwd.name, '1.1.0', (error) => {
						m.chai.expect(error).to.not.exist;

						const packageJSON = JSON.parse(
							fs.readFileSync(this.packageJSON, {
								encoding: 'utf8',
							}),
						);

						m.chai.expect(packageJSON).to.deep.equal({
							name: 'foo',
							version: '1.1.0',
						});

						done();
					});
				});

				it('should preserve correct identation', function (done) {
					presets.updateVersion.npm({}, this.cwd.name, '1.1.0', (error) => {
						m.chai.expect(error).to.not.exist;

						const contents = fs.readFileSync(this.packageJSON, {
							encoding: 'utf8',
						});

						m.chai
							.expect(contents)
							.to.equal(
								['{', '  "name": "foo",', '  "version": "1.1.0"', '}'].join(
									'\n',
								) + os.EOL,
							);

						done();
					});
				});

				it('should normalize the version', function (done) {
					presets.updateVersion.npm(
						{},
						this.cwd.name,
						'  v1.1.0  ',
						(error) => {
							m.chai.expect(error).to.not.exist;

							const packageJSON = JSON.parse(
								fs.readFileSync(this.packageJSON, {
									encoding: 'utf8',
								}),
							);

							m.chai.expect(packageJSON).to.deep.equal({
								name: 'foo',
								version: '1.1.0',
							});

							done();
						},
					);
				});

				it('should reject an invalid version', function (done) {
					presets.updateVersion.npm({}, this.cwd.name, 'foo', (error) => {
						m.chai.expect(error).to.be.an.instanceof(Error);
						m.chai.expect(error.message).to.equal('Invalid version: foo');
						done();
					});
				});
			});

			describe('given package-lock.json does not exist', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.packageJSON = path.join(this.cwd.name, 'package.json');

					fs.writeFileSync(
						this.packageJSON,
						JSON.stringify(
							{
								name: 'foo',
								version: '1.0.0',
							},
							null,
							2,
						),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.packageJSON);
					this.cwd.removeCallback();
				});

				it('should not yield an error', function (done) {
					presets.updateVersion.npm({}, this.cwd.name, '1.0.0', (error) => {
						m.chai.expect(error).to.be.null;
						done();
					});
				});
			});

			describe('given package-lock.json exists', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.packageJSON = path.join(this.cwd.name, 'package.json');
					this.packageLockJSON = path.join(this.cwd.name, 'package-lock.json');

					fs.writeFileSync(
						this.packageJSON,
						JSON.stringify(
							{
								name: 'foo',
								version: '1.0.0',
							},
							null,
							2,
						),
					);
					fs.writeFileSync(
						this.packageLockJSON,
						JSON.stringify(
							{
								name: 'foo',
								version: '1.0.0',
							},
							null,
							2,
						),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.packageJSON);
					fs.unlinkSync(this.packageLockJSON);
					this.cwd.removeCallback();
				});

				it('should be able to update the version', function (done) {
					presets.updateVersion.npm({}, this.cwd.name, '1.1.0', (error) => {
						m.chai.expect(error).to.not.exist;

						const packageLockJSON = JSON.parse(
							fs.readFileSync(this.packageLockJSON, {
								encoding: 'utf8',
							}),
						);

						m.chai.expect(packageLockJSON).to.deep.equal({
							name: 'foo',
							version: '1.1.0',
						});

						done();
					});
				});

				it('should preserve correct identation', function (done) {
					presets.updateVersion.npm({}, this.cwd.name, '1.1.0', (error) => {
						m.chai.expect(error).to.not.exist;

						const contents = fs.readFileSync(this.packageLockJSON, {
							encoding: 'utf8',
						});

						m.chai
							.expect(contents)
							.to.equal(
								['{', '  "name": "foo",', '  "version": "1.1.0"', '}'].join(
									'\n',
								) + os.EOL,
							);

						done();
					});
				});

				it('should normalize the version', function (done) {
					presets.updateVersion.npm(
						{},
						this.cwd.name,
						'  v1.1.0  ',
						(error) => {
							m.chai.expect(error).to.not.exist;

							const packageLockJSON = JSON.parse(
								fs.readFileSync(this.packageLockJSON, {
									encoding: 'utf8',
								}),
							);

							m.chai.expect(packageLockJSON).to.deep.equal({
								name: 'foo',
								version: '1.1.0',
							});

							done();
						},
					);
				});

				it('should reject an invalid version', function (done) {
					presets.updateVersion.npm({}, this.cwd.name, 'foo', (error) => {
						m.chai.expect(error).to.be.an.instanceof(Error);
						m.chai.expect(error.message).to.equal('Invalid version: foo');
						done();
					});
				});
			});

			describe('given npm-shrinkwrap.json does not exist', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.packageJSON = path.join(this.cwd.name, 'package.json');

					fs.writeFileSync(
						this.packageJSON,
						JSON.stringify(
							{
								name: 'foo',
								version: '1.0.0',
							},
							null,
							2,
						),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.packageJSON);
					this.cwd.removeCallback();
				});

				it('should not yield an error', function (done) {
					presets.updateVersion.npm({}, this.cwd.name, '1.0.0', (error) => {
						m.chai.expect(error).to.be.null;
						done();
					});
				});
			});

			describe('given npm-shrinkwrap.json exists', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.packageJSON = path.join(this.cwd.name, 'package.json');
					this.npmShrinkwrapJSON = path.join(
						this.cwd.name,
						'npm-shrinkwrap.json',
					);

					fs.writeFileSync(
						this.packageJSON,
						JSON.stringify(
							{
								name: 'foo',
								version: '1.0.0',
							},
							null,
							2,
						),
					);
					fs.writeFileSync(
						this.npmShrinkwrapJSON,
						JSON.stringify(
							{
								name: 'foo',
								version: '1.0.0',
							},
							null,
							2,
						),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.packageJSON);
					fs.unlinkSync(this.npmShrinkwrapJSON);
					this.cwd.removeCallback();
				});

				it('should be able to update the version', function (done) {
					presets.updateVersion.npm({}, this.cwd.name, '1.1.0', (error) => {
						m.chai.expect(error).to.not.exist;

						const npmShrinkwrapJSON = JSON.parse(
							fs.readFileSync(this.npmShrinkwrapJSON, {
								encoding: 'utf8',
							}),
						);

						m.chai.expect(npmShrinkwrapJSON).to.deep.equal({
							name: 'foo',
							version: '1.1.0',
						});

						done();
					});
				});

				it('should preserve correct identation', function (done) {
					presets.updateVersion.npm({}, this.cwd.name, '1.1.0', (error) => {
						m.chai.expect(error).to.not.exist;

						const contents = fs.readFileSync(this.npmShrinkwrapJSON, {
							encoding: 'utf8',
						});

						m.chai
							.expect(contents)
							.to.equal(
								['{', '  "name": "foo",', '  "version": "1.1.0"', '}'].join(
									'\n',
								) + os.EOL,
							);

						done();
					});
				});

				it('should normalize the version', function (done) {
					presets.updateVersion.npm(
						{},
						this.cwd.name,
						'  v1.1.0  ',
						(error) => {
							m.chai.expect(error).to.not.exist;

							const npmShrinkwrapJSON = JSON.parse(
								fs.readFileSync(this.npmShrinkwrapJSON, {
									encoding: 'utf8',
								}),
							);

							m.chai.expect(npmShrinkwrapJSON).to.deep.equal({
								name: 'foo',
								version: '1.1.0',
							});

							done();
						},
					);
				});

				it('should reject an invalid version', function (done) {
					presets.updateVersion.npm({}, this.cwd.name, 'foo', (error) => {
						m.chai.expect(error).to.be.an.instanceof(Error);
						m.chai.expect(error.message).to.equal('Invalid version: foo');
						done();
					});
				});
			});
		});

		describe('.cargo', function () {
			describe('well-formed Cargo.toml without a Cargo.lock', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.cargoToml = path.join(this.cwd.name, 'Cargo.toml');

					fs.writeFileSync(
						this.cargoToml,
						[
							'[package]',
							'name = "foo"',
							'version = "1.0.0"',
							'',
							'[dependencies.bar]',
							'version = "2.0.0"',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.cargoToml);
					this.cwd.removeCallback();
				});

				it('should be able to update the version', function (done) {
					presets.updateVersion.cargo({}, this.cwd.name, '1.1.0', (error) => {
						m.chai.expect(error).to.not.exist;

						m.chai
							.expect(fs.readFileSync(this.cargoToml, 'utf8'))
							.to.equal(
								[
									'[package]',
									'name = "foo"',
									'version = "1.1.0"',
									'',
									'[dependencies.bar]',
									'version = "2.0.0"',
									'',
								].join('\n'),
							);

						done();
					});
				});

				it('should be able to preserve the version', function (done) {
					presets.updateVersion.cargo({}, this.cwd.name, '1.0.0', (error) => {
						m.chai.expect(error).to.not.exist;

						m.chai
							.expect(fs.readFileSync(this.cargoToml, 'utf8'))
							.to.equal(
								[
									'[package]',
									'name = "foo"',
									'version = "1.0.0"',
									'',
									'[dependencies.bar]',
									'version = "2.0.0"',
									'',
								].join('\n'),
							);

						done();
					});
				});

				it('should yield an error when trying to update with a non-semver version', function (done) {
					presets.updateVersion.cargo(
						{},
						this.cwd.name,
						'not-a-semver',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai
								.expect(error.message)
								.to.equal('Invalid version: not-a-semver');
							done();
						},
					);
				});
			});

			describe('well-formed Cargo.toml and Cargo.lock', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.cargoToml = path.join(this.cwd.name, 'Cargo.toml');
					this.cargoLock = path.join(this.cwd.name, 'Cargo.lock');

					fs.writeFileSync(
						this.cargoToml,
						[
							'[package]',
							'name = "foo"',
							'version = "1.0.0"',
							'',
							'[dependencies.bar]',
							'version = "2.0.0"',
							'',
						].join('\n'),
					);

					fs.writeFileSync(
						this.cargoLock,
						[
							'[[package]]',
							'name = "bar"',
							'version = "2.0.0"',
							'source = "registry+https://github.com/rust-lang/crates.io-index"',
							'',
							'[[package]]',
							'name = "foo"',
							'version = "1.0.0"',
							'dependencies = [',
							' "bar 2.0.0 (registry+https://github.com/rust-lang/crates.io-index)",',
							']',
							'',
							'[metadata]',
							'"checksum bar 2.0.0 (registry+https://...)" = "..."',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.cargoToml);
					fs.unlinkSync(this.cargoLock);
					this.cwd.removeCallback();
				});

				it('should be able to update the version in both files', function (done) {
					presets.updateVersion.cargo({}, this.cwd.name, '1.0.1', (error) => {
						m.chai.expect(error).to.not.exist;

						m.chai
							.expect(fs.readFileSync(this.cargoToml, 'utf8'))
							.to.equal(
								[
									'[package]',
									'name = "foo"',
									'version = "1.0.1"',
									'',
									'[dependencies.bar]',
									'version = "2.0.0"',
									'',
								].join('\n'),
							);

						m.chai
							.expect(fs.readFileSync(this.cargoLock, 'utf8'))
							.to.equal(
								[
									'[[package]]',
									'name = "bar"',
									'version = "2.0.0"',
									'source = "registry+https://github.com/rust-lang/crates.io-index"',
									'',
									'[[package]]',
									'name = "foo"',
									'version = "1.0.1"',
									'dependencies = [',
									' "bar 2.0.0 (registry+https://github.com/rust-lang/crates.io-index)",',
									']',
									'',
									'[metadata]',
									'"checksum bar 2.0.0 (registry+https://...)" = "..."',
									'',
								].join('\n'),
							);

						done();
					});
				});

				it('should be able to preserve the version in both files', function (done) {
					presets.updateVersion.cargo({}, this.cwd.name, '1.0.0', (error) => {
						m.chai.expect(error).to.not.exist;

						m.chai
							.expect(fs.readFileSync(this.cargoToml, 'utf8'))
							.to.equal(
								[
									'[package]',
									'name = "foo"',
									'version = "1.0.0"',
									'',
									'[dependencies.bar]',
									'version = "2.0.0"',
									'',
								].join('\n'),
							);

						m.chai
							.expect(fs.readFileSync(this.cargoLock, 'utf8'))
							.to.equal(
								[
									'[[package]]',
									'name = "bar"',
									'version = "2.0.0"',
									'source = "registry+https://github.com/rust-lang/crates.io-index"',
									'',
									'[[package]]',
									'name = "foo"',
									'version = "1.0.0"',
									'dependencies = [',
									' "bar 2.0.0 (registry+https://github.com/rust-lang/crates.io-index)",',
									']',
									'',
									'[metadata]',
									'"checksum bar 2.0.0 (registry+https://...)" = "..."',
									'',
								].join('\n'),
							);

						done();
					});
				});

				it('should yield an error when trying to update with a non-semver version', function (done) {
					presets.updateVersion.cargo(
						{},
						this.cwd.name,
						'not-a-semver',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai
								.expect(error.message)
								.to.equal('Invalid version: not-a-semver');
							done();
						},
					);
				});
			});

			describe('single-quotes in Cargo.toml and Cargo.lock', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.cargoToml = path.join(this.cwd.name, 'Cargo.toml');
					this.cargoLock = path.join(this.cwd.name, 'Cargo.lock');

					fs.writeFileSync(
						this.cargoToml,
						[
							'[package]',
							"name = 'foo'",
							"version = '1.0.0'",
							'',
							'[dependencies.bar]',
							"version = '2.0.0'",
							'',
						].join('\n'),
					);

					fs.writeFileSync(
						this.cargoLock,
						[
							'[[package]]',
							"name = 'bar'",
							"version = '2.0.0'",
							"source = 'registry+https://github.com/rust-lang/crates.io-index'",
							'',
							'[[package]]',
							"name = 'foo'",
							"version = '1.0.0'",
							'dependencies = [',
							" 'bar 2.0.0 (registry+https://github.com/rust-lang/crates.io-index)',",
							']',
							'',
							'[metadata]',
							"'checksum bar 2.0.0 (registry+https://...)' = '...'",
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.cargoToml);
					fs.unlinkSync(this.cargoLock);
					this.cwd.removeCallback();
				});

				it('should be able to update the version (and preserve the single-quotes)', function (done) {
					presets.updateVersion.cargo({}, this.cwd.name, '1.1.0', (error) => {
						m.chai.expect(error).to.not.exist;

						m.chai
							.expect(fs.readFileSync(this.cargoToml, 'utf8'))
							.to.equal(
								[
									'[package]',
									"name = 'foo'",
									"version = '1.1.0'",
									'',
									'[dependencies.bar]',
									"version = '2.0.0'",
									'',
								].join('\n'),
							);

						m.chai
							.expect(fs.readFileSync(this.cargoLock, 'utf8'))
							.to.equal(
								[
									'[[package]]',
									"name = 'bar'",
									"version = '2.0.0'",
									"source = 'registry+https://github.com/rust-lang/crates.io-index'",
									'',
									'[[package]]',
									"name = 'foo'",
									"version = '1.1.0'",
									'dependencies = [',
									" 'bar 2.0.0 (registry+https://github.com/rust-lang/crates.io-index)',",
									']',
									'',
									'[metadata]',
									"'checksum bar 2.0.0 (registry+https://...)' = '...'",
									'',
								].join('\n'),
							);

						done();
					});
				});
			});

			describe('given Cargo.toml does not exist', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
				});

				afterEach(function () {
					this.cwd.removeCallback();
				});

				it('should yield an error', function (done) {
					presets.updateVersion.cargo({}, this.cwd.name, '1.0.0', (error) => {
						m.chai.expect(error).to.be.an.instanceof(Error);
						m.chai.expect(error.code).to.equal('ENOENT');
						done();
					});
				});
			});

			describe('missing package name in Cargo.toml', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.cargoToml = path.join(this.cwd.name, 'Cargo.toml');

					fs.writeFileSync(
						this.cargoToml,
						[
							'[package]',
							'version = "1.0.0"',
							'',
							'[dependencies]',
							'name = "bar"',
							'version = "2.0.0"',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.cargoToml);
					this.cwd.removeCallback();
				});

				it('should yield an error', function (done) {
					presets.updateVersion.cargo({}, this.cwd.name, '1.1.0', (error) => {
						m.chai.expect(error).to.be.an.instanceof(Error);
						m.chai
							.expect(error.message)
							.to.equal(`Package name not found in ${this.cargoToml}`);
						done();
					});
				});
			});

			describe('missing target package name in Cargo.lock', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.cargoToml = path.join(this.cwd.name, 'Cargo.toml');
					this.cargoLock = path.join(this.cwd.name, 'Cargo.lock');

					fs.writeFileSync(
						this.cargoToml,
						['[package]', 'name = "foo"', 'version = "1.0.0"', ''].join('\n'),
					);

					fs.writeFileSync(
						this.cargoLock,
						[
							'[[package]]',
							'name = "bar"',
							'version = "2.0.0"',
							'source = "registry+https://github.com/rust-lang/crates.io-index"',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.cargoToml);
					fs.unlinkSync(this.cargoLock);
					this.cwd.removeCallback();
				});

				it('should yield an error', function (done) {
					presets.updateVersion.cargo({}, this.cwd.name, '1.0.1', (error) => {
						m.chai.expect(error).to.be.an.instanceof(Error);
						m.chai
							.expect(error.message)
							.to.equal(`Pattern does not match ${this.cargoLock}`);
						done();
					});
				});
			});

			describe('missing version in Cargo.toml', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.cargoToml = path.join(this.cwd.name, 'Cargo.toml');

					fs.writeFileSync(
						this.cargoToml,
						[
							'[package]',
							'name = "foo"',
							'',
							'[dependencies.bar]',
							'version = "2.0.0"',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.cargoToml);
					this.cwd.removeCallback();
				});

				it('should yield an error', function (done) {
					presets.updateVersion.cargo({}, this.cwd.name, '1.0.1', (error) => {
						m.chai.expect(error).to.be.an.instanceof(Error);
						m.chai
							.expect(error.message)
							.to.equal(`Pattern does not match ${this.cargoToml}`);
						done();
					});
				});
			});

			describe('missing version in Cargo.lock', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.cargoToml = path.join(this.cwd.name, 'Cargo.toml');
					this.cargoLock = path.join(this.cwd.name, 'Cargo.lock');

					fs.writeFileSync(
						this.cargoToml,
						[
							'[package]',
							'name = "foo"',
							'version = "1.0.0"',
							'',
							'[dependencies.bar]',
							'version = "2.0.0"',
							'',
						].join('\n'),
					);

					fs.writeFileSync(
						this.cargoLock,
						[
							'[[package]]',
							'name = "foo"',
							'',
							'[[package]]',
							'name = "bar"',
							'version = "2.0.0"',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.cargoToml);
					fs.unlinkSync(this.cargoLock);
					this.cwd.removeCallback();
				});

				it('should yield an error', function (done) {
					presets.updateVersion.cargo({}, this.cwd.name, '1.0.1', (error) => {
						m.chai.expect(error).to.be.an.instanceof(Error);
						m.chai
							.expect(error.message)
							.to.equal(`Pattern does not match ${this.cargoLock}`);
						done();
					});
				});
			});

			describe('missing Cargo.toml and existing Cargo.lock', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.cargoLock = path.join(this.cwd.name, 'Cargo.lock');

					fs.writeFileSync(
						this.cargoLock,
						[
							'[[package]]',
							'name = "bar"',
							'version = "2.0.0"',
							'source = "registry+https://github.com/rust-lang/crates.io-index"',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.cargoLock);
					this.cwd.removeCallback();
				});

				it('should yield an error', function (done) {
					presets.updateVersion.cargo({}, this.cwd.name, '1.0.1', (error) => {
						m.chai.expect(error).to.be.an.instanceof(Error);
						m.chai.expect(error.code).to.equal('ENOENT');
						done();
					});
				});
			});

			describe('non-semver version in Cargo.toml', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.cargoToml = path.join(this.cwd.name, 'Cargo.toml');

					fs.writeFileSync(
						this.cargoToml,
						['[package]', 'name = "foo"', 'version = "not-a-semver"', ''].join(
							'\n',
						),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.cargoToml);
					this.cwd.removeCallback();
				});

				it('should be able to update the version', function (done) {
					presets.updateVersion.cargo({}, this.cwd.name, '1.1.0', (error) => {
						m.chai.expect(error).to.not.exist;

						m.chai
							.expect(fs.readFileSync(this.cargoToml, 'utf8'))
							.to.equal(
								['[package]', 'name = "foo"', 'version = "1.1.0"', ''].join(
									'\n',
								),
							);

						done();
					});
				});
			});
		});

		describe('.quoted', function () {
			describe('file with a double-quoted version string', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.versionedFile = path.join(this.cwd.name, 'File.ver');

					fs.writeFileSync(
						this.versionedFile,
						[
							'blah blah',
							'version = "1.0.0"',
							'bloop bloop',
							'',
							'foo foo',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.versionedFile);
					this.cwd.removeCallback();
				});

				it('should be able to update the version using a literal regex', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should be able to update the version using an anchored literal regex', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /^version\s*=\s*/,
							regexFlags: 'm',
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should be able to update the version using a simple string pattern', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: 'version = ',
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should be able to update the version using a string regex', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: 'version\\s*=\\s*',
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should be able to update the version using an anchored string regex', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: '^version\\s*=\\s*',
							regexFlags: 'm',
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should be able to update the version using a RegExp object', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: RegExp('version\\s*=\\s*'),
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should yield an error when using the wrong case in the regex', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: 'VERSION\\s*=\\s*',
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai
								.expect(error.message)
								.to.equal(`Pattern does not match ${this.versionedFile}`);
							done();
						},
					);
				});

				it('should be able to update the version using a case-insensitive regex', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: 'VERSION\\s*=\\s*',
							regexFlags: 'i',
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should be able to update the version using the flags from regex', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: RegExp('VERSION\\s*=\\s*', 'i'),
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should be able update the version using multiple regex flags', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: '^VERSION\\s*=\\s*',
							regexFlags: 'mi',
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should be able update the version combining multiple regex flags', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: RegExp('^VERSION\\s*=\\s*', 'i'),
							regexFlags: 'm',
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should be able update the version combining duplicate regex flags', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: RegExp('VERSION\\s*=\\s*', 'i'),
							regexFlags: 'i',
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should be able to preserve the version', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.0.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.0.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should be able to set a pre-release version', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.2.4-beta.1',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.2.4-beta.1"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should yield an error when trying to update with a non-semver version', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'not-a-semver',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai
								.expect(error.message)
								.to.equal('Invalid version: not-a-semver');
							done();
						},
					);
				});

				it('should yield an error if the file option is missing', function (done) {
					presets.updateVersion.quoted(
						{
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai.expect(error.message).to.equal('Missing file option');
							done();
						},
					);
				});

				it('should yield an error if the regex option is missing', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai.expect(error.message).to.equal('Missing regex option');
							done();
						},
					);
				});

				it('should yield an error if the file option is an absolute path', function (done) {
					presets.updateVersion.quoted(
						{
							file: this.versionedFile,
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai
								.expect(error.message)
								.to.equal("file option can't be an absolute path");
							done();
						},
					);
				});

				it('should yield an error if the baseDir option is an absolute path', function (done) {
					presets.updateVersion.quoted(
						{
							baseDir: path.dirname(this.versionedFile),
							file: 'File.ver',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai
								.expect(error.message)
								.to.equal("baseDir option can't be an absolute path");
							done();
						},
					);
				});

				it("should yield an error if the file doesn't exist", function (done) {
					presets.updateVersion.quoted(
						{
							file: 'bad.file',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai.expect(error.code).to.equal('ENOENT');
							done();
						},
					);
				});
			});

			describe('file with a single-quoted version string', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.versionedFile = path.join(this.cwd.name, 'File.ver');

					fs.writeFileSync(
						this.versionedFile,
						[
							'blah blah',
							"version = '1.0.0'",
							'bloop bloop',
							'',
							'foo foo',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.versionedFile);
					this.cwd.removeCallback();
				});

				it('should update the version (and preserve the single quotes)', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										"version = '1.1.0'",
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});
			});

			describe('file with a badly quoted version string', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.versionedFile = path.join(this.cwd.name, 'File.ver');

					fs.writeFileSync(
						this.versionedFile,
						[
							'blah blah',
							'version = \'1.0.0"',
							'bloop bloop',
							'',
							'foo foo',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.versionedFile);
					this.cwd.removeCallback();
				});

				it('should yield an error', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai
								.expect(error.message)
								.to.equal(`Pattern does not match ${this.versionedFile}`);
							done();
						},
					);
				});
			});

			describe('file with a non-quoted version string', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.versionedFile = path.join(this.cwd.name, 'File.ver');

					fs.writeFileSync(
						this.versionedFile,
						[
							'blah blah',
							'version = 1.0.0',
							'bloop bloop',
							'',
							'foo foo',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.versionedFile);
					this.cwd.removeCallback();
				});

				it('should yield an error', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai
								.expect(error.message)
								.to.equal(`Pattern does not match ${this.versionedFile}`);
							done();
						},
					);
				});
			});

			describe('file with no version string', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.versionedFile = path.join(this.cwd.name, 'File.ver');

					fs.writeFileSync(
						this.versionedFile,
						['blah blah', 'bloop bloop', '', 'foo foo', ''].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.versionedFile);
					this.cwd.removeCallback();
				});

				it('should yield an error', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai
								.expect(error.message)
								.to.equal(`Pattern does not match ${this.versionedFile}`);
							done();
						},
					);
				});
			});

			describe('file with extra content before and after the version string', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.versionedFile = path.join(this.cwd.name, 'File.ver');

					fs.writeFileSync(
						this.versionedFile,
						[
							'blah blah',
							' before-text version("1.0.0") after-text',
							'bloop bloop',
							'',
							'foo foo',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.versionedFile);
					this.cwd.removeCallback();
				});

				it('should be able to update the version', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /version\(/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										' before-text version("1.1.0") after-text',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should yield an error when using an anchored regex', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /^version\(/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai
								.expect(error.message)
								.to.equal(`Pattern does not match ${this.versionedFile}`);
							done();
						},
					);
				});
			});

			describe('file with multiple version strings', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.versionedFile = path.join(this.cwd.name, 'File.ver');

					fs.writeFileSync(
						this.versionedFile,
						[
							'other_version = "1.0.0"',
							'blah blah',
							'version = "1.0.0"',
							'bloop bloop',
							'',
							'foo foo',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.versionedFile);
					this.cwd.removeCallback();
				});

				it('should update the first version by default', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'other_version = "1.1.0"',
										'blah blah',
										'version = "1.0.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should update only the second version with an anchored regex', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /^version\s*=\s*/,
							regexFlags: 'm',
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'other_version = "1.0.0"',
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should update only the second version with a more accurate regex', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /blah blah\nversion\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'other_version = "1.0.0"',
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should update both versions using a global flag', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /version\s*=\s*/,
							regexFlags: 'g',
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'other_version = "1.1.0"',
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});
			});

			describe('file with multiple spaces', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.versionedFile = path.join(this.cwd.name, 'File.ver');

					fs.writeFileSync(
						this.versionedFile,
						[
							'blah blah',
							'version   =  "1.0.0"',
							'bloop bloop',
							'',
							'foo foo',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.versionedFile);
					this.cwd.removeCallback();
				});

				it('should be able to update the version (and preserve the spaces)', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version   =  "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});
			});

			describe('file with mixed-case', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.versionedFile = path.join(this.cwd.name, 'File.ver');

					fs.writeFileSync(
						this.versionedFile,
						[
							'blah blah',
							'VeRsIoN = "1.0.0"',
							'bloop bloop',
							'',
							'foo foo',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.versionedFile);
					this.cwd.removeCallback();
				});

				it('should be able to update the version (and preserve the original case)', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /vErSiOn\s*=\s*/,
							regexFlags: 'i',
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'VeRsIoN = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});
			});

			describe('file with a non-semver version', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.versionedFile = path.join(this.cwd.name, 'File.ver');

					fs.writeFileSync(
						this.versionedFile,
						[
							'blah blah',
							'version = "not-a-semver"',
							'bloop bloop',
							'',
							'foo foo',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.versionedFile);
					this.cwd.removeCallback();
				});

				it('should be able to update the version', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});
			});

			describe('file in a subdirectory', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.subDir = path.join(this.cwd.name, 'subdirectory');
					this.versionedFile = path.join(this.subDir, 'File.ver');

					fs.mkdirSync(this.subDir);
					fs.writeFileSync(
						this.versionedFile,
						[
							'blah blah',
							'version = "1.0.0"',
							'bloop bloop',
							'',
							'foo foo',
							'',
						].join('\n'),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.versionedFile);
					fs.rmdirSync(this.subDir);
					this.cwd.removeCallback();
				});

				it('should be able to update the version when specifying the subdirectory', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							baseDir: 'subdirectory',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should be able to update the version when adding the subdirectory to the filename', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'subdirectory/File.ver',
							regex: /version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							m.chai
								.expect(fs.readFileSync(this.versionedFile, 'utf8'))
								.to.equal(
									[
										'blah blah',
										'version = "1.1.0"',
										'bloop bloop',
										'',
										'foo foo',
										'',
									].join('\n'),
								);

							done();
						},
					);
				});

				it('should yield an error when not specifying the subdirectory', function (done) {
					presets.updateVersion.quoted(
						{
							file: 'File.ver',
							regex: /^version\s*=\s*/,
						},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.be.an.instanceof(Error);
							m.chai.expect(error.code).to.equal('ENOENT');
							done();
						},
					);
				});
			});
		});

		describe('.mixed', () => {
			describe('given no valid version file', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.versionedFile = path.join(this.cwd.name, 'VERSION');
				});

				afterEach(function () {
					fs.unlinkSync(this.versionedFile);
					this.cwd.removeCallback();
				});

				it('should not throw an error and create the VERSION file', function (done) {
					presets.updateVersion.mixed({}, this.cwd.name, '1.1.0', (error) => {
						m.chai.expect(error).to.not.exist;
						const versionedFile = fs.readFileSync(this.versionedFile, {
							encoding: 'utf8',
						});

						m.chai.expect(versionedFile).to.equal('1.1.0');
						done();
					});
				});
			});

			describe('given existing package.json and VERSION file', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.packageJSON = path.join(this.cwd.name, 'package.json');
					this.versionedFile = path.join(this.cwd.name, 'VERSION');

					fs.writeFileSync(
						this.packageJSON,
						JSON.stringify(
							{
								name: 'foo',
								version: '1.0.0',
							},
							null,
							2,
						),
					);

					fs.writeFileSync(this.versionedFile, '1.0.0');
				});

				afterEach(function () {
					fs.unlinkSync(this.packageJSON);
					fs.unlinkSync(this.versionedFile);
					this.cwd.removeCallback();
				});

				it('should be able to update the version in both', function (done) {
					presets.updateVersion.mixed({}, this.cwd.name, '1.1.0', (error) => {
						m.chai.expect(error).to.not.exist;

						const packageJSON = JSON.parse(
							fs.readFileSync(this.packageJSON, {
								encoding: 'utf8',
							}),
						);

						const versionedFile = fs.readFileSync(this.versionedFile, {
							encoding: 'utf8',
						});

						m.chai.expect(packageJSON).to.deep.equal({
							name: 'foo',
							version: '1.1.0',
						});

						m.chai.expect(versionedFile).to.equal('1.1.0');

						done();
					});
				});
			});
		});
	});

	describe('.updateContract', function () {
		describe('.version', function () {
			describe('balena.yml does not exist', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
				});

				afterEach(function () {
					this.cwd.removeCallback();
				});

				it('should not yield an error', function (done) {
					presets.updateContract.version(
						{},
						this.cwd.name,
						'1.0.0',
						(error) => {
							done();
						},
					);
				});
			});
			describe('balena.yml exists', function () {
				beforeEach(function () {
					this.cwd = tmp.dirSync();
					this.contract = path.join(this.cwd.name, 'balena.yml');

					fs.writeFileSync(
						this.contract,
						yaml.safeDump({
							name: 'foo',
							version: '1.0.0',
						}),
					);
				});

				afterEach(function () {
					fs.unlinkSync(this.contract);
					this.cwd.removeCallback();
				});

				it('should be able to update the version', function (done) {
					presets.updateContract.version(
						{},
						this.cwd.name,
						'1.1.0',
						(error) => {
							m.chai.expect(error).to.not.exist;

							const contract = yaml.safeLoad(
								fs.readFileSync(this.contract, 'utf8'),
							);

							m.chai.expect(contract).to.deep.equal({
								name: 'foo',
								version: '1.1.0',
							});

							done();
						},
					);
				});

				it('should normalize the version', function (done) {
					presets.updateContract.version(
						{},
						this.cwd.name,
						'  v1.1.0  ',
						(error) => {
							m.chai.expect(error).to.not.exist;

							const contract = yaml.safeLoad(
								fs.readFileSync(this.contract, 'utf8'),
							);

							m.chai.expect(contract).to.deep.equal({
								name: 'foo',
								version: '1.1.0',
							});

							done();
						},
					);
				});

				it('should reject an invalid version', function (done) {
					presets.updateContract.version({}, this.cwd.name, 'foo', (error) => {
						m.chai.expect(error).to.be.an.instanceof(Error);
						m.chai.expect(error.message).to.equal('Invalid version: foo');
						done();
					});
				});
			});
		});
	});

	describe('.incrementVersion', function () {
		describe('.semver', function () {
			it('should throw if the increment level is not valid', function () {
				m.chai
					.expect(() => {
						presets.incrementVersion.semver({}, '1.0.0', 'foo');
					})
					.to.throw('Invalid increment level: foo');
			});

			it('should throw if the version is not valid', function () {
				m.chai
					.expect(() => {
						presets.incrementVersion.semver({}, 'hello', 'major');
					})
					.to.throw('Invalid version: hello');
			});

			it('should discard a `v` prefix in the original version', function () {
				const version = presets.incrementVersion.semver({}, 'v1.0.0', 'major');
				m.chai.expect(version).to.equal('2.0.0');
			});

			it('should be able to increment a major level', function () {
				const version = presets.incrementVersion.semver({}, '1.0.0', 'major');
				m.chai.expect(version).to.equal('2.0.0');
			});

			it('should be able to increment a minor level', function () {
				const version = presets.incrementVersion.semver({}, '1.0.0', 'minor');
				m.chai.expect(version).to.equal('1.1.0');
			});

			it('should be able to increment a patch level', function () {
				const version = presets.incrementVersion.semver({}, '1.0.0', 'patch');
				m.chai.expect(version).to.equal('1.0.1');
			});
		});
	});
	describe('.getIncrementLevelFromCommit', () => {
		describe('.subject', () => {
			it('should extract increment level from commit subject', () => {
				const data = {
					subject: 'patch: rest of subject',
					footer: {
						foo: 'bar',
					},
				};
				const incrementLevel = presets.getIncrementLevelFromCommit.subject(
					{},
					data,
				);
				m.chai.expect(incrementLevel).to.equal('patch');
			});
		});

		describe('.change-type', () => {
			it('should extract increment level from commit footers lower case', () => {
				const data = {
					subject: 'subject',
					footer: {
						'change-type': 'patch',
					},
				};
				const incrementLevel = presets.getIncrementLevelFromCommit[
					'change-type'
				]({}, data);
				m.chai.expect(incrementLevel).to.equal('patch');
			});

			it('should extract increment level from commit footers titled', () => {
				const data = {
					subject: 'subject',
					footer: {
						'Change-Type': 'patch',
					},
				};
				const incrementLevel = presets.getIncrementLevelFromCommit[
					'change-type'
				]({}, data);
				m.chai.expect(incrementLevel).to.equal('patch');
			});
		});

		describe('.change-type-or-subject', () => {
			it('should extract increment level from commit footers', () => {
				const data = {
					subject: 'subject',
					footer: {
						'change-type': 'patch',
					},
				};
				const incrementLevel = presets.getIncrementLevelFromCommit[
					'change-type-or-subject'
				]({}, data);
				m.chai.expect(incrementLevel).to.equal('patch');
			});

			it('should extract increment level from commit subject', () => {
				const data = {
					subject: 'patch: subject',
					footer: {
						foo: 'bar',
					},
				};
				const incrementLevel = presets.getIncrementLevelFromCommit[
					'change-type-or-subject'
				]({}, data);
				m.chai.expect(incrementLevel).to.equal('patch');
			});

			it('should prefer increment level from footers over the one in the title', () => {
				const data = {
					subject: 'minor: subject',
					footer: {
						'change-type': 'patch',
					},
				};
				const incrementLevel = presets.getIncrementLevelFromCommit[
					'change-type-or-subject'
				]({}, data);
				m.chai.expect(incrementLevel).to.equal('patch');
			});
		});
	});

	describe('.transformTemplateData', () => {
		describe('.changelog-entry', () => {
			it('should set subject to changelog entry', function () {
				const data = {
					commits: [
						{
							subject: 'Commit subject',
							footer: {
								'changelog-entry': 'User facing message',
							},
						},
					],
				};
				const result = presets.transformTemplateData['changelog-entry'](
					{},
					data,
				);
				m.chai.expect(result.commits).to.deep.equal([
					{
						author: 'Unknown author',
						subject: 'User facing message',
						footer: {
							'changelog-entry': 'User facing message',
						},
					},
				]);
			});

			it('should not modify the commit if changelog entry is not set', function () {
				const data = {
					commits: [
						{
							subject: 'Commit subject',
							footer: {
								'a-footer': 'footer',
							},
						},
					],
				};
				const result = presets.transformTemplateData['changelog-entry'](
					{},
					data,
				);
				m.chai.expect(result.commits).to.deep.equal([
					{
						author: 'Unknown author',
						subject: 'Commit subject',
						footer: {
							'a-footer': 'footer',
						},
					},
				]);
			});

			it('should throw if no commits are present', function () {
				const data = {
					commits: [],
				};
				m.chai
					.expect(() => {
						presets.transformTemplateData['changelog-entry']({}, data);
					})
					.to.throw('All commits were filtered out for this version');
			});
		});
	});
});
