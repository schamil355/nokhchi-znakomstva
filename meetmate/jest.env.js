const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://chhkvnvwfjldxgyqexjc.supabase.co";
}

if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoaGt2bnZ3ZmpsZHhneXFleGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODc1NjEsImV4cCI6MjA4MDM0NzU2MX0.SQ-9N_1dKEL3G21XK50e5W9F-eUxR5BkZ617QEkVYKs";
}
