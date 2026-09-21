/**
 * Standardized API response helper functions
 */

export const successResponse = (res, message = 'Success', data = null, statusCode = 200) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

export const errorResponse = (
  res,
  message = 'Something went wrong',
  statusCode = 500,
  errors = null
) => {
  const response = {
    success: false,
    message,
  };

  if (errors !== null && errors !== undefined) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};
