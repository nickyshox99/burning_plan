export interface BurnRequest {
  id?: number;
  boundary: number[][]; // [[lng, lat], [lng, lat], ...]
  owner_name?: string;
  area_name?: string;
  area_rai?: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

