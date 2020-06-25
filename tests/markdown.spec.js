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
const markdown = require('../lib/markdown');

describe('Markdown', function () {
	describe('.extractTitles()', function () {
		it('should return an empty array if no titles', function () {
			const titles = markdown.extractTitles(
				['Hello World', '', 'Lorem ipsum dolor sit amet'].join('\n'),
			);

			m.chai.expect(titles).to.deep.equal([]);
		});

		it('should parse titles with links', function () {
			const titles = markdown.extractTitles(
				[
					'# [Hello](http://www.google.com) World',
					'Foo bar',
					'',
					'# Hey [there](http://yahoo.com)',
					'Bar baz',
					'',
					'# [Hola mundo](http://bing.com)',
					'Baz qux',
				].join('\n'),
			);

			m.chai
				.expect(titles)
				.to.deep.equal(['Hello World', 'Hey there', 'Hola mundo']);
		});

		it('should parse top-level titles in atx style', function () {
			const titles = markdown.extractTitles(
				['# Hello World', 'Foo bar', '', '# Hey there', 'Bar baz'].join('\n'),
			);

			m.chai.expect(titles).to.deep.equal(['Hello World', 'Hey there']);
		});

		it('should parse top-level titles in setext style', function () {
			const titles = markdown.extractTitles(
				[
					'Hello World',
					'===========',
					'Foo bar',
					'',
					'Hey there',
					'=========',
					'Bar baz',
				].join('\n'),
			);

			m.chai.expect(titles).to.deep.equal(['Hello World', 'Hey there']);
		});

		it('should parse nested titles in atx style', function () {
			const titles = markdown.extractTitles(
				[
					'# Hello world',
					'Foo bar',
					'',
					'## Hey there',
					'Bar baz',
					'',
					'### Hola mundo',
					'Foo bar',
				].join('\n'),
			);

			m.chai
				.expect(titles)
				.to.deep.equal(['Hello world', 'Hey there', 'Hola mundo']);
		});

		it('should parse nested titles in setext style', function () {
			const titles = markdown.extractTitles(
				[
					'Hello world',
					'===========',
					'Foo bar',
					'',
					'Hey there',
					'---------',
					'Bar baz',
					'',
					'### Hola mundo',
					'Foo bar',
				].join('\n'),
			);

			m.chai
				.expect(titles)
				.to.deep.equal(['Hello world', 'Hey there', 'Hola mundo']);
		});
	});
});
