Versionist
==========

> Flexible CHANGELOG generation toolkit that adapts to your commit conventions.

[![npm version](https://badge.fury.io/js/versionist.svg)](http://badge.fury.io/js/versionist)
[![Build Status](https://travis-ci.org/balena-io/versionist.svg?branch=master)](https://travis-ci.org/balena-io/versionist)
[![Build status](https://ci.appveyor.com/api/projects/status/xdtf4mx8hmurnmgo/branch/master?svg=true)](https://ci.appveyor.com/project/balena-io/versionist/branch/master)

Versionist is non-opinionated. It adapts to your commit practices and generates
a `CHANGELOG` file that suits your taste.

**Versionist is in a very early stage, and it's still being heavily worked on. Let
us know what you think!**

Example
-------

- Install Versionist

```
$ npm install -g versionist
```

- Clone the Versionist repository, as an example

```
$ git clone https://github.com/balena-io/versionist
$ cd versionist
$ git checkout example
```

- Run Versionist

```
$ versionist
```

***

The `CHANGELOG.md` will have a new `2.0.0` entry with the latest changes, and
the `package.json` version will be updated to `2.0.0`.

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
Usage: versionist [COMMAND] [OPTIONS]

Commands:
  versionist get <target> get latest documented version or reference

Options:
  --help, -h     show help
  --version, -v  show version number
  --title, -t    set changelog title
  --config, -c   configuration file
  --current, -u  current version
  --dry, -d      Dry run

Examples:
  versionist --current 1.1.0
  versionist get version
```

### `--current`

This command line option is used to tell Versionist the current semver version
of your project.

If you are making use of `getIncrementLevelFromCommit`, you'll want to pass the
version number *before* the release, so it gets incremented automatically.

If omitted, `--current` will be produced by `getCurrentBaseVersion`, this defaults
to the greater version from the versions returned by the `getChangelogDocumentedVersions`
hook, but can be configured for advanced behaviour.

### `--config`

You can use this option to pass a custom location to `versionist.conf.js`.


### `--title`

Custom title information can be passed. It will then be accessible in the template through `versionist.conf.js`.

### `--dry`

You can use this option to perform a dry run to see what changes _would_ be
made by versionist, without actually changing any files.

### `get <target>`

You can use this command to return the latest documented version (according to `getChangelogDocumentedVersions`) or a git reference, which is produced by
applying `getGitReferenceFromVersion` to the latest documented version.
The only valid values for target are `version` and `reference`. This command
will only accept the `--config` and `--help` options, any other option will be
ignored; running this command will not cause any changes.


How it works
------------

Versionist parses the `git` commit history between two references of your
choice. You can customise how the parser works to retrieve the data you like,
and how you like. The resulting history is then interpolated in a Handlebars
template to generate the `CHANGELOG` entry.

Understanding how all the available options fit together can be hard at first.
The following description aims to alleviate that and make it easier for the
average user to get the bigger picture:

- Versionist uses the `getChangelogDocumentedVersions` option to determine
  which is the latest documented version. If no version is found, it defaults
  to the version set in `defaultInitialVersion`.

- The `getGitReferenceFromVersion` option is then used on the latest documented
  version to transform the version string to a valid `git` reference.

- The resulting `git` reference is used to fetch the commits from the range
  `<version>..HEAD`. If no valid `git` reference was found in the previous
  step, Versionist fetches the commit range from the beginning of the project
  to `HEAD`.

- The commits found in the previous step are parsed by `subjectParser`,
  `bodyParser`, `parseFooterTags`, or any other commit-parsing option.

- `getCurrentBaseVersion` can be used to set the base version for the increment.
  It defaults to the latest documented version. You only need to overwrite this
  if you need to skip certain versions or modify it in a way that is independent
  of the increment level.

- Once all commits have been parsed, the `getIncrementLevelFromCommit` option
  is used to determine the semver increment level that should be applied to the
  current version. The current version with the
  corresponding increment level represents the final version that will be set
  in the module. The increment level is applied to the version by using the
  `incrementVersion` option.

- The project's `template` is interpolated with the commit data, which could
  have been modified by the `transformTemplateData` or `includeCommitWhen`
  option.

- The resulting changelog entry is added to the changelog file specified in
  `changelogFile` using the `addEntryToChangelog` option, unless the
  `editChangelog` option has been set to `false`.

- The project's version is updated using the `updateVersion` option, unless the
  `editVersion` option has been set to `false`.

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

If you need further manipulation to the data passed to the template that is not
possible by using template helpers, consider declaring the
`transformTemplateData` hook.

### `changelogFile (String)`

*Defaults to `CHANGELOG.md`.*

This option specifies the desired location of your `CHANGELOG` file, relative
to the root of your project.

### `defaultInitialVersion (String)`

*Defaults to `0.0.1`.*

This option specifies the desired default initial version, in case the
`getChangelogDocumentedVersions` hook doesn't find any.

### `editChangelog (Boolean)`

*Defaults to `true`.*

When this option is enabled, your project's `CHANGELOG` file, as specified in
`changelogFile`, it automatically edited as configured in
`addEntryToChangelog`.

If this option is disabled, the generated entry is printed to `stdout`.

### `editVersion (Boolean)`

*Defaults to `true`.*

When this option is enabled, the project's version will be edited as specified
in the `updateVersion` hook.

### `lowerCaseFooterTags (Boolean)`

*Defaults to `true`.*

When this option is enabled, Versionist will pre-emptively add a lowercased footer
tag key for every one it finds in a commit that is not naturally lowercase (it will
not lowercase their values). This allows `versionist.conf.js` files to disregard
case should it wish to (ie. checking only for lowercase version of tags).

ie. The commit:

```
My random-case commit.

Lorem ipsum dolor sit amet.

Closes: #1
foo: bar
```

Will produce:

```json
{
  "subject": "My random-case commit.",
  "body": "Lorem ipsum dolor sit amet.",
  "footer": {
    "Closes": "#1",
    "closes": "#1",
    "foo": "bar"
  }
}
```

Should strict casing be required, then either set the value of this option to `false`
in the Versionist configuration file, or check only for strict case in its functions.

### `parseFooterTags (Boolean)`

*Defaults to `true`.*

When this option is enabled, Versionist will attempt to parse tags in the
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
  "hash": "fd9f9cbb8bb27486339e15886159e1d145b17550",
  "footer": {
    "Closes": "#1",
    "closes": "#1",
    "Foo": "bar",
    "foo": "bar"
  }
}
```

Given `parseFooterTags: false`:

```json
{
  "subject": "My first commit",
  "body": "Lorem ipsum dolor sit amet\n\nCloses: #1\nFoo: bar",
  "hash": "fd9f9cbb8bb27486339e15886159e1d145b17550"
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

### `includeCommitWhen (Function|String)`

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
and `bodyParser` is passed as an argument. You can also import a built-in
preset by passing its name.

### `transformTemplateData (Function)`

*Defaults to the identity function.*

You can declare this function to perform advanced transformations to the data
that is passed to template in a more granular way.

```js
module.exports = {
  ...

  transformTemplateData (data) => {
    data.commits = // edit commits;
    data.version = // edit version;
    data.date = // edit date;

    data.mynewfield = 'foo';

    return data;
  }

  ...
};
```

### `addEntryToChangelog (Function|String)`

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
is not added the the `CHANGELOG`. You can also import a built-in preset by
passing its name.

### `includeMergeCommits (Boolean)`

*Defaults to `false`.*

When this option is enabled, merge commits will be included in the `CHANGELOG`.

### `getChangelogDocumentedVersions (Function|String)`

*Defaults to `changelog-headers`.*

You can declare this function to customise how Versionist determines which
versions were already documented in the `CHANGELOG` file.

The function takes the `CHANGELOG` file as set in `changelogFile` and callback
as parameters. The latter should be called with an optional error and an array
of semantic version strings. You can also import a built-in preset by passing
its name.

### `getCurrentBaseVersion (Function|String)`

*Defaults to `latest-documented`*

You can declare this function to overwrite what the base version, before the
increment will be. By default this is the latest documented version, the
greater version appearing in the array returned by `getChangelogDocumentedVersions`.

The function takes the array returned by `getChangelogDocumentedVersions`, the
history of commits from the latest git reference, and a callback as parameters.
The latter should be called with an optional error and a string representing the
current base version.

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

### `incrementVersion (Function|String)`

*Defaults to `semver`.*

Declare this function to customise how an increment level is used to increment
the current version.

This function takes the current version and the increment level as arguments.
You can also import a built-in preset by passing its name.

### `getGitReferenceFromVersion (Function|String)`

*Defaults to the identity function.*

Declare this function to resolve a git reference from a semantic version. If
you add `x.y.z` annotated git tags you should not need to specify this hooks,
however it can be handy if you have other conventions, like prefixing the
version with `v`, etc. You can also import a built-in preset by passing its
name.

### `updateVersion (Function|Function[]|String)`

*Defaults to `npm`.*

Declare this function or array of functions to specify how Versionist should update your project's version.

The function takes three arguments:

- `(String) cwd`: The current working directory.
- `(String) version`: The new version.
- `(Function) callback`: The callback.

You can also import a built-in preset by passing its name.

### `path (String)`

*Defaults to `$CWD`.*

The path to the `git` repository.

### `gitDirectory (String)`

*Defaults to `.git`.*

The name of the `git` database directory in the repository. You'll very rarely
need to define this yourself.

Presets
-------

You can specify a preset for a function hook in the following formats:

- String value

```
module.exports = {
  ...

  addEntryToChangelog: 'prepend'

  ...
};
```

- Object value

```
module.exports = {
  ...

  addEntryToChangelog: {
    preset: 'prepend',
    optionSupportedByPrepend1: 'value',
    optionSupportedByPrepend2: 'value'
  }

  ...
};
```

The preset list is currently very small. Please let us know if you have any
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

**Options**

- `(Boolean|RegExp) clean`: Defaults to true.
If true `semver.clean` will be used to sanitise the versions, if a regular expression is supplied,
every match will be replaced by the empty string.
If false no sanitisation is applied to the versions.

### `includeCommitWhen`

- `angular`

This preset only includes commits whose `commit.subject.type` is either `feat`,
`fix` or `perf`. It should be used in conjunction with `subjectParser`'s
`angular` preset.

### `addEntryToChangelog`

- `prepend`

This preset prepends the entry to the CHANGELOG file specified in
`changelogFile`, taking care of not adding unnecessary blank lines between the
current content and the new entry.

**Options**

- `(Number) fromLine`: Prepend from a certain line.

### `getGitReferenceFromVersion`

- `v-prefix`

This preset simply prepends `v` to the version.

### `updateVersion`

- `npm`

This preset updates the `version` property of `$CWD/package.json`.

**Options**

- `(Boolean|RegExp) clean`: Defaults to true.
If true `semver.clean` will be used to sanitise the version, if a regular expression is supplied
every match will be replaced by the empty string.
If false no sanitisation is applied to the version.

- `cargo`

This preset updates the `version` property of `$CWD/Cargo.toml` (and also `$CWD/Cargo.lock` if it exists).

**Options**

- `(Boolean|RegExp) clean`: Defaults to true.
If true `semver.clean` will be used to sanitise the version, if a regular expression is supplied
every match will be replaced by the empty string.
If false no sanitisation is applied to the version.

- `initPy`

This preset updates the `__version__` property of `targetFile` (which defaults to `$CWD/__init__.py`).

**Options**

- `(Boolean|RegExp) clean`: Defaults to true.
If true `semver.clean` will be used to sanitise the version, if a regular expression is supplied
every match will be replaced by the empty string.
If false no sanitisation is applied to the version.

- `quoted`

This preset updates the (double-quoted or single-quoted) version string
immediately following `regex` in the given `file`. For example a file
containing `project.version = "1.4.2";` could be updated by using the
`quoted` prefix with a `regex` of `/project\.version\s*=\s*/`. You can
optionally provide `regexFlags` to modify the `regex`'s behaviour (if using
the `^` start-of-line character in the `regex`, don't forget to add `m` to
`regexFlags`). You can optionally provide a `baseDir` to modify where it looks
for `file` (it will update `$CWD/$baseDir/$file`).

**Options**
- `(String) file`: File to modify
- `(String) baseDir` Relative directory to append to cwd
- `(String) regex`: Regular expression to match the versioning scheme
- `(String) regexFlags`: Additional flags provided to `regex`
- `(Boolean|RegExp) clean`: Defaults to true.
If true `semver.clean` will be used to sanitise the versions, if a regular expression is supplied
every match will be replaced by the empty string.
If false no sanitisation is applied to the versions.
### `incrementVersion`

- `semver`

This preset increments the version according to semver rules.

Support
-------

If you're having any problems, please [raise an issue][github-issue] on GitHub and the balena team will be happy to help.

You can also get in touch with us in the balena [forums](https://forums.balena.io/).

License
-------

Versionist is free software, and may be redistributed under the terms specified
in the [license][license].

[github-issue]: https://github.com/balena-io/versionist/issues/new
[license]: https://github.com/balena-io/etcher/blob/master/LICENSE
[handlebars]: http://handlebarsjs.com
