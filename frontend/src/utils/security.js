import CryptoJS from 'crypto-js';

// EM PRODUÇÃO: Mova esta chave para uma variável de ambiente (VITE_ENCRYPTION_KEY)
// e garanta que ela seja longa e aleatória.
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'beatwap-secure-key-2024-change-me';
const PREFIX = 'ENC::';

/**
 * Criptografa uma string sensível antes de enviar ao banco.
 * @param {string} text - Texto para criptografar
 * @returns {string} Texto criptografado com prefixo
 */
export const encryptData = (text) => {
  if (!text) return text;
  if (typeof text !== 'string') text = String(text);
  
  // Evitar criptografar duas vezes
  if (text.startsWith(PREFIX)) return text;

  try {
    const encrypted = CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
    return `${PREFIX}${encrypted}`;
  } catch (error) {
    console.error('Erro na criptografia:', error);
    return text;
  }
};

/**
 * Descriptografa dados vindos do banco para exibição.
 * @param {string} ciphertext - Texto cifrado
 * @returns {string} Texto original
 */
export const decryptData = (ciphertext) => {
  if (!ciphertext) return ciphertext;
  
  // Se não tiver o prefixo, assume que é dado legado (não criptografado)
  if (!ciphertext.startsWith(PREFIX)) return ciphertext;

  try {
    const actualCiphertext = ciphertext.slice(PREFIX.length);
    const bytes = CryptoJS.AES.decrypt(actualCiphertext, SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    
    // Se a descriptografia falhar (retornar vazio), devolve o original por segurança
    if (!originalText) return ciphertext;
    
    return originalText;
  } catch (error) {
    console.error('Erro na descriptografia:', error);
    return ciphertext;
  }
};

/**
 * Criptografa um arquivo para upload seguro.
 * @param {File} file - Arquivo original
 * @returns {Promise<Blob>} Blob do arquivo criptografado (texto)
 */
export const encryptFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const fullDataUrl = reader.result;
        const encrypted = encryptData(fullDataUrl);
        const blob = new Blob([encrypted], { type: 'text/plain' });
        resolve(blob);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Baixa e descriptografa um arquivo se necessário.
 * @param {string} url - URL do arquivo
 * @returns {Promise<Blob>} Blob do arquivo original
 */
export const downloadDecryptedFile = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    // Tenta ler como texto para verificar criptografia
    // Arquivos binários grandes podem falhar ou ser lentos, mas documentos de autorização são pequenos
    const text = await blob.text();
    
    if (text.startsWith(PREFIX)) {
      const decryptedDataUrl = decryptData(text);
      const res = await fetch(decryptedDataUrl);
      return await res.blob();
    }
    
    return blob;
  } catch (error) {
    console.error('Erro ao baixar/descriptografar arquivo:', error);
    throw error;
  }
};

/**
 * Wrapper para criptografar objeto de formulário específico
 * @param {Object} formData 
 * @param {Array<string>} fieldsToEncrypt 
 */
export const encryptFormFields = (formData, fieldsToEncrypt) => {
  const encryptedData = { ...formData };
  fieldsToEncrypt.forEach(field => {
    if (encryptedData[field]) {
      encryptedData[field] = encryptData(encryptedData[field]);
    }
  });
  return encryptedData;
};
