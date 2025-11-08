export type Database = {
  public: {
    Tables: {
      reports_view: {
        Row: {
          id: string;
          reason: string | null;
          details: string | null;
          created_at: string;
          reporter_email: string | null;
          reported_email: string | null;
          reporter_name: string | null;
          reported_name: string | null;
          match_id: string | null;
        };
      };
      blocks_view: {
        Row: {
          blocker_email: string | null;
          blocked_email: string | null;
          created_at: string;
          blocker_name: string | null;
          blocked_name: string | null;
        };
      };
      matches_view: {
        Row: {
          id: string;
          created_at: string;
          user_a_email: string | null;
          user_b_email: string | null;
          user_a_name: string | null;
          user_b_name: string | null;
        };
      };
      messages_view: {
        Row: {
          id: string;
          match_id: string;
          sender_email: string | null;
          sender_name: string | null;
          text: string | null;
          image_url: string | null;
          created_at: string;
        };
      };
    };
    Functions: {
      admin_search_users: {
        Args: { search_term: string };
        Returns: Array<{
          id: string;
          email: string | null;
          display_name: string | null;
          created_at: string;
        }>;
      };
      admin_ban_user: {
        Args: { target_user: string; ban_reason?: string | null };
        Returns: void;
      };
      admin_unban_user: {
        Args: { target_user: string };
        Returns: void;
      };
    };
  };
};
