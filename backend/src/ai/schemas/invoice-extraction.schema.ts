export const InvoiceExtractionSchema = {
  type: 'object',
  properties: {
    invoice_number: { type: 'string', description: 'Número do documento fiscal ou recibo' },
    issuer_name: { type: 'string', description: 'Razão social ou nome do emissor' },
    issuer_tax_id: { type: 'string', description: 'CNPJ ou CPF do emissor devidamente formatado' },
    issued_at: { type: 'string', description: 'Data de emissão no formato ISO-8601 (YYYY-MM-DD)' },
    total_amount: { type: 'number', description: 'Valor total da nota em moeda corrente' },
    currency: { type: 'string', description: 'Moeda (ex: BRL, USD)' },
    confidence_score: { type: 'number', description: 'Grau de confiança da leitura geral (0.0 a 1.0)' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item_index: { type: 'integer' },
          description: { type: 'string' },
          quantity: { type: 'number' },
          unit_price: { type: 'number' },
          total_price: { type: 'number' },
          sku_code: { type: 'string' },
        },
        required: ['item_index', 'description', 'quantity', 'unit_price', 'total_price'],
        additionalProperties: false,
      },
    },
  },
  required: ['invoice_number', 'issuer_name', 'total_amount', 'items'],
  additionalProperties: false,
} as const;

export type ExtractedInvoiceData = {
  invoice_number: string;
  issuer_name: string;
  issuer_tax_id?: string;
  issued_at?: string;
  total_amount: number;
  currency?: string;
  confidence_score?: number;
  items: Array<{
    item_index: number;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    sku_code?: string;
  }>;
};
