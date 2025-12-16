export interface Metric {
  label: string;
  value: string | number;
  change: number; // percentage
  trend: 'up' | 'down' | 'neutral';
}

export interface ActivityLog {
  id: string;
  platform: 'facebook' | 'instagram';
  user: string;
  action: string; // e.g., "Auto-replied", "Flagged"
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

export interface PageConfig {
  pageName: string;
  pageId: string;
  isConnected: boolean;
  lastSync: string | null;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

export interface SimulationResult {
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  suggestedReply: string;
  reasoning: string;
}

export interface SimulationHistoryItem {
  id: string;
  input: string;
  result: SimulationResult;
  timestamp: string;
}

export interface Product {
  id?: number;
  name: string;
  description: string;
  price: number;
  sku: string;
  category: string;
  created_at?: string;
}

export interface AppSettings {
  n8n_webhook_url: string;
  n8n_webhook_secret: string;
  supabase_url: string;
  supabase_key: string;
  facebook_app_id: string;
}

export interface Tenant {
  id: string;
  org_name: string;
  plan: string;
  role: 'admin' | 'user';
  email: string;
  created_at: string;
}