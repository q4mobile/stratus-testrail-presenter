"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const testrail_api_1 = __importDefault(require("testrail-api"));
function getActionInputs() {
    return {
        testRailOptions: {
            host: (0, core_1.getInput)("network_url"),
            user: (0, core_1.getInput)("username"),
            password: (0, core_1.getInput)("api_key"),
        },
        testRuns: JSON.parse((0, core_1.getInput)("test_runs")),
        branchName: (0, core_1.getInput)("current_branch"),
    };
}
function setActionOutput(name, value) {
    (0, core_1.setOutput)(name, value);
}
function createClient(host, user, password) {
    return new testrail_api_1.default({
        host,
        password,
        user,
    });
}
function getRun(client, runId) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield client.getRun(runId);
        return result.body;
    });
}
function getRunTests(client, runId) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield client.getTests(runId, {});
        return result.body.tests;
    });
}
function buildRunStats(data) {
    const totalTests = data.passed_count + data.blocked_count + data.untested_count + data.retest_count + data.failed_count;
    const percentage = totalTests > 0 ? `${Math.round(data.passed_count / totalTests * 100)}%` : "N/A";
    return `TestRail Run Summary:
          ${percentage} of All Tests Passed | ${data.passed_count} passed ✅ - ${data.failed_count} failed ❌
          🔗 -> ${data.url}`;
}
function buildRelatedTestStats(data, branch) {
    branch = branch.toLowerCase().split("/").splice(-1)[0];
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
function reportTestRun(client, testRun, branchName) {
    return __awaiter(this, void 0, void 0, function* () {
        const runResult = yield getRun(client, testRun.runId);
        const testResult = yield getRunTests(client, testRun.runId);
        const runStats = buildRunStats(runResult);
        const testStats = buildRelatedTestStats(testResult, branchName);
        return `
  ${runStats}
  ${testStats}
  =================================================================
  
  `;
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let result = "";
        try {
            const inputs = getActionInputs();
            // stop if no branch is provided
            // probably due to use in a non-pr workflow
            if (!inputs.branchName) {
                (0, core_1.setFailed)("Target branch name not found");
                return;
            }
            const client = createClient(inputs.testRailOptions.host, inputs.testRailOptions.user, inputs.testRailOptions.password);
            for (const testRun of inputs.testRuns) {
                result += yield reportTestRun(client, testRun, inputs.branchName);
            }
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : err;
            (0, core_1.error)(errMsg);
            result = "N/A";
        }
        finally {
            setActionOutput("run_result", result);
        }
    });
}
main();
