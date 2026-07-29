import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      // The avatar widget (components/avatar-widget.tsx) compresses photos
      // client-side before upload (resized + re-encoded JPEG, typically
      // well under 1MB), so this ceiling should rarely if ever be hit in
      // normal use. It's set generously high as a fallback for the rare
      // case that compression fails (e.g. an unsupported source format) and
      // the original, uncompressed file goes through instead — a modern
      // phone photo can be 15-25MB uncompressed. If this config-level
      // ceiling is hit, Next rejects the request before our code ever runs,
      // so the user sees Next's raw "Body exceeded Xmb limit" error instead
      // of our friendly message — keep this comfortably above the 10MB
      // app-level check in lib/ai-avatar-actions.ts for that reason.
      bodySizeLimit: "50mb",
    },
    // Every request — including the avatar's photo upload — passes through
    // proxy.ts before reaching the Server Action, and Next 16 imposes a
    // SEPARATE default 10MB cap there (independent of
    // serverActions.bodySizeLimit above). Without raising this too, a large
    // fallback (uncompressed) photo gets silently truncated at the proxy
    // layer, which then breaks multipart parsing downstream with an opaque
    // "Unexpected end of form" error rather than a clean rejection.
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
