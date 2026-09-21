/**
 * ============================================================================
 * HMS Multi-Tenancy Architecture & Tenant Context Foundation
 * ============================================================================
 *
 * ARCHITECTURAL RULE:
 * In a multi-tenant SaaS application, data isolation between hospitals is paramount.
 * Data belonging to Hospital A must NEVER be accessible under Hospital B's context.
 *
 * FUTURE AUTHENTICATION CONTRACT (Step 3 & 4):
 * 1. Upon authentication, the backend verifies the user's credentials and determines
 *    the trusted tenant boundary: `req.user.hospitalId`.
 * 2. The client is NEVER trusted to dictate tenant identity via request body or headers
 *    (e.g., `{ hospitalId: "..." }`).
 * 3. Any query against tenant-owned entities (User, HospitalSetting, future Patients,
 *    Appointments, etc.) MUST be tenant-scoped:
 *
 *    SELECT * FROM users WHERE id = :userId AND hospital_id = :trustedHospitalId;
 *
 * This utility provides helper functions to construct and validate tenant boundaries.
 */

/**
 * Augments a Sequelize `where` clause with the trusted tenant boundary.
 *
 * @param {object} whereClause - Existing where conditions
 * @param {string} hospitalId - Trusted tenant UUID
 * @returns {object} - Where clause guaranteed to contain hospitalId
 *
 * @example
 * const where = scopeToTenant({ id: userId }, req.user.hospitalId);
 * // returns: { id: userId, hospitalId: '...' }
 */
export const scopeToTenant = (whereClause = {}, hospitalId) => {
  if (!hospitalId) {
    throw new Error(
      'Tenant context violation: hospitalId is required for tenant-scoped operations.'
    );
  }

  return {
    ...whereClause,
    hospitalId,
  };
};

/**
 * Validates that an entity instance belongs to the expected tenant.
 *
 * @param {object} entity - Model instance with hospitalId attribute
 * @param {string} expectedHospitalId - Trusted tenant UUID
 * @returns {boolean}
 * @throws {Error} if entity belongs to a different tenant
 */
export const assertTenantOwnership = (entity, expectedHospitalId) => {
  if (!entity) return true;

  if (!expectedHospitalId) {
    throw new Error('Tenant context violation: expectedHospitalId is missing.');
  }

  if (entity.hospitalId !== expectedHospitalId) {
    const error = new Error('Cross-tenant access violation: entity belongs to another hospital.');
    error.statusCode = 403;
    throw error;
  }

  return true;
};

export default {
  scopeToTenant,
  assertTenantOwnership,
};
