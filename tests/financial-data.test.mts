import assert from "node:assert/strict";
import test from "node:test";
import { shouldUseSampleFinancialData } from "../lib/sample-data-policy.ts";

test("dados de amostra exigem opt-in explicito fora de producao", () => {
  const originalAllowSample = process.env.DENIAROS_ALLOW_SAMPLE_DATA;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    delete process.env.DENIAROS_ALLOW_SAMPLE_DATA;
    process.env.NODE_ENV = "development";
    assert.equal(shouldUseSampleFinancialData(), false);

    process.env.DENIAROS_ALLOW_SAMPLE_DATA = "1";
    assert.equal(shouldUseSampleFinancialData(), true);

    process.env.NODE_ENV = "production";
    assert.equal(shouldUseSampleFinancialData(), false);
  } finally {
    restoreEnv("DENIAROS_ALLOW_SAMPLE_DATA", originalAllowSample);
    restoreEnv("NODE_ENV", originalNodeEnv);
  }
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
