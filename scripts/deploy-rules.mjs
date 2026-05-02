// One-off rules deploy via firebase-admin SDK (bypasses firebase CLI auth).
// Run: node scripts/deploy-rules.mjs
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';

const sa = JSON.parse(
  readFileSync(
    new URL(
      '../adtestlab-daf5a-firebase-adminsdk-fbsvc-0911a76ce0.json',
      import.meta.url
    ),
    'utf8'
  )
);

initializeApp({ credential: cert(sa), projectId: sa.project_id });

const rulesSource = readFileSync(
  new URL('../firestore.rules', import.meta.url),
  'utf8'
);

const sr = getSecurityRules();
const ruleset = await sr.releaseFirestoreRulesetFromSource(rulesSource);
console.log(`Released ruleset: ${ruleset.name}`);
console.log(`Project: ${sa.project_id}`);
