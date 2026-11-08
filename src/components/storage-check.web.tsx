// Native SQLite diagnostics must not pull SQLite's WASM bridge into web previews.
export function StorageCheck() {
  return null;
}
