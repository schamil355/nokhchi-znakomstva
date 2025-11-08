export default {
  setItem: jest.fn(async () => undefined),
  getItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => undefined),
  clear: jest.fn(async () => undefined),
  getAllKeys: jest.fn(async () => []),
  multiGet: jest.fn(async () => []),
  multiSet: jest.fn(async () => undefined),
  multiRemove: jest.fn(async () => undefined),
};
