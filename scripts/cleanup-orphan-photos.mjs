import path from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load env from server/.env first, then fallback to default .env
config({ path: path.resolve(process.cwd(), "server/.env") });
config();

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === "1";
const PAGE_SIZE = 1000;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const chunk = (arr, size) => {
  const res = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
};

const fetchAllPhotoAssets = async () => {
  let from = 0;
  const assets = [];
  while (true) {
    const { data, error, count } = await admin
      .from("photo_assets")
      .select("id, owner_id, storage_bucket, storage_path, blurred_bucket, blurred_path", { count: "exact" })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    assets.push(...(data ?? []));
    from += PAGE_SIZE;
    if (!count || from >= count) break;
  }
  return assets;
};

const fetchAllUsers = async () => {
  const ids = new Set();
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;
    (data.users ?? []).forEach((user) => ids.add(user.id));
    if (!data.users || data.users.length < PAGE_SIZE) break;
    page += 1;
  }
  return ids;
};

const deleteStorageObjects = async (bucket, paths) => {
  for (const batch of chunk(paths, 50)) {
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) {
      console.warn(`Failed deleting from ${bucket}: ${error.message}`);
    }
  }
};

const main = async () => {
  console.log("Loading photo assets…");
  const assets = await fetchAllPhotoAssets();
  console.log(`Found ${assets.length} photo_assets rows.`);

  console.log("Loading users…");
  const userIds = await fetchAllUsers();
  console.log(`Found ${userIds.size} auth users.`);

  const orphans = assets.filter((asset) => !asset.owner_id || !userIds.has(asset.owner_id));
  if (!orphans.length) {
    console.log("No orphaned photo assets found.");
    return;
  }

  console.log(`Orphaned assets: ${orphans.length}`);

  // Bucket -> paths mapping
  const buckets = new Map();
  for (const rec of orphans) {
    if (rec.storage_bucket && rec.storage_path) {
      const list = buckets.get(rec.storage_bucket) ?? [];
      list.push(rec.storage_path);
      buckets.set(rec.storage_bucket, list);
    }
    if (rec.blurred_bucket && rec.blurred_path) {
      const list = buckets.get(rec.blurred_bucket) ?? [];
      list.push(rec.blurred_path);
      buckets.set(rec.blurred_bucket, list);
    }
  }

  if (DRY_RUN) {
    console.log("[DRY RUN] Would delete from buckets:", Array.from(buckets.entries()).map(([b, p]) => `${b} (${p.length})`).join(", "));
    console.log("[DRY RUN] Would delete photo_assets ids:", orphans.map((o) => o.id));
    return;
  }

  for (const [bucket, paths] of buckets.entries()) {
    console.log(`Deleting ${paths.length} objects from bucket ${bucket}…`);
    await deleteStorageObjects(bucket, paths);
  }

  const ids = orphans.map((o) => o.id);
  console.log(`Deleting ${ids.length} rows from photo_assets…`);
  const { error: dbError } = await admin.from("photo_assets").delete().in("id", ids);
  if (dbError) {
    console.warn("Failed to delete photo_assets rows:", dbError.message);
  }

  console.log("Cleanup finished.");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
