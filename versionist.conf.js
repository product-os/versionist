var _ = require('lodash');

lowerKeys = (obj) => {
  return _.transform(obj, (result, val, key) => {
    result[key.toLowerCase()] = val;
  });
};

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
    fromLine: 5
  },

  // Only include a commit when there is a footer of 'change-type'.
  // Ensures commits which do not up versions are not included.
  // Commit messages without a relevant footer will not be included in the CHANGELOG.
  includeCommitWhen: (commit) => {
    commit.footer = lowerKeys(commit.footer);
    return !!commit.footer['change-type'];
  },

  // Determine the type from 'change-type:' tag.
  // Should no explicit change type be made, then no changes are assumed.
  getIncrementLevelFromCommit: (commit) => {
    commit.footer = lowerKeys(commit.footer);
    if (commit.footer['change-type']) {
      return commit.footer['change-type'].trim();
    }
  },

  // If a 'changelog-entry' tag is found, use this as the subject rather than the
  // first line of the commit.
  transformTemplateData: (data) => {
    data.commits.forEach((commit) => {
      commit.footer = lowerKeys(commit.footer);
      if (commit.footer['changelog-entry']) {
        commit.subject = commit.footer['changelog-entry'];
      }
    });

    return data;
  },

  template: [
    '# v{{version}} - {{moment date "Y-MM-DD"}}',
    '',
    '{{#each commits}}',
    '* {{capitalize this.subject}}',
    '{{/each}}'
  ].join('\n')
};
