import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertContractShape } from '../src/mocks/contract-validation.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const json = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'))
const contracts = await json('src/mocks/contracts.json')
const manifest = await json('public/data/index.json')
let count = 0
for (const entry of Object.values(manifest.fixtures)) {
  if (!/^[a-z0-9-]+\.json$/.test(entry.file)) throw new Error('Nombre de archivo no permitido.')
  assertContractShape(contracts, entry.dto, await json(`public/data/${entry.file}`), entry.file)
  count++
}
console.log(`${count} archivos JSON verificados contra ${Object.keys(contracts.models).length} contratos DTO.`)

const backendFlag = process.argv.indexOf('--backend')
if (backendFlag >= 0) {
  if (!process.argv[backendFlag + 1]) throw new Error('Indicá la carpeta del backend después de --backend.')
  const backend = resolve(process.cwd(), process.argv[backendFlag + 1])
  const clean = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  const normalize = type => type.replaceAll('com.example.fairshareapp.model.enums.', '').replaceAll(/\s/g, '')
  const sorted = value => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))))
  for (const [name, model] of Object.entries(contracts.models)) {
    const source = clean(await readFile(resolve(backend, model.source), 'utf8'))
    const record = source.match(new RegExp(`public record ${name}\\(([\\s\\S]*?)\\)\\s*\\{`))
    const fields = record
      ? Object.fromEntries(record[1].split(',').map(field => { const [type, key] = field.trim().split(/\s+/); return [key, normalize(type)] }))
      : Object.fromEntries([...source.matchAll(/private\s+([\w.]+(?:<[^;]+>)?)\s+(\w+)\s*;/g)].map(([, type, key]) => [key, normalize(type)]))
    if (sorted(fields) !== sorted(model.fields)) throw new Error(`${name}: cambió el contrato Java. Revisá contracts.json y los archivos de public/data/.`)
  }
  for (const [name, expected] of Object.entries(contracts.enums)) {
    const path = resolve(backend, `src/main/java/com/example/fairshareapp/model/enums/${name}.java`)
    const source = clean(await readFile(path, 'utf8'))
    const actual = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}')).match(/\b[A-Z][A-Z_]+\b/g) || []
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${name}: cambió el enum Java.`)
  }
  console.log('Campos, tipos y enums contrastados con el código Java actual.')
} else {
  console.log('Para contrastar también el backend: npm run mock:check:java (o -- --backend /ruta/al/backend).')
}
