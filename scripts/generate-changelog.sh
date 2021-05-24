#!/usr/bin/env bash
# shellcheck disable=SC2094
set -eu

if [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
  echo 'ERROR: bash version >= 4.0 is required' >&2
  exit 1
fi

for dep in jq yq; do
  if ! command -v "${dep}" &>/dev/null; then
    # shellcheck disable=SC2016
    echo 'ERROR: `'"${dep}"'` command is not available' >&2
    exit 1
  fi
done

yq_min_version="2.4.0"
yq_version="$(yq --version 2>&1 | awk '{print $3}')"
if [ "${yq_version}" != "${yq_min_version}" ] && [ "${yq_version}" = "$(echo -e "${yq_version}\n${yq_min_version}" | sort -V | head -1)" ]; then
  echo "ERROR: yq version >= ${yq_min_version} is required" >&2
  exit 1
fi

REPO_PATH="${1-}"
if [ -z "${REPO_PATH}" ]; then
    echo "USAGE: $0 <path>" >&2
    exit 1
fi

GH_TOKEN="${GH_TOKEN-}"
if [ -z "${GH_TOKEN}" ]; then
    echo "ERROR: GH_TOKEN must be set (to avoid rate-limiting), https://github.com/settings/tokens/new with permissions 'repo:status'" >&2
    exit 1
fi

REPO_URL="$(command git -C "${REPO_PATH}" config --get remote.origin.url)"
REPO_URL_PATH="${REPO_URL/*github.com[:\/]}"
REPO="${REPO_URL_PATH/.git}"

GITHUB_API_HOST="api.github.com"
REPO_API_URL="https://${GITHUB_API_HOST}/repos/${REPO}"

tmp="$(mktemp -d)"
echo 'Generating CHANGELOG.yml for `'"${REPO}"'`'
page=1
while curl -H "Authorization: token ${GH_TOKEN}" -s "${REPO_API_URL}/pulls"'?state=closed&per_page=100&page='"${page}" > "${tmp}/pulls.json"; do
    items=$(jq '. | length' "${tmp}/pulls.json")
    if [ "$items" -eq 0 ]; then
        break
    else
        page=$((page+1))
    fi
    declare -A vcc
    jq -cr '.[].number' <"${tmp}/pulls.json" | while read -r pullId; do
        merge_date=$(jq -cr '.[] | select(.number == '"${pullId}"') | .merged_at' <"${tmp}/pulls.json")
        if [ "${merge_date}" = "null" ]; then
            continue
        fi
        curl -H "Authorization: token ${GH_TOKEN}" -s "${REPO_API_URL}/pulls/${pullId}/commits" > "${tmp}/pr${pullId}.json"
        merge_sha=$(jq -cr '.[] | select(.number == '"${pullId}"') | .merge_commit_sha' <"${tmp}/pulls.json")
        version="$(git -C "${REPO_PATH}" tag --contains "${merge_sha}" --sort=v:refname 2>/dev/null | grep '^v' | head -1)"
        if [ -z "${version}" ]; then
            continue
        fi
        echo "Gathering CHANGELOG for PR #${pullId} (${version})..."
        if [ ! -r "${tmp}/${version}.yml" ]; then
            yq new '[0].version' "${version#v}" > "${tmp}/${version}.yml"
            yq write -i "${tmp}/${version}.yml" '[0].date' "${merge_date}"
        fi
        i=${vcc[${version}]-0}
        [ "${i}" -gt 0 ] && echo "WARNING: PR #${pullId} is a duplicate for ${version}, merging commits"
        while read -r sha; do
            author="$(jq -r '.[] | select(.sha == "'"${sha}"'") | .commit.author.name' <"${tmp}/pr${pullId}.json")"
            if [ "${author}" = "resin-io-versionbot[bot]" ] || [ "${author}" = "resin-io-modules-versionbot[bot]" ]; then
                continue
            fi
            yq write -i "${tmp}/${version}.yml" '[0].commits[+].hash' "${sha}"
            yq write -i "${tmp}/${version}.yml" '[0].commits['"${i}"'].author' "${author}"
            mapfile -t msg < <(jq -cr '.[] | select(.sha == "'"${sha}"'") | .commit.message' <"${tmp}/pr${pullId}.json" | awk '{gsub(/^ +| +$/,"")} NF {print $0}')
            subject="${msg[0]}"
            while read -r trailer; do
                key=$(cut -f1 -d':' <<<"${trailer}" | tr '[:upper:]' '[:lower:]')
                val=$(cut -f2- -d':' <<<"${trailer}" | sed -e 's/^[[:space:]]*//')
                yq write -i "${tmp}/${version}.yml" '[0].commits['"${i}"'].footers.'"${key}" "${val}"
                unset 'msg['$((${#msg[@]} - 1))']'
            done < <(jq -cr '.[] | select(.sha == "'"${sha}"'") | .commit.message' <"${tmp}/pr${pullId}.json" | git interpret-trailers --parse)
            unset 'msg[0]'
            yq write -i "${tmp}/${version}.yml" '[0].commits['"${i}"'].subject' "${subject}"
            body=$(awk '{gsub(/^ +| +$/,"")} NF {print $0}' < <(printf "%s\n" "${msg[@]}"))
            yq write -i "${tmp}/${version}.yml" '[0].commits['"${i}"'].body' -- "${body}"
            i=$((i + 1))
        done < <(jq -cr '.[] | .sha' <"${tmp}/pr${pullId}.json")
        vcc[${version}]=$i
    done
done
mkdir -p "${REPO_PATH}/.versionbot"
mapfile -t versions < <(sort -Vr <(printf "%s\n" "${tmp}"/v*.yml))
if [ "${#versions[@]}" -eq 0 ]; then
    echo "No versioned PRs found"
else
    echo "Generating CHANGELOG.yml..."
    if [ "${#versions[@]}" -eq 1 ]; then
        mv "${versions[0]}" "${REPO_PATH}/.versionbot/CHANGELOG.yml"
    else
        yq merge -a "${versions[@]}" > "${REPO_PATH}/.versionbot/CHANGELOG.yml"
    fi
fi
[ -d "${tmp}" ] && rm -r "${tmp}"
