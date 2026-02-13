export interface Team {
  id?: number;
  name: string;
  status?: string;
  created_at?: string;
}

export interface TeamAvailability {
  id?: number;
  team_id: number;
  work_date: string; // YYYY-MM-DD
  is_available: boolean;
  notes?: string;
  created_at?: string;
}

