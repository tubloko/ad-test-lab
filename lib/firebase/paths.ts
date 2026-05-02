export const paths = {
  user: (uid: string): string => `users/${uid}`,
  products: (uid: string): string => `users/${uid}/products`,
  product: (uid: string, productId: string): string =>
    `users/${uid}/products/${productId}`,
  adsets: (uid: string, productId: string): string =>
    `users/${uid}/products/${productId}/adsets`,
  adset: (uid: string, productId: string, adsetId: string): string =>
    `users/${uid}/products/${productId}/adsets/${adsetId}`,
  productEntries: (uid: string, productId: string): string =>
    `users/${uid}/products/${productId}/entries`,
  productEntry: (uid: string, productId: string, date: string): string =>
    `users/${uid}/products/${productId}/entries/${date}`,
  adsetEntries: (uid: string, productId: string, adsetId: string): string =>
    `users/${uid}/products/${productId}/adsets/${adsetId}/entries`,
  adsetEntry: (uid: string, productId: string, adsetId: string, date: string): string =>
    `users/${uid}/products/${productId}/adsets/${adsetId}/entries/${date}`,
  diagnoses: (uid: string, productId: string): string =>
    `users/${uid}/products/${productId}/diagnoses`,
  diagnosis: (uid: string, productId: string, diagnosisId: string): string =>
    `users/${uid}/products/${productId}/diagnoses/${diagnosisId}`,
} as const;
