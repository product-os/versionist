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
const tags = require('../lib/tags');

describe('Tags', function() {

  describe('.isTagLine()', function() {

    it('should return true if line represents a tag', function() {
      _.each([
        'foo: bar',
        'FOO: bar',
        'foo: 1',
        'foo-bar: baz',
        '-foo-bar-: baz',
        'foo----bar: baz',
        '----foo-bar-: baz',
        'foo-bar-----: baz',
        'foo:',
        'foo     :     bar',
        'foo:bar',
        'foo     :bar',
        'foo:     bar'
      ], (line) => {
        m.chai.expect(tags.isTagLine(line)).to.be.true;
      });
    });

    it('should return false if line does not represent a tag', function() {
      _.each([
        'Hello World',
        '   Hello: World',
        '- Hello: World',
        '(Hello: World)',
        'https://www.google.com',
        'ftp://www.google.com',
        '//www.google.com'
      ], (line) => {
        m.chai.expect(tags.isTagLine(line)).to.be.false;
      });
    });

  });

  describe('.parseTagLine()', function() {

    it('should parse a tag lines without a value', function() {
      m.chai.expect(tags.parseTagLine('foo:')).to.deep.equal({
        key: 'foo',
        value: undefined
      });
    });

    it('should parse a url value', function() {
      const url = 'https://www.google.com/foo/bar';
      m.chai.expect(tags.parseTagLine(`See: ${url}`)).to.deep.equal({
        key: 'See',
        value: url
      });
    });

    it('should parse tag lines with single word values', function() {
      _.each([
        'foo: bar',
        'foo     :    bar',
        'foo:    bar',
        'foo     :bar',
        'foo:bar'
      ], (line) => {
        m.chai.expect(tags.parseTagLine(line)).to.deep.equal({
          key: 'foo',
          value: 'bar'
        });
      });
    });

    it('should parse tag lines with multiple word values', function() {
      _.each([
        'foo: lorem ipsum dolor sit amet',
        'foo     :    lorem ipsum dolor sit amet',
        'foo:    lorem ipsum dolor sit amet',
        'foo     :lorem ipsum dolor sit amet',
        'foo:lorem ipsum dolor sit amet'
      ], (line) => {
        m.chai.expect(tags.parseTagLine(line)).to.deep.equal({
          key: 'foo',
          value: 'lorem ipsum dolor sit amet'
        });
      });
    });

    it('should parse tag lines with hyphened keys', function() {
      _.each([
        'lorem-ipsum-dolor-sit-amet: bar',
        'lorem-ipsum-dolor-sit-amet     :    bar',
        'lorem-ipsum-dolor-sit-amet:    bar',
        'lorem-ipsum-dolor-sit-amet     :bar',
        'lorem-ipsum-dolor-sit-amet:bar'
      ], (line) => {
        m.chai.expect(tags.parseTagLine(line)).to.deep.equal({
          key: 'lorem-ipsum-dolor-sit-amet',
          value: 'bar'
        });
      });
    });

    it('should parse tag lines with numbered keys', function() {
      m.chai.expect(tags.parseTagLine('1: bar')).to.deep.equal({
        key: '1',
        value: 'bar'
      });

      m.chai.expect(tags.parseTagLine('192839283: bar')).to.deep.equal({
        key: '192839283',
        value: 'bar'
      });

      m.chai.expect(tags.parseTagLine('1hello: bar')).to.deep.equal({
        key: '1hello',
        value: 'bar'
      });

      m.chai.expect(tags.parseTagLine('hello1: bar')).to.deep.equal({
        key: 'hello1',
        value: 'bar'
      });

      m.chai.expect(tags.parseTagLine('hel1lo: bar')).to.deep.equal({
        key: 'hel1lo',
        value: 'bar'
      });
    });

    it('should parse tag lines with weird hyphenated keys', function() {
      m.chai.expect(tags.parseTagLine('foo--bar: bar')).to.deep.equal({
        key: 'foo--bar',
        value: 'bar'
      });

      m.chai.expect(tags.parseTagLine('---foo--bar----: bar')).to.deep.equal({
        key: '---foo--bar----',
        value: 'bar'
      });

      m.chai.expect(tags.parseTagLine('----foo: bar')).to.deep.equal({
        key: '----foo',
        value: 'bar'
      });
    });

  });

  describe('.parseFooterTagLines()', function() {

    it('should be able to parse a footer as an object', function() {
      const footer = tags.parseFooterTagLines([
        'Foo: bar',
        'Bar: baz',
        'Baz: qux'
      ]);

      m.chai.expect(footer).to.deep.equal({
        Foo: 'bar',
        Bar: 'baz',
        Baz: 'qux'
      });
    });

    it('should be able to parse a tag without a value', function() {
      const footer = tags.parseFooterTagLines([
        'Foo:'
      ]);

      m.chai.expect(footer).to.deep.equal({
        Foo: undefined
      });
    });

    it('should ignore blank lines in between', function() {
      const footer = tags.parseFooterTagLines([
        'Foo: bar',
        '',
        '',
        'Bar: baz',
        '',
        'Baz: qux',
        ''
      ]);

      m.chai.expect(footer).to.deep.equal({
        Foo: 'bar',
        Bar: 'baz',
        Baz: 'qux'
      });
    });

    it('should not return lowered tags if not requested', function() {
      const footer = tags.parseFooterTagLines([
        'Foo: bar',
        'bar: baz'
      ]);

      m.chai.expect(footer).to.deep.equal({
        Foo: 'bar',
        bar: 'baz'
      });
    });

    it('should return two tags for each non-lowered tag, but a single tag for those already lowered', function() {
      const footer = tags.parseFooterTagLines([
        'Foo: bar',
        'bar: baz'
      ], {
        lowerCaseFooterTags: true
      });

      m.chai.expect(footer).to.deep.equal({
        Foo: 'bar',
        foo: 'bar',
        bar: 'baz'
      });
    });

    it('should not overwrite footers with the same key', function() {
      const footer = tags.parseFooterTagLines([
        'Foo: bar',
        'Foo: bar',
        'Bar: baz',
        'Foo: baz'
      ]);

      m.chai.expect(footer).to.deep.equal({
        Foo: 'bar',
        Foo1: 'bar',
        Bar: 'baz',
        Foo2: 'baz'
      });
    });
  });

});
