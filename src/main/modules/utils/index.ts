export const replaceAllObjKeys = (obj: unknown, getNewKey: (arg0: string) => string): unknown => {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      replaceAllObjKeys(obj[i], getNewKey);
    }
  } else if (obj && typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    // eslint-disable-next-line guard-for-in
    for (const key in record) {
      const newKey = getNewKey(key);

      record[newKey] = record[key];
      if (key !== newKey) {
        delete record[key];
      }
      replaceAllObjKeys(record[newKey], getNewKey);
    }
  }

  return obj;
};