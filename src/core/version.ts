/** Version du moteur. Sert de témoin pour la chaîne de tests ; aucune logique métier ici. */
export const CORE_VERSION = '0.0.1';

/** Compare deux versions « majeur.mineur.correctif » ; retourne -1, 0 ou 1. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  const length = Math.max(pa.length, pb.length);
  for (let i = 0; i < length; i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}
