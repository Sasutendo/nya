import { pbkdf2Sync, randomBytes } from 'node:crypto'

const password = process.argv[2]
if (!password || password.length < 12) {
  console.error('Usage: npm run password:hash -- "a-password-with-at-least-12-characters"')
  process.exit(1)
}

// Cloudflare Workers currently caps Web Crypto PBKDF2 at 100,000 rounds.
// Keep the generator and the runtime verifier on the same supported value.
const iterations = 100_000
const salt = randomBytes(16).toString('hex')
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex')
console.log(`${iterations}:${salt}:${hash}`)
