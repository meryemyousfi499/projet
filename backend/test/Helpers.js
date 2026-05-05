/**
 * Simulates a Mongoose chainable query.
 * Supports: .populate() .sort() .limit() .skip() .select() .exec()
 */
const chain = (resolvedValue) => {
  const obj = {
    exec: jest.fn().mockResolvedValue(resolvedValue),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
  };
  return obj;
};

/**
 * Creates a mock Express response object.
 */
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

module.exports = { chain, mockRes };