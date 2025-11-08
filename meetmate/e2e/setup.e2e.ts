import detox, { device } from "detox";
import adapter from "detox/runners/jest/adapter";
import specReporter from "detox/runners/jest/specReporter";
import assignReporter from "detox/runners/jest/assignReporter";
import { detoxCircus } from "detox/runners/jest/globals";
import config from "../detox.config";

jest.setTimeout(180000);

detoxCircus.getEnv().addEventsListener(adapter);
detoxCircus.getEnv().addEventsListener(specReporter);
detoxCircus.getEnv().addEventsListener(assignReporter);

beforeAll(async () => {
  await detox.init(config, { initGlobals: false });
  await device.launchApp({ delete: true });
});

beforeEach(async () => {
  await adapter.beforeEach();
});

afterEach(async () => {
  await adapter.afterEach();
});

afterAll(async () => {
  await detox.cleanup();
});
