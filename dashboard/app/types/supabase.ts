export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          title: string;
          description: string;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      incidents: {
        Row: {
          id: string;
          name: string;
          location: string;
          incident_type: string;
          severity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location: string;
          incident_type: string;
          severity: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string;
          incident_type?: string;
          severity?: number;
          created_at?: string;
        };
      };
    };
    Views: object;
    Functions: object;
    Enums: object;
  };
};
