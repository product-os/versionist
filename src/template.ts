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

/**
 * @module Versionist.Template
 */

import * as handlebars from 'handlebars';
import * as handlebarsHelpers from 'handlebars-helpers';
handlebarsHelpers({
	handlebars,
});

/**
 * @summary Render a template
 * @function
 * @public
 *
 * @param {String} template - template
 * @param {Object} data - template data
 * @returns {String} rendered template
 *
 * @example
 * const result = template.render('Hello {{name}}', {
 *   name: 'John Doe'
 * });
 */
export const render = <T>(template: string, data: T): string => {
	return handlebars.compile<T>(template, {
		noEscape: true,
	})(data);
};
