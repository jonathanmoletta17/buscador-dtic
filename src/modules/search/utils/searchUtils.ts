/**
 * Utilitários para busca e filtragem.
 */

/**
 * Normaliza o texto removendo acentos e convertendo para minúsculas.
 */
export const normalizeText = (text: string | null | undefined): string => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

/**
 * Verifica se uma query existe dentro de um texto de forma "fuzzy" (sequência de caracteres).
 */
export const fuzzyMatch = (text: string, query: string): boolean => {
  const nText = normalizeText(text);
  const nQuery = normalizeText(query);
  
  if (nText.includes(nQuery)) return true;

  let queryIdx = 0;
  for (let textIdx = 0; textIdx < nText.length && queryIdx < nQuery.length; textIdx++) {
    if (nText[textIdx] === nQuery[queryIdx]) {
      queryIdx++;
    }
  }
  return queryIdx === nQuery.length;
};

/**
 * Calcula o score de relevância de um item baseado em múltiplos campos.
 */
export interface SearchableField {
  text: string;
  weight: number;
}

export const calculateRelevanceScore = (fields: SearchableField[], query: string): number => {
  const nQuery = normalizeText(query);
  if (!nQuery) return 0;

  let score = 0;
  
  fields.forEach(field => {
    const nText = normalizeText(field.text);
    if (!nText) return;

    if (nText === nQuery) {
      score += field.weight * 5; // Bônus para match exato
    } else if (nText.startsWith(nQuery)) {
      score += field.weight * 2; // Bônus para começa com
    } else if (nText.includes(nQuery)) {
      score += field.weight; // Match normal
    } else if (fuzzyMatch(nText, nQuery)) {
      score += field.weight * 0.5; // Match fuzzy parcial
    }
  });

  return score;
};
