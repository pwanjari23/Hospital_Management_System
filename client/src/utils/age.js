/**
 * Healthcare Age Calculation Utilities (Client-Side)
 * Accurately calculates chronological age from Date of Birth.
 */

/**
 * Calculates human-readable age string (e.g. "25 yrs", "8 months", "14 days")
 * @param {string|Date} dateOfBirth
 * @returns {string|null}
 */
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  if (dob > today) return null;

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  let days = today.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0) {
    return `${years} ${years === 1 ? 'yr' : 'yrs'}`;
  }

  if (months > 0) {
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  }

  return `${days} ${days === 1 ? 'day' : 'days'}`;
};

/**
 * Calculates raw integer years (e.g. 25)
 * @param {string|Date} dateOfBirth
 * @returns {number|null}
 */
export const getNumericAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  if (dob > today) return null;

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return Math.max(0, age);
};

export default {
  calculateAge,
  getNumericAge,
};
