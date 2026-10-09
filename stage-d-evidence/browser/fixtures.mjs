import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import assert from 'node:assert/strict';
import * as C from '../../src/career/content.js';import * as E from '../../src/career/engine.js';import * as V from '../../src/career/volumes.js';
export {C,E,V};let frozen;
export function fixture(name){frozen??=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures.generated.json.gz',import.meta.url))));assert(Object.hasOwn(frozen.fixtures,name),'Unknown fixture '+name);return structuredClone(frozen.fixtures[name]);}
export function buildArt(){return JSON.parse(fs.readFileSync('stage-d-build.json')).art;}
