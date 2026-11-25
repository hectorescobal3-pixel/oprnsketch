export interface InvoiceItem {
  item_index: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sku_code?: string;
}

export interface ExtractedInvoiceData {
  invoice_number: string;
  issuer_name: string;
  issuer_tax_id?: string;
  issued_at?: string;
  total_amount: number;
  currency?: string;
  confidence_score?: number;
  items: InvoiceItem[];
}
