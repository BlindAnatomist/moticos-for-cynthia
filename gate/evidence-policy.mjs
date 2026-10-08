// Playwright leaves unfinalized recorder working files even for successful cases.
// They are not the canonical final per-case trace.zip, raw result, progress ledger,
// failure context, screenshot, downloaded postcard or runner status metadata.
// Keep originals on the runner; record their bytes and streamed hashes separately.
export function isWorkingTrace(file){return /^(?:campaign-results\/)?campaign-(?:chromium|webkit-phone)\/raw\/\.playwright-artifacts-\d+\/traces\/[^/]+\.(?:trace|network)$/.test(file);}
