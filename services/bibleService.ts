
import { fetchBibleTextFromAI } from './geminiService';

export const fetchBibleText = async (reference: string, version: string): Promise<string> => {
  // Check local storage first (Offline Mode)
  const cacheKey = `offline_bible_${version}_${reference.replace(/\s/g, '_')}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    console.log("Loading from offline cache:", reference);
    return cached;
  }

  try {
    // Using Gemini AI to fetch specific Bible versions (ARC, KJV, Scofield) 
    // This is more reliable than free public APIs for these specific theological versions.
    const text = await fetchBibleTextFromAI(reference, version);
    return text;
  } catch (error) {
    console.error("Fetch error:", error);
    return `[Erro de Conexão] Não foi possível carregar o texto bíblico online.\n\nVerifique sua conexão ou tente novamente mais tarde.\n\nReferência: ${reference} (${version})`;
  }
};

export const saveTextOffline = (reference: string, version: string, text: string): void => {
  const cacheKey = `offline_bible_${version}_${reference.replace(/\s/g, '_')}`;
  try {
    localStorage.setItem(cacheKey, text);
    
    // Maintain a registry of downloaded readings
    const registryKey = 'jornada_biblica_downloads';
    const registry = JSON.parse(localStorage.getItem(registryKey) || '[]');
    if (!registry.includes(cacheKey)) {
      registry.push(cacheKey);
      localStorage.setItem(registryKey, JSON.stringify(registry));
    }
  } catch (e) {
    console.error("Storage error:", e);
    alert("Erro ao salvar offline. Verifique o espaço do seu navegador.");
  }
};

export const isDownloaded = (reference: string, version: string): boolean => {
  const cacheKey = `offline_bible_${version}_${reference.replace(/\s/g, '_')}`;
  return !!localStorage.getItem(cacheKey);
};

export const removeDownloaded = (reference: string, version: string): void => {
  const cacheKey = `offline_bible_${version}_${reference.replace(/\s/g, '_')}`;
  localStorage.removeItem(cacheKey);
  const registryKey = 'jornada_biblica_downloads';
  let registry = JSON.parse(localStorage.getItem(registryKey) || '[]');
  registry = registry.filter((item: string) => item !== cacheKey);
  localStorage.setItem(registryKey, JSON.stringify(registry));
};
