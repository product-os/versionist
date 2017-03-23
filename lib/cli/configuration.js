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
 * @module Versionist.CLI.Configuration
 */

const _ = require('lodash');
const presets = require('../presets');
const fs = require('fs');

/**
 * @summary Configuration default values
 * @type Object
 * @constant
 * @private
 */
const DEFAULTS = {
  path: {
    type: 'string',
    default: process.cwd()
  },
  changelogFile: {
    type: 'string',
    default: 'CHANGELOG.md'
  },
  defaultInitialVersion: {
    type: 'string',
    default: '0.0.1'
  },
  gitDirectory: {
    type: 'string',
    default: '.git'
  },
  parseFooterTags: {
    type: 'boolean',
    default: true
  },
  lowerCaseFooterTags: {
    type: 'boolean',
    default: true
  },
  editChangelog: {
    type: 'boolean',
    default: true
  },
  editVersion: {
    type: 'boolean',
    default: true
  },
  subjectParser: {
    type: 'function',
    default: _.identity,
    allowsPresets: true
  },
  bodyParser: {
    type: 'function',
    default: _.identity,
    allowsPresets: true
  },
  includeCommitWhen: {
    type: 'function',
    default: _.constant(true),
    allowsPresets: true
  },
  transformTemplateData: {
    type: 'function',
    default: _.identity,
    allowsPresets: true
  },
  includeMergeCommits: {
    type: 'boolean',
    default: false
  },
  getChangelogDocumentedVersions: {
    type: 'function',
    default: 'changelog-headers',
    allowsPresets: true
  },
  getIncrementLevelFromCommit: {
    type: 'function',
    default: _.constant(null),
    allowsPresets: true
  },
  incrementVersion: {
    type: 'function',
    default: 'semver',
    allowsPresets: true
  },
  getGitReferenceFromVersion: {
    type: 'function',
    default: _.identity,
    allowsPresets: true
  },
  addEntryToChangelog: {
    type: 'function',
    default: 'prepend',
    allowsPresets: true
  },
  updateVersion: {
    type: [ 'function', 'object' ],
    default: 'npm',
    allowsPresets: true
  },
  template: {
    type: 'string',
    default: [
      '## {{version}} - {{moment date "Y-MM-DD"}}',
      '',
      '{{#each commits}}',
      '{{#if this.subject.title}}',
      '- {{capitalize this.subject.title}}',
      '{{else}}',
      '- {{capitalize this.subject}}',
      '{{/if}}',
      '{{/each}}'
    ].join('\n')
  }
};

/**
 * @summary Check if a property is a preset property
 * @function
 * @private
 *
 * @param {*} value - property value
 * @returns {Boolean} whether the value is a preset property
 *
 * @example
 * if (configuration.isPresetProperty('foo')) {
 *   console.log('This is a preset property');
 * }
 */
exports.isPresetProperty = (value) => {
  return _.some([
    _.isString(value),
    _.isPlainObject(value) && _.isString(value.preset)
  ]);
};

/**
 * @summary Parse a preset definition
 * @function
 * @private
 *
 * @param {(String|Object)} value - preset value
 * @returns {Object} preset definition
 *
 * @example
 * const definition = configuration.parsePresetDefinition({
 *   preset: 'foo',
 *   myOption: 1
 * });
 *
 * console.log(definition.name);
 * console.log(definition.options.myOption);
 */
exports.parsePresetDefinition = (value) => {
  if (_.isString(value)) {
    return {
      name: value,
      options: {}
    };
  }

  return {
    name: value.preset,
    options: _.omit(value, 'preset')
  };
};

/**
 * @summary Get a property parsed value
 * @function
 * @private
 *
 * @param {String} propertyName - property name
 * @param {Object} propertyDescription - property description
 * @param {*} [propertyDescription.default] - default value
 * @param {Object} data - configuration data
 * @returns {*} value
 *
 * @example
 * const value = configuration.getPropertyParsedValue('hello', {
 *   type: 'string',
 *   default: 'foo'
 * }, {
 *   hello: 'bar'
 * });
 */
exports.getPropertyParsedValue = (propertyName, propertyDescription, data) => {
  const currentValue = _.get(data, propertyName);

  if (_.isUndefined(currentValue) || _.isNull(currentValue)) {
    return propertyDescription.default;
  }

  return currentValue;
};

/**
 * @summary Determine if a property value is valid
 * @function
 * @private
 *
 * @param {Object} propertyDescription - property description
 * @param {String|Array} propertyDescription.type - property type
 * @param {*} value - value
 * @returns {Boolean} whether the value type is valid
 *
 * @example
 * if (configuration.isPropertyValueValid({
 *   type: 'string'
 * }, 'foo')) {
 *   console.log('Foo is valid!');
 * }
 */
exports.isPropertyValueValid = (propertyDescription, value) => {
  const typeCheck = (v, d) => {
    return typeof v === d;
  };

  if (_.isArray(propertyDescription.type)) {
    return _.some(propertyDescription.type, (descriptionType) => {
      return typeCheck(value, descriptionType);
    });
  }

  return typeCheck(value, propertyDescription.type);
};

/**
 * @summary Parse a preset value
 * @function
 * @private
 *
 * @param {Object} presetsHash - presets hash
 * @param {String} propertyName - property name
 * @param {(String|Object)} value - preset value
 * @returns {Function} preset function
 *
 * @example
 * const preset = configuration.parsePreset({
 *   foo: {
 *     hello: (options, name) => {
 *       return `Hello ${name}`;
 *     }
 *   }
 * }, 'foo', 'hello');
 *
 * preset('Juan');
 */
exports.parsePreset = (presetsHash, propertyName, value) => {
  const propertyPresets = _.get(presetsHash, propertyName, {});
  const presetDefinition = exports.parsePresetDefinition(value);
  const presetFunction = _.get(propertyPresets, presetDefinition.name);

  if (!presetFunction) {
    throw new Error(`Invalid preset: ${propertyName} -> ${presetDefinition.name}`);
  }

  return _.partial(presetFunction, presetDefinition.options);
};

/**
 * @summary Parse a configuration file object
 * @function
 * @public
 *
 * @param {Object} data - configuration data
 * @returns {Object} parsed configuration
 *
 * @example
 * const options = configuration.parse({
 *   changelogFile: 'Foo.md',
 *   editVersion: false
 * });
 */
exports.parse = (data) => {
  return _.mapValues(DEFAULTS, (propertyDescription, propertyName) => {
    const value = exports.getPropertyParsedValue(propertyName, propertyDescription, data);

    if (exports.isPresetProperty(value) && propertyDescription.allowsPresets) {
      return exports.parsePreset(presets, propertyName, value);
    }

    if (!exports.isPropertyValueValid(propertyDescription, value)) {
      throw new Error([
        `Invalid option value: ${value}.`,
        `The \`${propertyName}\` option expects a ${_.isArray(propertyDescription.type)
           ? propertyDescription.type.join(' or ') : propertyDescription.type},`,
        `but instead got a ${typeof value}.`
      ].join(' '));
    }

    return value;
  });
};

/**
 * @summary Load a configuration file
 * @function
 * @public
 *
 * @param {String} file - file path
 * @returns {Object} configuration
 *
 * @example
 * const config = configuration.load('versionist.conf.js');
 * console.log(config);
 */
exports.load = (file) => {
  try {
    return require(file);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error(`Can't find ${file}`);
    } else if (error instanceof SyntaxError) {
      throw new Error(`Syntax error in configuration file: ${file}`);
    }

    throw error;
  }
};

/**
 * @summary Returns path of first existing file
 * @function
 * @public
 *
 * @param {array} paths - file paths for files that may or may not exist
 * @returns {string} file path
 *
 * @example
 * const configPath = configuration.firstExistingFile([ './foo.js', './bar.js' ]);
 * console.log(configPath);
 */
exports.firstExistingFile = (paths) => {
  return paths.find((p) => {
    return fs.existsSync(p);
  });
};
