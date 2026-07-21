// Conversion offline IFC -> fragments (.frag), pour un chargement instantané au
// démarrage (évite de parser l'IFC dans le navigateur). Usage :
//   node scripts/convert-ifc.mjs [entrée.ifc] [sortie.frag]
// Défaut : public/models/demo.ifc -> public/models/demo.frag
import { IfcImporter } from '@thatopen/fragments';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = resolve(root, process.argv[2] || 'public/models/demo.ifc');
const output = resolve(root, process.argv[3] || 'public/models/demo.frag');

const importer = new IfcImporter();
importer.wasm = { absolute: true, path: resolve(root, 'node_modules/web-ifc') + '/' };

const bytes = new Uint8Array(readFileSync(input));
console.log(`Conversion ${input} (${(bytes.length / 1e6).toFixed(2)} Mo) -> ${output}…`);
const frag = await importer.process({ bytes });
writeFileSync(output, Buffer.from(frag));
console.log(`OK : ${output} (${(frag.length / 1e6).toFixed(2)} Mo)`);
