Versionist
==========

> Flexible CHANGELOG generation toolkit that adapts to your commit conventions.

[![npm version](https://badge.fury.io/js/versionist.svg)](http://badge.fury.io/js/versionist)
[![Build Status](https://travis-ci.org/resin-io/versionist.svg?branch=master)](https://travis-ci.org/resin-io/versionist)
[![Build status](https://ci.appveyor.com/api/projects/status/xdtf4mx8hmurnmgo/branch/master?svg=true)](https://ci.appveyor.com/project/resin-io/versionist/branch/master)
[![Gitter](https://badges.gitter.im/resin-io/etcher.svg)](https://gitter.im/resin-io/etcher?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

Versionist is non-opitionated. It adapts to your commit practices and generates
a `CHANGELOG` file that suits your taste.

**Versionist is in a very early stage, and its stil being heavily worked on. Let
us know what you think!**

How it works
------------

Versionist parses the `git` commit history between two references of your
choice. You can customise how the parser works to retrieve the data you like,
and how you like. The resulting history is then interpolated in a Handlebars
template to generate the `CHANGELOG` entry.

Example
-------

- Install Versionist

```
$ npm install -g versionist
```

- Clone the Versionist repository, as an example

```
$ git clone https://github.com/resin-io/versionist
$ cd versionist
```

- Run Versionist

```
$ versionist
```

***

```
## 1.1.0 - 2016-07-08

- Add a simple default template.
- Fix `stdout maxBuffer exceeded` when parsing big logs.
- Support commits with indented bodies.
```

Installation
------------

Install `versionist` from NPM by running:

```sh
$ npm install -g versionist
```

Notice that while this tool is hosted on a JavaScript package registry, it can
be used on any project, independently of the programming language.

Usage
-----

```
Usage: versionist [OPTIONS]

Options:
  --help, -h     show help
  --version, -v  show version number
  --config, -c   configuration file
  --current, -u  current version

Examples:
  versionist --current 1.1.0
```

### `--current`

This command line option is used to tell Versionist the current semver version
of your project.

If you are making use of `getIncrementLevelFromCommit`, you'll want to pass the
version number *before* the release, so it gets incremented automatically.

If omitted, `--current` will equal the greater version from the versions
returned by the `getChangelogDocumentedVersions` hook.

### `--config`

You can use this option to pass a custom location to `versionist.conf.js`.

Configuration
-------------

Versionist attempts to read a configuration file called `versionist.conf.js`
present on the current working directory by default. Notice that the
configuration file is not in a serializable format, like JSON or YAML given
that we'll define functions in there.

A basic configuration file looks like this:

```js
module.exports = {

  template: [
    '## v{{version}} - {{moment date "Y-MM-DD"}}',
    '',
    '{{#each commits}}',
    '- {{capitalize this.subject}}',
    '{{/each}}'
  ].join('\n')

};
```

You may define the following options:

### `template (String)`

*Defaults to a simple demonstrational template.*

This option takes a [Handlebars][handlebars] template. The following data is
passed to it:

- `(Object[]) commits`: All the commits that were not filtered out by
`includeCommitWhen`.

- `(Date) date`: The current date at the time you ran Versionist.

- `(String) version`: The version you specified when running Versionist, which
might have been incremented depending on your `getIncrementLevelFromCommit`
setting.

For your convenience, we include **all** Handlebars helpers from the
[handlebars-helpers](https://github.com/assemble/handlebars-helpers) project,
which should be more than enough for you to generate the `CHANGELOG` of your
dreams.

Notice that this option doesn't support passing a path to a template file yet,
but you can workaround this limitation by importing the NodeJS `fs` module and
manually reading the file, like this:

```js
const fs = require('fs');

module.exports = {

  template: fs.readFileSync('path/to/template.hbs', { encoding: 'utf8' })

};
```

### `changelogFile (String)`

*Defaults to `CHANGELOG.md`.*

This option specifies the desired location of your `CHANGELOG` file, relative
to the root of your project.

### `editChangelog (Boolean)`

*Defaults to `true`.*

When this option is enabled, your project's `CHANGELOG` file, as specified in
`changelogFile`, it automatically edited as configured in
`addEntryToChangelog`.

If this option is disabled, the generated entry is printed to `stdout`.

### `parseFooterTags (Boolean)`

*Defaults to `true`.*

When this option is enabled, Versionsit will attempt to parse tags in the
commit body, and append a `footer` object property on the commit object.

For example, consider the following commit:

```
My first commit

Lorem ipsum dolor sit amet.

Closes: #1
Foo: bar
```

Given `parseFooterTags: true`:

```json
{
  "subject": "My first commit",
  "body": "Lorem ipsum dolor sit amet",
  "footer": {
    "Closes": "#1",
    "Foo": "bar"
  }
}
```

Given `parseFooterTags: false`:

```json
{
  "subject": "My first commit",
  "body": "Lorem ipsum dolor sit amet\n\nCloses: #1\nFoo: bar"
}
```

Tags are parsed from the bottom of the commit body, until there is an empty
line or a non-tag line.

### `subjectParser (Function|String)`

*Defaults to the identity function.*

You can declare this property to customise how git commit subjects are parsed
by Versionist.

For example, you might be following Angular's commit guidelines, and would like
a subject like `feat($ngInclude): add a feature` to be parsed as:

```json
{
  "type": "feat",
  "scope": "$ngInclude",
  "title": "add a feature"
}
```

You can either define a function that takes the subject string as a parameter
and returns anything you like (like an object), or import a built-in preset by
passing its name.

### `bodyParser (Function|String)`

*Defaults to the identity function.*

You can declare this property to customise how git commit bodies are parsed by
Versionist. If your use case is parsing footer tags, refer to the
`parseFooterTags` option instead. If that option is enabled, only the body
(excluding the footer) will be passed to this function.

You can either define a function that takes the body string as a parameter
and returns anything you like (like an object), or import a built-in preset by
passing its name.

### `includeCommitWhen (Function)`

*Defaults to a function that always returns `true`.*

You can declare this function to control which commits are going to be included
in your `CHANGELOG`.

For example, if you use Angular's commit conventions, and declared an Angular
friendly `subjectParser` as the example above, you might want to only include
commits that have a type of `feat`, `fix` or `perf`:

```js
module.exports = {
  ...

  includeCommitWhen: (commit) => {
    return [ 'feat', 'fix', 'perf' ].includes(commit.subject.type);
  }

  ...
};
```

The whole commit object, after any transformations applied by `subjectParser`
and `bodyParser` is passed as an argument.

### `addEntryToChangelog (Function)`

*Defaults to `prepend`.*

You can declare this function to customise how the generated entry is added to
your project's `CHANGELOG` file.

If defined, the function takes three arguments:

- `(String) file`: The `CHANGELOG` file path as declared in `changelogFile`.
- `(String) entry`: The generated `CHANGELOG` entry.
- `(Function) callback`: The callback function, which accepts an optional
error.

Notice that the `callback` should be **always** explicitly called, even if you
declare a synchronous function.

If the final version (either as specified in `--current` or calculated by
`getIncrementLevelFromCommit`) is already returned by the hooks, then the entry
is not added the the `CHANGELOG`.

### `includeMergeCommits (Boolean)`

*Defaults to `false`.*

When this option is enabled, merge commits will be included in the `CHANGELOG`.

### `getChangelogDocumentedVersions (Function)`

*Defaults to `changelog-headers`.*

You can declare this function to customise how Versionist determines which
versions were already documented in the `CHANGELOG` file.

The function takes the `CHANGELOG` file as set in `changelogFile` and callback
as parameters. The latter should be called with an optional error and an array
of semantic version strings.

### `getIncrementLevelFromCommit (Function)`

*Defaults to a function that always returns `null`.*

This is an advanced feature that gives Versionist the power to automatically
calculate the appropriate next semantic version given that you include some
information on your commits to signal the semver increment level they
introduce.

For example, we might want to annotate our commits with a `Change-Type: <type>`
footer tag, where `type` is either `major`, `minor` or `patch`, and declare a
`getIncrementLevelFromCommit` function that retrieves the value of this tag:

```js
module.exports = {
  ...

  getIncrementLevelFromCommit: (commit) => {
    return commit.footer['Change-Type'];
  }

  ...
};
```

Now that this is all setup, the `version` property exposed to your `CHANGELOG`
template will contain the appropriate new version, depending on the commit
range your included.

This function takes the whole commit object as an argument (after all parsing
has been made), and should return either `major`, `minor` or `patch`.

If the increment level returned from this function is not defined, the commit
will not alter the final version.

### `getGitReferenceFromVersion (Function)`

*Defaults to the identity function.*

Declare this function to resolve a git reference from a semantic version. If
you add `x.y.z` annotated git tags you should not need to specify this hooks,
however it can be handy if you have other conventions, like prefixing the
version with `v`, etc.

### `path (String)`

*Defaults to `$CWD`.*

The path to the `git` repository.

### `gitDirectory (String)`

*Defaults to `.git`.*

The name of the `git` database directory in the repository. You'll very rarely
need to define this yourself.

Presets
-------

The preset list is currently very small. Please let us know if you have ny
ideas that could benefit your project and are generic enough to be included in
Versionist by default.

### `subjectParser`

- `angular`

This preset parses the subject according to Angular's commit guidelines. It
outputs an object containing the following properties: `type`, `scope` and
`title`.

### `getChangelogDocumentedVersions`

- `changelog-headers`

This preset parses the `CHANGELOG` file specified in `changelogFile`, and
extracts any valid semantic versions from the headers.

### `includeCommitWhen`

- `angular`

This preset only includes commits whose `commit.subject.type` is either `feat`,
`fix` or `perf`. It should be used in conjunction with `subjectParser`'s
`angular` preset.

### `addEntryToChangelog`

- `prepend`

This presets prepends the entry to the CHANGELOG file specified in
`changelogFile`, taking care of not adding unnecessary blank lines between the
current content and the new entry.

### `getGitReferenceFromVersion`

- `v-prefix`

This presets simply prepends `v` to the version.

Support
-------

If you're having any problem, please [raise an issue][github-issue] on GitHub,
or join our [Gitter channel][gitter] and the Resin.io team will be happy to
help.

License
-------

Versionist is free software, and may be redistributed under the terms specified
in the [license].

[github-issue]: https://github.com/resin-io/versionist/issues/new
[gitter]: https://gitter.im/resin-io/etcher
[license]: https://github.com/resin-io/etcher/blob/master/LICENSE
[handlebars]: http://handlebarsjs.com
