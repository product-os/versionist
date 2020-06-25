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

const _ = require('lodash');
const m = require('mochainon');
const configuration = require('../lib/cli/configuration');

describe('CLI Configuration', function () {
	describe('.isPresetProperty()', function () {
		const presets = {};
		const propertyName = 'test';
		presets[propertyName] = {
			foo: 1,
		};

		it('should return true if property is a string', function () {
			const property = 'foo';
			m.chai.expect(
				configuration.isPresetProperty(presets, propertyName, property),
			).to.be.true;
		});

		it('should return false if property is a number', function () {
			const property = 1;
			m.chai.expect(
				configuration.isPresetProperty(presets, propertyName, property),
			).to.be.false;
		});

		it('should return false if property is a function', function () {
			const property = _.noop;
			m.chai.expect(
				configuration.isPresetProperty(presets, propertyName, property),
			).to.be.false;
		});

		it('should return false if property is an empty object', function () {
			const property = {};
			m.chai.expect(
				configuration.isPresetProperty(presets, propertyName, property),
			).to.be.false;
		});

		it('should return true if property is an object containing a preset string value', function () {
			const property = {
				preset: 'foo',
			};

			m.chai.expect(
				configuration.isPresetProperty(presets, propertyName, property),
			).to.be.true;
		});

		it('should return true if property is an object containing a preset string value and other keys', function () {
			const property = {
				preset: 'foo',
				hello: 'world',
				foo: 123,
			};

			m.chai.expect(
				configuration.isPresetProperty(presets, propertyName, property),
			).to.be.true;
		});

		it('should return false if property is an object containing a preset number value', function () {
			const property = {
				preset: 1,
			};

			m.chai.expect(
				configuration.isPresetProperty(presets, propertyName, property),
			).to.be.false;
		});

		it('should return false if property is an object containing a preset function value', function () {
			const property = {
				preset: _.noop,
			};

			m.chai.expect(
				configuration.isPresetProperty(presets, propertyName, property),
			).to.be.false;
		});
	});

	describe('.parsePresetDefinition()', function () {
		it('should parse a string preset', function () {
			const preset = 'foo';
			m.chai.expect(configuration.parsePresetDefinition(preset)).to.deep.equal({
				name: 'foo',
				options: {},
			});
		});

		it('should parse an object preset without options', function () {
			m.chai
				.expect(
					configuration.parsePresetDefinition({
						preset: 'foo',
					}),
				)
				.to.deep.equal({
					name: 'foo',
					options: {},
				});
		});

		it('should parse an object preset with options', function () {
			m.chai
				.expect(
					configuration.parsePresetDefinition({
						preset: 'foo',
						option: 1,
						hello: 'world',
					}),
				)
				.to.deep.equal({
					name: 'foo',
					options: {
						option: 1,
						hello: 'world',
					},
				});
		});
	});

	describe('.getPropertyParsedValue()', function () {
		describe('given a string property', function () {
			it('should return the default value if undeclared', function () {
				const value = configuration.getPropertyParsedValue(
					'hello',
					{
						type: 'string',
						default: 'foo',
					},
					{},
				);

				m.chai.expect(value).to.equal('foo');
			});

			it('should return the default value if undefined', function () {
				const value = configuration.getPropertyParsedValue(
					'hello',
					{
						type: 'string',
						default: 'foo',
					},
					{
						hello: undefined,
					},
				);

				m.chai.expect(value).to.equal('foo');
			});

			it('should return the default value if null', function () {
				const value = configuration.getPropertyParsedValue(
					'hello',
					{
						type: 'string',
						default: 'foo',
					},
					{
						hello: null,
					},
				);

				m.chai.expect(value).to.equal('foo');
			});
		});

		describe('given a boolean property', function () {
			it('should not return the default value if false', function () {
				const value = configuration.getPropertyParsedValue(
					'hello',
					{
						type: 'boolean',
						default: true,
					},
					{
						hello: false,
					},
				);

				m.chai.expect(value).to.be.false;
			});

			it('should return the default value if undefined', function () {
				const value = configuration.getPropertyParsedValue(
					'hello',
					{
						type: 'boolean',
						default: true,
					},
					{
						hello: undefined,
					},
				);

				m.chai.expect(value).to.be.true;
			});

			it('should return the default value if null', function () {
				const value = configuration.getPropertyParsedValue(
					'hello',
					{
						type: 'boolean',
						default: true,
					},
					{
						hello: null,
					},
				);

				m.chai.expect(value).to.be.true;
			});
		});

		describe('given a number property', function () {
			it('should not return the default value if 0', function () {
				const value = configuration.getPropertyParsedValue(
					'hello',
					{
						type: 'number',
						default: 1,
					},
					{
						hello: 0,
					},
				);

				m.chai.expect(value).to.equal(0);
			});
		});
	});

	describe('.isPropertyValueValid()', function () {
		it('should return true if the property value type is valid', function () {
			m.chai.expect(
				configuration.isPropertyValueValid(
					{
						type: 'string',
					},
					'foo',
				),
			).to.be.true;

			m.chai.expect(
				configuration.isPropertyValueValid(
					{
						type: 'number',
					},
					1,
				),
			).to.be.true;

			m.chai.expect(
				configuration.isPropertyValueValid(
					{
						type: 'function',
					},
					_.noop,
				),
			).to.be.true;

			m.chai.expect(
				configuration.isPropertyValueValid(
					{
						type: ['function'],
					},
					_.noop,
				),
			).to.be.true;

			m.chai.expect(
				configuration.isPropertyValueValid(
					{
						type: ['function'],
					},
					[_.noop],
				),
			).to.be.true;

			m.chai.expect(
				configuration.isPropertyValueValid(
					{
						type: ['function', 'string'],
					},
					['npm', _.noop],
				),
			).to.be.true;
		});

		it('should return false if the property value type is not valid', function () {
			m.chai.expect(
				configuration.isPropertyValueValid(
					{
						type: 'string',
					},
					1,
				),
			).to.be.false;

			m.chai.expect(
				configuration.isPropertyValueValid(
					{
						type: 'number',
					},
					'foo',
				),
			).to.be.false;

			m.chai.expect(
				configuration.isPropertyValueValid(
					{
						type: 'function',
					},
					{},
				),
			).to.be.false;

			m.chai.expect(
				configuration.isPropertyValueValid(
					{
						type: ['function', 'string'],
					},
					[{}],
				),
			).to.be.false;
		});
	});

	describe('.parsePreset()', function () {
		const presetDefinition = {
			type: 'function',
		};

		it('should throw if the preset was not found', function () {
			m.chai
				.expect(() => {
					configuration.parsePreset(
						presetDefinition,
						{
							foo: {},
						},
						'foo',
						'hello',
					);
				})
				.to.throw('Invalid preset: foo -> hello');
		});

		it('should partially apply the options to the preset', function () {
			const preset = configuration.parsePreset(
				presetDefinition,
				{
					foo: {
						hello: (options) => {
							return options.foo;
						},
					},
				},
				'foo',
				{
					preset: 'hello',
					foo: 'bar',
				},
			);

			m.chai.expect(preset()).to.equal('bar');
		});
	});

	describe('.load()', function () {
		it('should throw if file is not found', function () {
			m.chai
				.expect(() => {
					configuration.load('./FooBar.js');
				})
				.to.throw("Cannot find module './FooBar.js'");
		});
	});

	describe('.hasDefaultConfigFile()', function () {
		it('Should return path if it exists', function () {
			m.chai
				.expect(configuration.hasDefaultConfigFile('versionist.conf.js'))
				.to.equal('__NO_CONFIG');

			m.chai
				.expect(configuration.hasDefaultConfigFile('package.json'))
				.to.equal('package.json');
		});
	});
});
