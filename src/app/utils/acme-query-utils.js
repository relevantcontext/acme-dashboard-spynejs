export const buildAcmeSearch = (search = '', params = {}) => {
  const next = new URLSearchParams(search);

  Object.entries(params).forEach(([key, value]) => {
    const str = value === null || value === undefined ? '' : String(value);

    if (str === '') {
      next.delete(key);
      return;
    }

    next.set(key, str);
  });

  return next.toString();
};
