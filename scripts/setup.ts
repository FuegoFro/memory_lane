import * as OTPAuth from 'otpauth';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n=== Memory Lane Setup ===\n');

  // Password
  const password = await question('Enter password for editor access: ');
  const passwordHash = bcrypt.hashSync(password, 10);

  // TOTP
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'MemoryLane',
    label: 'Admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  // Session secret
  const sessionSecret = Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join('');

  console.log('\n=== Add these to your .env.local ===\n');
  console.log(`AUTH_PASSWORD_HASH=${passwordHash}`);
  console.log(`TOTP_SECRET=${secret.base32}`);
  console.log(`SESSION_SECRET=${sessionSecret}`);

  console.log('\n=== TOTP Setup ===\n');
  console.log('Scan this URI with your authenticator app:');
  console.log(totp.toString());
  console.log('\nOr manually enter this secret:', secret.base32);

  rl.close();
}

main();
