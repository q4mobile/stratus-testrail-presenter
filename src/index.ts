import {
  getInput,
  setOutput,
  error as logError,
  setFailed,
} from "@actions/core";
import TestRailApiClient, { ITest, ITestRun } from "testrail-api";

type TestRun = {
  projectId: number;
  suiteId: number;
  runId: number;
};

export type TestRailOptions = {
  host: string;
  user: string;
  password: string;
};

interface ActionInputs {
  testRailOptions: TestRailOptions;
  testRuns: TestRun[];
  branchName: string;
}

function getActionInputs(): ActionInputs {
  return {
    testRailOptions: {
      host: getInput("network_url"),
      user: getInput("username"),
      password: getInput("api_key"),
    },
    testRuns: JSON.parse(getInput("test_runs")),
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
  const totalTests =
    data.passed_count +
    data.blocked_count +
    data.untested_count +
    data.retest_count +
    data.failed_count;
  const percentage =
    totalTests > 0
      ? `${Math.round((data.passed_count / totalTests) * 100)}%`
      : "N/A";
  return `TestRail Run Summary:
          ${percentage} of All Tests Passed | ${data.passed_count} passed ✅ - ${data.failed_count} failed ❌
          🔗 -> ${data.url}`;
}

function buildRelatedTestStats(data: ITest[], branch: string) {
  branch = branch.toLowerCase().split("/").splice(-1)[0];

  const summary = data.reduce(
    (acc, datum) => {
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
    },
    {
      total: 0,
      passed: 0,
      failed: 0,
    }
  );

  return `Related Tests for [${branch}]:
          ${summary.total} tests in total | ${summary.passed} passed ✅ - ${summary.failed} failed ❌`;
}

async function reportTestRun(
  client: TestRailApiClient,
  testRun: TestRun,
  branchName: string
): Promise<string> {
  const runResult = await getRun(client, testRun.runId);
  const testResult = await getRunTests(client, testRun.runId);

  const runStats = buildRunStats(runResult);
  const testStats = buildRelatedTestStats(testResult, branchName);
  return `
  ${runStats}
  ${testStats}
  =================================================================
  
  `;
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

    const client = createClient(
      inputs.testRailOptions.host,
      inputs.testRailOptions.user,
      inputs.testRailOptions.password
    );

    for (const testRun of inputs.testRuns) {
      result += await reportTestRun(client, testRun, inputs.branchName);
    }
  } catch (err) {
    const errMsg: string = err instanceof Error ? err.message : (err as string);

    logError(errMsg);
    result = "N/A";
  } finally {
    setActionOutput("run_result", result);
  }
}

main();
