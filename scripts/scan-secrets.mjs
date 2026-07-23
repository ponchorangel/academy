import { spawnSync } from 'node:child_process';

// TODO al copiar esta plantilla: agrega aquí los nombres de variables/secretos
// específicos de esta app (ej. STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY).
const patterns = [
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----',
  '(sk_live_|sk_test_|rk_live_|AKIA|ASIA|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_\\-]{12,}',
  '(CRON_SECRET|MERCADOPAGO_ACCESS_TOKEN|MERCADOPAGO_WEBHOOK_SECRET|RESEND_API_KEY)[[:space:]]*[:=][[:space:]]*["' + "'" + '][^"' + "'" + ']{12,}',
];
const expression = patterns.join('|');
const checks = [
  ['grep', '--untracked', '--exclude-standard', '-I', '-n', '-E', '-e', expression, '--', '.', ':(exclude)scripts/scan-secrets.mjs', ':(exclude)tests/**'],
  ['log', '--all', '-p', '--no-ext-diff', '--format=', '--', '.', ':(exclude)scripts/scan-secrets.mjs', ':(exclude)tests/**'],
];
let findings = 0;
for (const args of checks) {
  const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (args[0] === 'log') {
    const regex = new RegExp(expression.replaceAll('[[:space:]]', '\\s'), 'g');
    findings += (result.stdout.match(regex) || []).length;
  } else if (result.status === 0) {
    findings += result.stdout.split(/\r?\n/).filter(Boolean).length;
  } else if (result.status !== 1) {
    console.error('Secret scan could not inspect the repository.');
    process.exit(2);
  }
}
if (findings) {
  console.error(`Potential secret material detected (${findings} match(es)); values intentionally suppressed.`);
  process.exit(1);
}
console.log('Secret scan passed for tracked content and accessible Git history.');
