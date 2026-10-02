import { cpSync, mkdirSync } from 'node:fs'

mkdirSync('server/dist/db/migrations', { recursive: true })
cpSync('server/src/db/migrations', 'server/dist/db/migrations', { recursive: true })
console.log('[build] SQL migrations copied to server/dist')
