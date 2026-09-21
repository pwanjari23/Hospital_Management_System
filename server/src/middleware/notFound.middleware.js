import { errorResponse } from '../utils/apiResponse.js';

export const notFoundHandler = (req, res) => {
  return errorResponse(res, 'Resource not found', 404);
};

export default notFoundHandler;
