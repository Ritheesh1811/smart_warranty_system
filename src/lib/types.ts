export type WarrantyStatus = 'active' | 'expiring' | 'expired';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  model_number: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  warranty_duration_months: number | null;
  warranty_expiry: string | null;
  seller: string | null;
  image_url: string | null;
  warranty_status: WarrantyStatus;
  notes: string | null;
  created_at: string;
}

export type InteractionKind =
  | 'problem'
  | 'troubleshooting'
  | 'repair'
  | 'service_visit'
  | 'warranty_claim'
  | 'conversation';

export interface ProductInteraction {
  id: string;
  product_id: string;
  kind: InteractionKind;
  summary: string;
  detail: string | null;
  resolved: boolean;
  created_at: string;
}

export type MemoryLayer = 'RETAIN' | 'RECALL' | 'REFLECT';

export interface MemoryEvent {
  id: string;
  product_id: string;
  layer: MemoryLayer;
  label: string;
  description: string | null;
  created_at: string;
}

export interface WarrantyClaim {
  id: string;
  product_id: string;
  issue: string;
  warranty_status: string | null;
  issue_recurrence: number;
  previous_repairs: string | null;
  documents_required: string | null;
  claim_summary: string | null;
  status: string;
  created_at: string;
}

export interface Notification {
  id: string;
  product_id: string | null;
  title: string;
  body: string | null;
  kind: string;
  read: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  sources?: string[];
  memoryUsed?: boolean;
}
