

import CryptoJS from "crypto-js";

// 🔒 Encrypt just the value
export const encryption = async ({ value, secret_key } = {}) => {
  return CryptoJS.AES.encrypt(value, secret_key).toString();
};

// 🔓 Decrypt and return plain value
export const decryption = async ({ cipher, secret_key } = {}) => {
  return CryptoJS.AES.decrypt(cipher, secret_key).toString(CryptoJS.enc.Utf8);
};

