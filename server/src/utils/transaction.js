import sequelize from '../config/database.js';

/**
 * Executes a callback within a managed Sequelize database transaction.
 * Automatically commits if the callback resolves successfully,
 * and automatically rolls back if the callback throws an error.
 *
 * If an existing transaction is passed in, the callback is executed within that transaction
 * without creating a nested commit/rollback.
 *
 * @param {Function} callback - Async function receiving the transaction object: (t) => Promise<any>
 * @param {object} [existingTransaction] - Optional existing transaction to reuse
 * @returns {Promise<any>} - Returns the result of the callback
 *
 * @example
 * const result = await withTransaction(async (t) => {
 *   const hospital = await Hospital.create({ name: 'Central' }, { transaction: t });
 *   await HospitalSetting.create({ hospitalId: hospital.id, key: 'tz', value: 'UTC' }, { transaction: t });
 *   return hospital;
 * });
 */
export const withTransaction = async (callback, existingTransaction = null) => {
  if (existingTransaction) {
    return callback(existingTransaction);
  }

  const transaction = await sequelize.transaction();
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export default withTransaction;
