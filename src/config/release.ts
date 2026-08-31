import packageMetadata from "../../package.json";

export const RELEASE_VERSION = packageMetadata.version;
export const RELEASE_EVIDENCE_URL = `https://uceevidencelens.com/evidence/v${RELEASE_VERSION}`;
