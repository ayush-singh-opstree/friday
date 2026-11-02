/** Public surface of the bundled demo backend. */
export { handleMockRequest } from './handlers'
export {
  activate,
  deleteWorkspace,
  endSession,
  getDb,
  getUser,
  loadDb,
  registerSession,
  registerUser,
  resetDb,
  resolveSession,
  saveDb,
} from './db'
export {
  createSeedData,
  DEFAULT_PROFILE,
  DEMO_CREDENTIALS,
  DEMO_USER_ID,
  SECONDARY_CREDENTIALS,
  profileForEmail,
  userIdForEmail,
} from './seed'