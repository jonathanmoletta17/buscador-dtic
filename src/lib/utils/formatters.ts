export const formatLocation = (loc?: string) => {
  if (!loc) return "";
  const parts = loc.split(">").map(p => p.trim());
  return parts.length > 1 ? parts.slice(1).join(" > ") : parts[0];
};

export const formatCategoryName = (category?: string) => {
  if (!category) return "GERAL";
  const parts = category.split(">").map(p => p.trim());
  
  const chargerIndex = parts.findIndex(p => p.toLowerCase().includes("carregador"));
  if (chargerIndex !== -1) {
    if (chargerIndex < parts.length - 1) {
      return parts.slice(chargerIndex + 1).join(" > ");
    } else {
      return parts[chargerIndex];
    }
  }
  
  return parts.length > 1 ? parts.slice(-1)[0] : category;
};

export const decodeHtmlEntities = (text?: string) => {
  if (!text) return "";
  return text
    .replace(/&#62;/g, ">")
    .replace(/&gt;/g, ">")
    .replace(/&#60;/g, "<")
    .replace(/&lt;/g, "<")
    .replace(/&#38;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"');
};
