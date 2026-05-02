/**
 * One-shot Firestore wipe for a single test account.
 *
 * Deletes EVERYTHING under users/{uid}/products (products, campaigns,
 * adsets, all entries, diagnoses) using Firestore Admin recursiveDelete.
 * The user document itself (timezone, plan, etc.) is preserved.
 *
 * Safety:
 *   1. Defaults to dry-run. Pass --execute to actually delete.
 *   2. Requires --uid <uid> OR --email <email>. No "wipe all users" mode.
 *   3. Prints the resolved UID and a count before deleting.
 *
 * Run:
 *   npx tsx scripts/wipe-test-data.ts --email you@example.com
 *   npx tsx scripts/wipe-test-data.ts --email you@example.com --execute
 */

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

interface Args {
  uid?: string;
  email?: string;
  execute: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { execute: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--uid') args.uid = argv[++i];
    else if (a === '--email') args.email = argv[++i];
    else if (a === '--execute') args.execute = true;
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: npx tsx scripts/wipe-test-data.ts (--uid <uid> | --email <email>) [--execute]',
      );
      process.exit(0);
    }
  }
  if (!args.uid && !args.email) {
    console.error('ERROR: must pass --uid <uid> or --email <email>');
    process.exit(1);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const sa = JSON.parse(
  readFileSync(
    new URL(
      '../adtestlab-daf5a-firebase-adminsdk-fbsvc-0911a76ce0.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

initializeApp({ credential: cert(sa), projectId: sa.project_id });

const auth = getAuth();
const db = getFirestore();

const uid = args.uid ?? (await auth.getUserByEmail(args.email!)).uid;
const productsPath = `users/${uid}/products`;
const productsRef = db.collection(productsPath);

const snap = await productsRef.get();
console.log(`Project:    ${sa.project_id}`);
console.log(`UID:        ${uid}`);
console.log(`Path:       ${productsPath}`);
console.log(`Top-level products to delete: ${snap.size}`);

if (snap.empty) {
  console.log('Nothing to wipe. Done.');
  process.exit(0);
}

if (!args.execute) {
  console.log('\nDry run. Re-run with --execute to actually delete.');
  process.exit(0);
}

console.log('\nExecuting recursiveDelete on the products collection...');
await db.recursiveDelete(productsRef);
console.log('Wipe complete.');
