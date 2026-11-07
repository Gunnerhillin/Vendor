export function assetUrl(path: string, bucket = 'vendor-assets') {
  return `/api/media?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`
}
