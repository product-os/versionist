import { Octokit } from '@octokit/rest';

/**
 * @summary Get CHANGELOG.yml
 * @function
 * @public
 *
 * @param {string} owner - repo owner
 * @param {string} repo - repo
 * @param {octokit} octokit - Octokit client
 * @param {branch} branch - the branch where file exists
 * @returns {Promise<any>} The blob as returned by GitHub API
 *
 * Get the CHANGELOG.yml file using the trees and blob APIs. getContent API
 * does not allow for files bigger than 1MB so we need to get the sha and fetch it.
 */
export const getChangelogYML = async (
	owner: string,
	repo: string,
	branch: string,
	octokit: Octokit,
): Promise<string> => {
	// We need to get the commit sha from the branch. Then use that to start parsing the tree
	// and get to the file. And finally get the file sha to get blob.
	const branchResponse = await octokit.repos.getBranch({
		owner,
		repo,
		branch,
	});
	const { sha: commitSha } = branchResponse.data.commit;

	// TODO: Make the tree parsing generic. This function can accept a path and iterate over it,
	// calling getTree recursivey or in a loop.
	const versionbotTreeResponse = await octokit.git.getTree({
		owner,
		repo,
		tree_sha: commitSha,
	});
	const versionbotSha = versionbotTreeResponse.data.tree.find(
		(item) => item.path === '.versionbot',
	)?.sha as string;

	const changelogTreeResponse = await octokit.git.getTree({
		owner,
		repo,
		tree_sha: versionbotSha,
	});
	const changelogSha = changelogTreeResponse.data.tree.find(
		(item) => item.path === 'CHANGELOG.yml',
	)?.sha as string;

	const blobResponse = await octokit.git.getBlob({
		owner,
		repo,
		file_sha: changelogSha,
	});

	return blobResponse.data.content;
};
