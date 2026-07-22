import assert from "node:assert/strict";
import test from "node:test";

import { scanText } from "../scripts/check-secrets.mjs";

test("secret scanner rejects literal deploy tokens", () => {
  const input = "DEPLOY_" + "TOKEN='live-secret-value'";
  assert.deepEqual(scanText(input), [{ line: 1, rule: "deploy-token" }]);
});

test("secret scanner permits environment references and placeholders", () => {
  const name = "DEPLOY_" + "TOKEN";
  const input = [
    `${name}=process.env.${name}`,
    `export ${name}='<token>'`,
    `headers = { "X-Deploy-Token": ${name} }`,
  ].join("\n");
  assert.deepEqual(scanText(input), []);
});

test("secret scanner rejects private key markers", () => {
  const input = "-----BEGIN " + "PRIVATE KEY-----";
  assert.deepEqual(scanText(input), [{ line: 1, rule: "private-key" }]);
});
