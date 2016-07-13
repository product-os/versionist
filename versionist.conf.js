module.exports = {

  subjectParser: 'angular',

  getGitReferenceFromVersion: 'v-prefix',

  addEntryToChangelog: {
    preset: 'prepend',
    fromLine: 5
  },

  updateVersion: 'npm',

  includeCommitWhen: (commit) => {
    return commit.footer['Changelog-Entry'];
  },

  getIncrementLevelFromCommit: (commit) => {
    return commit.footer['Change-Type'];
  },

  template: [
    '## {{version}} - {{moment date "Y-MM-DD"}}',
    '',
    '{{#each commits}}',
    '{{#with footer}}',
    '- {{capitalize Changelog-Entry}}',
    '{{/with}}',
    '{{/each}}'
  ].join('\n')

};
