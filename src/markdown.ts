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
 * @module Versionist.Markdown
 */

import * as _ from 'lodash';
// tslint:disable-next-line:no-var-requires
const { markdown } = require('markdown') as {
	markdown: { parse: (markdown: string) => any[] };
};

/**
 * @summary Extract node content
 * @function
 * @private
 *
 * @param {String[]} node - node
 * @returns {String[]} node content
 */
const extractNodeContent = (node: string[]): string[] => {
	return _.slice(node, 2);
};

/**
 * @summary Extract text from node
 * @function
 * @private
 *
 * @param {String[]} node - node
 * @returns {String} node text
 */
const extractNodeText = (node: string[]): string => {
	return _.join(
		_.flattenDeep(
			_.map(node, content => {
				if (_.isArray(content)) {
					return extractNodeContent(content);
				}

				return content;
			}),
		),
		'',
	);
};

/**
 * @summary Extract titles from markdown tree
 * @function
 * @private
 *
 * @param {Any[]} nodes - nodes
 * @returns {String[]} titles
 */
const extractTitlesFromTree = (nodes: any[]): string[] => {
	return _.reduce(
		nodes,
		(accumulator: string[], node) => {
			const nodeType = _.first(node);

			if (nodeType === 'header') {
				const headerContents = extractNodeContent(node);
				accumulator.push(extractNodeText(headerContents));
			}

			if (_.isArray(node)) {
				accumulator = _.union(accumulator, extractTitlesFromTree(node));
			}

			return accumulator;
		},
		[],
	);
};

/**
 * @summary Extract titles from a markdown document
 * @function
 * @public
 *
 * @param {String} text - markdown text
 * @returns {String[]} titles
 *
 * @example
 * const titles = markdown.extractTitles([
 *   '# My markdown document',
 *   '',
 *   'Hello world!'
 * ].join('\n'));
 */
export const extractTitles = _.flow([markdown.parse, extractTitlesFromTree]);
