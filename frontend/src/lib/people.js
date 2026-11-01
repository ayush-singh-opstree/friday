/**
 * Reduce a thread's commitments into `{ [personId]: { role, lastInteractionAt } }`
 * so the People tab can show a role and last-contact without an extra request.
 *
 * @param {Array<{ ownerPersonId?: string, ownerPerson?: {id: string, fullName: string} }>} commitments
 */
export function makePersonDetails(commitments = []) {
  const details = {}
  for (const commitment of commitments) {
    if (!commitment.ownerPersonId) continue
    details[commitment.ownerPersonId] = {
      role: commitment.ownerPerson?.fullName ? 'Commitment owner' : undefined,
      lastInteractionAt: commitment.updatedAt ?? commitment.createdAt,
    }
  }
  return details
}