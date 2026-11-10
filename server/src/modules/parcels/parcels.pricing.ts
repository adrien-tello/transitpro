// Parcel prices, in FCFA. PROVISIONAL: open question Q2 of the requirements document.
// When the team decides the real formula, change it here only.

export const PRICING = {
  base: 1000, // every parcel
  perKg: 250, // per started kilogram
  homeDelivery: 1000, // courier brings it to the receiver's address
  insuranceRate: 0.02, // 2% of the declared value...
  insuranceMin: 500, // ...never less than this
};

export interface ParcelPrice {
  fee: number; // transport (+ home delivery)
  insuranceFee: number;
  total: number; // what the sender pays at the counter
}

export function priceParcel(input: { weightKg: number; homeDelivery: boolean; insured: boolean; declaredValue: number }): ParcelPrice {
  const fee = PRICING.base + PRICING.perKg * Math.ceil(input.weightKg) + (input.homeDelivery ? PRICING.homeDelivery : 0);
  const insuranceFee = input.insured
    ? Math.max(PRICING.insuranceMin, Math.round(input.declaredValue * PRICING.insuranceRate))
    : 0;
  return { fee, insuranceFee, total: fee + insuranceFee };
}
