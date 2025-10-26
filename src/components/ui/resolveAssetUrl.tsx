// Map all assets at build to their final URLs
const assetUrls = import.meta.glob<string>("/src/assets/**/*", {
  eager: true,
  as: "url",
});

export function resolveAssetUrl(p?: string) {
  if (!p) return "";
  if (/^(https?:)?\/\//i.test(p) || p.startsWith("data:")) return p;
  const withSlash = p.startsWith("/") ? p : `/${p}`;
  return assetUrls[withSlash] ?? p;
}
