module.exports = {

  subjectParser: 'angular',

  getGitReferenceFromVersion: 'v-prefix',

  addEntryToChangelog: {
    preset: 'prepend',
    fromLine: 5
  },

  updateVersion: 'npm',

  includeCommitWhen: (commit) => {
    return commit.footer['changelog-entry'];
  },

  getIncrementLevelFromCommit: (commit) => {
    return commit.footer['change-type'];
  },

  template: [
    '## {{version}} - {{moment date "Y-MM-DD"}}',
    '',
    '{{#each commits}}',
    '{{#with footer}}',
    '- {{capitalize changelog-entry}}',
    '{{/with}}',
    '{{/each}}'
  ].join('\n')

};
