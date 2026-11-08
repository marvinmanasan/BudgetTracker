export type Transaction = {
  id: string;
  type: "expense" | "income";
  amountCentavos: number;
  category: string;
  date: string;
  paymentMethod: string;
  note?: string;
  walletId?: string | null;
};
