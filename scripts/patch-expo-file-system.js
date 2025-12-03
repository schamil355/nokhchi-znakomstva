#!/usr/bin/env node
// Patch expo-file-system to use the public ExpoAppDelegateSubscriberRepository API

const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo-file-system",
  "ios",
  "FileSystemModule.swift"
);

const from = "ExpoAppDelegate.getSubscriberOfType(FileSystemBackgroundSessionHandler.self)";
const to =
  "ExpoAppDelegateSubscriberRepository.getSubscriberOfType(FileSystemBackgroundSessionHandler.self)";

try {
  const source = fs.readFileSync(target, "utf8");
  if (source.includes(to)) {
    console.log("[patch-expo-file-system] Already patched");
    process.exit(0);
  }
  if (!source.includes(from)) {
    console.warn("[patch-expo-file-system] Pattern not found; file layout may have changed");
    process.exit(0);
  }
  const next = source.replace(from, to);
  fs.writeFileSync(target, next, "utf8");
  console.log("[patch-expo-file-system] Patched FileSystemModule.swift");
} catch (err) {
  console.warn("[patch-expo-file-system] Failed:", err.message);
  process.exit(0);
}
