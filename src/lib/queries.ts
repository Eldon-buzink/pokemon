// eBay query builders for different card types
export const CATEGORY_POKEMON_TCG = "183454";

export function qRaw({ name, number, setName }: { name: string; number: string; setName?: string }) {
  const parts = [
    name, number,
    setName ? `"${setName}"` : "",
    // exclude graded
    "-PSA -BGS -CGC -SGC -CGC10 -BGS10 -PSA10 -PSA9 -slab"
  ].filter(Boolean);
  return parts.join(" ");
}

export function qPSA({ name, number, setName, grade }: { name: string; number: string; setName?: string; grade: 10 | 9 }) {
  const parts = [
    name, number,
    setName ? `"${setName}"` : "",
    `"PSA ${grade}"`,
    // exclude other graders
    "-BGS -CGC -SGC",
    // exclude lots/collections
    "-lot -bundle -proxy"
  ].filter(Boolean);
  return parts.join(" ");
}
