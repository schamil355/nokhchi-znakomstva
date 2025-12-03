const cache = new Map<string, string>();

export const getCachedPhotoUri = (key?: string | null) => {
  if (!key) {
    return null;
  }
  return cache.get(key) ?? null;
};

export const setCachedPhotoUri = (key?: string | null, uri?: string | null) => {
  if (!key || !uri) {
    return;
  }
  cache.set(key, uri);
};

export const clearPhotoCache = () => {
  cache.clear();
};
