import path from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Prefer server/.env, then fall back to project root .env
config({ path: path.resolve(process.cwd(), "server/.env") });
config();

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const originalBucket = process.env.PHOTOS_ORIGINAL_BUCKET ?? "profile-photos";
const blurredBucket = process.env.PHOTOS_BLURRED_BUCKET ?? "photos_blurred";
const privateBucket = process.env.PHOTOS_PRIVATE_BUCKET ?? "photos_private";
const verificationBucket = "verifications";

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAGE_SIZE = 1000;

const chunk = (arr, size) => {
  const res = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
};

const listAllObjects = async (bucket) => {
  const objects = [];
  const stack = [""];

  while (stack.length) {
    const prefix = stack.pop();
    let offset = 0;
    // Offset pagination for this prefix
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(prefix, {
        limit: PAGE_SIZE,
        offset,
      });
      if (error) {
        throw new Error(`List failed for ${bucket}/${prefix}: ${error.message}`);
      }
      if (!data || data.length === 0) {
        break;
      }

      for (const entry of data) {
        const isFolder = entry.id === null || entry.metadata?.mimetype === "folder";
        const fullPath = prefix ? `${prefix}${entry.name}` : entry.name;
        if (isFolder) {
          stack.push(`${fullPath}/`);
        } else {
          objects.push(fullPath);
        }
      }

      if (data.length < PAGE_SIZE) {
        break;
      }
      offset += PAGE_SIZE;
    }
  }

  return objects;
};

const fetchPhotoAssets = async () => {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error, count } = await admin
      .from("photo_assets")
      .select("id, storage_bucket, storage_path, blurred_bucket, blurred_path", { count: "exact" })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw error;
    }
    rows.push(...(data ?? []));
    from += PAGE_SIZE;
    if (!count || from >= count) {
      break;
    }
  }
  return rows;
};

const bucketsToScan = Array.from(
  new Set([originalBucket, blurredBucket, privateBucket, verificationBucket].filter(Boolean))
);

const main = async () => {
  console.log("Buckets to scan:", bucketsToScan.join(", "));

  const assets = await fetchPhotoAssets();
  console.log(`photo_assets rows: ${assets.length}`);

  // Build reference sets per bucket
  const bucketRefs = new Map();
  for (const asset of assets) {
    if (asset.storage_bucket && asset.storage_path) {
      const set = bucketRefs.get(asset.storage_bucket) ?? new Set();
      set.add(asset.storage_path);
      bucketRefs.set(asset.storage_bucket, set);
    }
    if (asset.blurred_bucket && asset.blurred_path) {
      const set = bucketRefs.get(asset.blurred_bucket) ?? new Set();
      set.add(asset.blurred_path);
      bucketRefs.set(asset.blurred_bucket, set);
    }
  }

  for (const bucket of bucketsToScan) {
    console.log(`\n--- ${bucket} ---`);
    const objectPaths = await listAllObjects(bucket);
    const refs = bucketRefs.get(bucket) ?? new Set();

    const orphaned = objectPaths.filter((p) => !refs.has(p));
    const missingInStorage = Array.from(refs).filter((p) => !objectPaths.includes(p));

    console.log(`Objects in storage: ${objectPaths.length}`);
    console.log(`Referenced in DB:   ${refs.size}`);
    console.log(`Orphaned objects:   ${orphaned.length}`);
    if (orphaned.length) {
      console.log("Sample orphans:", orphaned.slice(0, 20));
    }
    console.log(`Missing in storage (referenced but not found): ${missingInStorage.length}`);
    if (missingInStorage.length) {
      console.log("Sample missing:", missingInStorage.slice(0, 20));
    }
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
