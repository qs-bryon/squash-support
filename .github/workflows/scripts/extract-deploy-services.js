/**
 * @param {string} commitMessage
 * @param {Object} params
 * @param {import('octokit').Octokit} params.github
 * @param {import('@actions/core')} params.core
 * @param {import('@actions/github').context} params.context
 */
module.exports = async function (commitMessage, { github, core, context }) {
  const pullRequestNumber = extractPrNumberMessage(commitMessage);

  if (!pullRequestNumber) {
    core.error("message does not contain a pull request.");
    return;
  }

  core.info("Attempting to query pull request #" + pullRequestNumber);

  const pullRequest = await github.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pullRequestNumber,
  });

  if (pullRequest.status !== 200) {
    core.error("No pull request found for #" + pullRequestNumber);
    return;
  }

  const functionServices = extractServicesList(
    pullRequest.data.body,
    { title: "Cloud Function to deploy" },
    { core },
  );

  const runServices = extractServicesList(
    pullRequest.data.body,
    { title: "Cloud Run to deploy" },
    { core },
  );

  // NOTE: ideally this shouldn't be a responsibility of this script
  const formattedFunctionsServices = functionServices
    .map((service) => `function:${service}`)
    .join(",");

  // NOTE: ideally this shouldn't be a responsibility of this script
  const formattedRunServices = runServices
    .map((service) => `${service}-cr`)
    .join(",");

  core.notice("Cloud Functions: " + formattedFunctionsServices);
  core.notice("Cloud Runs: " + formattedRunServices);

  core.setOutput("function_services", formattedFunctionsServices);
  core.setOutput("run_services", formattedRunServices);
};

/**
 * @param {string} message
 */
function extractPrNumberMessage(message) {
  const MERGE_COMMIT_PATTERN = /^Merge pull request #\d+/;
  const SQUASH_COMMIT_PATTERN = /^.+\(#\d+\)$/;

  if (message.match(MERGE_COMMIT_PATTERN)) {
    return /\(#(\d+)\)/.exec(message)?.[1];
  } else if (message.match(SQUASH_COMMIT_PATTERN)) {
    return /#(\d+)/.exec(message)?.[1];
  }

  return undefined;
}

/**
 * @param {string} message
 *
 * @param {Object} options
 * @param {string | null} options.title
 * @param {string} options.end
 *
 * @param {Object} runContext
 * @param {import('@actions/core')} runContext.core -
 */
function extractServicesList(message, { title = null, end = "" }, { core }) {
  if (!title) {
    core.error("Please provide a title");
    return;
  }

  const splitMessage = message.split("\r\n");

  const servicesList = [];
  const serviceNameFormat = /^([a-zA-Z]+[_-]){1,}([a-zA-Z]+)$/;

  for (
    let i = 0, passedHead = false, passedTail = false;
    i < splitMessage.length;
    i++
  ) {
    const line = splitMessage[i];

    if (passedHead && passedTail) continue;

    if (line.trim() === title.trim()) {
      passedHead = true;
      continue;
    }

    if (line.trim() === end.trim()) {
      passedTail = true;
      continue;
    }

    if (passedHead) {
      if (!line.startsWith(">")) {
        continue;
      }

      const sanitizedLine = line.replace(">", "").trim();

      if (serviceNameFormat.test(sanitizedLine)) {
        servicesList.push(sanitizedLine);
      } else {
        core.warning(`Invalid service name: ${sanitizedLine}. Excluding...`);
      }
    }
  }

  return servicesList;
}
