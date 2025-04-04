import { makeCurrentsRequest } from "./lib/request.js";

export interface RunResponse {
  status: string;
  data: {
    runId: string;
    projectId: string;
    createdAt: string;
    tags: string[];
    timeout: {
      isTimeout: boolean;
    };
    groups: Array<{
      instances: {
        overall: number;
        claimed: number;
        complete: number;
        passes: number;
        failures: number;
      };
      tests: {
        overall: number;
        tests: number;
        passes: number;
        failures: number;
        pending: number;
        skipped: number;
        flaky: number;
        retries: number;
      };
      groupId: string;
      platform: {
        osName: string;
        osVersion: string;
        browserName: string;
        browserVersion: string;
      };
      tags: string[];
    }>;
    meta: {
      ciBuildId: string;
      commit: {
        sha: string;
        branch: string;
        authorName: string;
        authorEmail: string;
        message: string;
        remoteOrigin: string;
        defaultBranch: string | null;
      };
      platform: {
        browserName: string;
        browserVersion: string;
        osName: string;
        osVersion: string;
      };
    };
    specs: Array<{
      spec: string;
      groupId: string;
      instanceId: string;
      claimedAt: string;
      completedAt: string;
      tags: string[];
      results: {
        flaky: number;
        stats: {
          overall: number;
          tests: number;
          passes: number;
          failures: number;
          pending: number;
          skipped: number;
          flaky: number;
          retries: number;
          wallClockStartedAt: string;
          wallClockEndedAt: string;
          wallClockDuration: number;
        };
        videoUrl: string | null;
        screenshots: any[]; // You might want to define a more specific type for screenshots
      };
      machineId: string;
      worker: {
        workerIndex: number;
        parallelIndex: number;
      };
    }>;
    completionState: "CANCELED" | "COMPLETE" | "IN_PROGRESS" | "TIMEOUT";
    status: "FAILED" | "FAILING" | "PASSED" | "RUNNING";
  };
}

export type ApiResponse = {
  status: "OK";
  data: InstanceData;
};

export type InstanceData = {
  projectId: string;
  runId: string;
  groupId: string;
  instanceId: string;
  machineId: string;
  spec: string;
  createdAt: string;
  worker: {
    workerIndex: number;
    parallelIndex: number;
  };
  framework: {
    clientVersion: string;
    type: string;
    version: string;
  };
  platform: {
    osName: string;
    osVersion: string;
    browserName: string;
    browserVersion: string;
  };
  tags: string[];
  commit: {
    remoteOrigin: string;
    branch: string;
    authorName: string;
    authorEmail: string;
    message: string;
    sha: string;
  };
  claimList: {
    machineId: string;
    t: number;
  }[];
  signature: string;
  results: TestResults;
  _t: string;
};

export type TestResults = {
  stats: {
    overall: number;
    tests: number;
    passes: number;
    failures: number;
    pending: number;
    skipped: number;
    flaky: number;
    retries: number;
    wallClockStartedAt: string;
    wallClockEndedAt: string;
    wallClockDuration: number;
  };
  tests: Test[];
  playwrightTraces: PlaywrightTrace[];
  screenshots: Screenshot[];
  videos: Video[];
};

export type Test = {
  _d: boolean;
  state: "failed" | "passed" | "skipped" | "pending";
  testId: string;
  originalTitle: string[];
  title: string[];
  attempts: Attempt[];
  displayError: string | null;
  isFlaky: boolean;
  tags: string[];
};

export type Attempt = {
  _d: boolean;
  attemptId: string;
  state: "failed" | "passed" | "skipped" | "pending";
  rawStatus: string;
  workerIndex: number;
  parallelIndex: number;
  error: TestError;
  wallClockStartedAt: string;
  wallClockDuration: number;
  videoTimestamp: number | null;
};

export type TestError = {
  name: string;
  message: string;
  stack: string;
  codeFrame: {
    frame: string;
    line: number;
    column: number;
    file: string;
  };
};

export type PlaywrightTrace = {
  testId: string;
  traceId: string;
  testAttemptIndex: number;
  name: string;
  traceURL: string;
};

export type Screenshot = {
  name: string;
  testId: string;
  screenshotId: string;
  testAttemptIndex: number;
  screenshotURL: string;
  takenAt: string;
};

export type Video = {
  testId: string;
  videoUrl: string;
  testAttemptIndex: number;
};
