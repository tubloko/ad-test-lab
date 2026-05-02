export const paths = {
  user: (uid: string): string => `users/${uid}`,

  products: (uid: string): string => `users/${uid}/products`,
  product: (uid: string, productId: string): string =>
    `users/${uid}/products/${productId}`,

  campaigns: (uid: string, productId: string): string =>
    `users/${uid}/products/${productId}/campaigns`,
  campaign: (uid: string, productId: string, campaignId: string): string =>
    `users/${uid}/products/${productId}/campaigns/${campaignId}`,

  campaignEntries: (uid: string, productId: string, campaignId: string): string =>
    `users/${uid}/products/${productId}/campaigns/${campaignId}/entries`,
  campaignEntry: (
    uid: string,
    productId: string,
    campaignId: string,
    date: string,
  ): string =>
    `users/${uid}/products/${productId}/campaigns/${campaignId}/entries/${date}`,

  adsets: (uid: string, productId: string, campaignId: string): string =>
    `users/${uid}/products/${productId}/campaigns/${campaignId}/adsets`,
  adset: (
    uid: string,
    productId: string,
    campaignId: string,
    adsetId: string,
  ): string =>
    `users/${uid}/products/${productId}/campaigns/${campaignId}/adsets/${adsetId}`,

  adsetEntries: (
    uid: string,
    productId: string,
    campaignId: string,
    adsetId: string,
  ): string =>
    `users/${uid}/products/${productId}/campaigns/${campaignId}/adsets/${adsetId}/entries`,
  adsetEntry: (
    uid: string,
    productId: string,
    campaignId: string,
    adsetId: string,
    date: string,
  ): string =>
    `users/${uid}/products/${productId}/campaigns/${campaignId}/adsets/${adsetId}/entries/${date}`,

  diagnoses: (uid: string, productId: string, campaignId: string): string =>
    `users/${uid}/products/${productId}/campaigns/${campaignId}/diagnoses`,
  diagnosis: (
    uid: string,
    productId: string,
    campaignId: string,
    diagnosisId: string,
  ): string =>
    `users/${uid}/products/${productId}/campaigns/${campaignId}/diagnoses/${diagnosisId}`,
} as const;
