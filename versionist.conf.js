var _ = require('lodash');
var execSync = require('child_process').execSync;

var getAuthor = (commitHash) => {
  return execSync(`git show --quiet --format="%an" ${commitHash}`, { encoding: 'utf8' }).replace('\n', '');
}

module.exports = {
  // This setup allows the editing and parsing of footer tags to get version and type information,
  // as well as ensuring tags of the type 'v<major>.<minor>.<patch>' are used.
  // It increments in a semver compatible fashion and allows the updating of NPM package info.
  editChangelog: true,
  parseFooterTags: true,
  getGitReferenceFromVersion: 'v-prefix',
  incrementVersion: 'semver',
  updateVersion: 'npm',

  // Always add the entry to the top of the Changelog, below the header.
  addEntryToChangelog: {
    preset: 'prepend',
    fromLine: 6
  },

  // Only include a commit when there is a footer of 'change-type'.
  // Ensures commits which do not up versions are not included.
  // Commit messages without a relevant footer will not be included in the CHANGELOG.
  includeCommitWhen: (commit) => {
    return !!commit.footer['change-type'] || !!commit.footer['changelog-entry'];
  },

  // Determine the type from 'change-type:' tag.
  // Should no explicit change type be made, then no changes are assumed.
  getIncrementLevelFromCommit: (commit) => {
    return _.trim(_.get(commit.footer, 'change-type', '')) || undefined;
  },

  // If a 'changelog-entry' tag is found, use this as the subject rather than the
  // first line of the commit.
  transformTemplateData: (data) => {
    data.commits.forEach((commit) => {
      commit.subject = commit.footer['changelog-entry'] || commit.subject;
      commit.author = getAuthor(commit.hash);
    });

    return data;
  },

  template: [
    '# v{{version}} - {{moment date "Y-MM-DD"}}',
    '',
    '{{#each commits}}',
    '{{#if this.author}}',
    '* {{capitalize this.subject}} [{{this.author}}]',
    '{{else}}',
    '* {{capitalize this.subject}}',
    '{{/if}}',
    '{{/each}}'
  ].join('\n')
};
