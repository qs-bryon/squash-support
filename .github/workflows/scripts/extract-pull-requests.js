const MERGE_COMMIT_PATTERN = /^Merge pull request #\d+/;
const SQUASH_COMMIT_PATTERN = /^.+\(#\d+\)$/;

/**
 * @param {Object} params
 * @param {import('octokit').Octokit} params.github
 * @param {import('@actions/core')} params.core
 * @param {import('@actions/github').context} params.context
 */

module.exports = async function ({ github, core, context }) {
  console.log(context);
};
