import {
  getInput,
  setOutput,
  error as logError,
  setFailed
} from "@actions/core";
import TestRailApiClient, { ITest, ITestRun } from "testrail-api";

interface ActionInputs {
  host: string;
  user: string;
  password: string;
  projectId: number;
  runId: number;
  branchName: string;
}

function getActionInputs(): ActionInputs {
  return {
    host: getInput("network_url"),
    user: getInput("username"),
    password: getInput("api_key"),
    projectId: getInput("project_id") ? parseInt(getInput("project_id"), 10) : 0,
    runId: parseInt(getInput("run_id"), 10),
    branchName: getInput("current_branch"),
  };
}

function setActionOutput(name: string, value: string | number) {
  setOutput(name, value);
}

function createClient(host: string, user: string, password: string) {
  return new TestRailApiClient({
    host,
    password,
    user,
  });
}

async function getRun(client: TestRailApiClient, runId: number) {
  const result = await client.getRun(runId);
  return result.body;
}

async function getRunTests(client: TestRailApiClient, runId: number) {
  const result = await client.getTests(runId, {});
  return (result.body as any).tests as ITest[];
}

function buildRunStats(data: ITestRun) {
  const totalTests = data.passed_count + data.blocked_count + data.untested_count + data.retest_count + data.failed_count;
  const percentage = totalTests > 0 ? `${Math.round(data.passed_count / totalTests * 100)}%` : "N/A";
  return `TestRail Run Summary:
          ${percentage} of All Tests Passed | ${data.passed_count} passed ✅ - ${data.failed_count} failed ❌
          🔗 -> ${data.url}`;
}

function buildRelatedTestStats(data: ITest[], branch: string) {
  branch = branch.toLowerCase();
  const summary = data.reduce((acc, datum) => {
    if (datum.refs && datum.refs.toLowerCase().includes(branch)) {
      acc.total++;
      // 1 for passed
      if (datum.status_id === 1) {
        acc.passed++;
      }
      // 5 for failed
      else if (datum.status_id === 5) {
        acc.failed++;
      }
    }
    return acc;
  }, {
    total: 0,
    passed: 0,
    failed: 0,
  });
  return `Related Tests for [${branch}]:
          ${summary.total} tests in total | ${summary.passed} passed ✅ - ${summary.failed} failed ❌`;
}

async function main(): Promise<void> {
  let result = "";
  try {
    const inputs = getActionInputs();

    // stop if no branch is provided
    // probably due to use in a non-pr workflow
    if (!inputs.branchName) {
      setFailed("Target branch name not found");
      return;
    }

    const client = createClient(inputs.host, inputs.user, inputs.password);

    const runResult = await getRun(client, inputs.runId);
    const testResult = await getRunTests(client, inputs.runId);

    const runStats = buildRunStats(runResult);
    const testStats = buildRelatedTestStats(testResult, inputs.branchName);
    result = 
    `
    ${runStats}
    ${testStats}
    `;
  } catch (err) {
    const errMsg: string = err instanceof Error ? err.message : err as string;
    logError(errMsg);
    result = "N/A";
  } finally {
    setActionOutput("run_result", result);
  }
}

main();
