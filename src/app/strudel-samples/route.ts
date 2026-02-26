// Root-level re-export of the strudel-samples manifest.
//
// The manifest MUST be served from the root path (/strudel-samples) because
// Strudel resolves sample paths by stripping the last path segment of the
// manifest URL to get a base directory, then concatenating sample paths onto
// it. When the manifest lives at /api/strudel-samples the computed base
// becomes https://host.com/api, so root-relative paths like /sounds/... end
// up as https://host.com/api/sounds/... (wrong). Serving from the root means
// the base is https://host.com and /sounds/... resolves correctly.
export { GET, OPTIONS } from '../api/strudel-samples/route';
