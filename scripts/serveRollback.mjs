import { preview } from 'vite';
import { verifyFrozenInputs } from './rollbackEvidenceReporter.mjs';
// Local synthetic verification only; no remote serving or publication.
verifyFrozenInputs();
await preview({ build: { outDir: 'dist-rollback' }, preview: { host: '127.0.0.1', port: 4189, strictPort: true } });
