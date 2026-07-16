import { pbkdf2Sync, randomBytes } from 'node:crypto'

const password = process.argv[2]
if (!password || password.length < 12) {
  console.error('Usage: npm run password:hash -- "a-password-with-at-least-12-characters"')
  process.exit(1)
}

const iterations = 210_000
const salt = randomBytes(16).toString('hex')
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex')
console.log(`${iterations}:${salt}:${hash}`)
