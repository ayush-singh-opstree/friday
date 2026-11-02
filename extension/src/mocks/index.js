/** Public surface of the bundled demo backend. */
export { handleMockRequest } from './handlers'
export {
  activate,
  endSession,
  getDb,
  getUser,
  loadDb,
  persistDb,
  registerSession,
  registerUser,
  resetDb,
  resolveSession,
} from './db'
export {
  createSeedData,
  DEMO_CREDENTIALS,
  DEMO_USER_ID,
  profileForEmail,
  userIdForEmail,
} from './seed'