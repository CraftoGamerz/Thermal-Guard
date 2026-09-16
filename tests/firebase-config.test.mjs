import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Firebase collaboration keeps supplied project config out of source and rules require auth", async () => {
  const [client, rules, template] = await Promise.all([
    readFile("src/workspace/firebaseCollaboration.js", "utf8"),
    readFile("firestore.rules", "utf8"),
    readFile(".env.example", "utf8"),
  ]);
  assert.match(client, /import\.meta\.env\.VITE_FIREBASE_API_KEY/);
  assert.doesNotMatch(client, /AIzaSyCkh/);
  assert.match(rules, /request\.auth != null/);
  assert.match(template, /VITE_FIREBASE_PROJECT_ID/);
});
