import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Adapter for the concrete DTCG types used by FairShare (not a general DTCG resolver).
const source = new URL('../tokens.json', import.meta.url)
const target = new URL('../src/styles/theme.css', import.meta.url)
const tokens = JSON.parse(readFileSync(source, 'utf8'))
const declarations = []
const fail = (path, message) => { throw new Error(`${path}: ${message}`) }
const dimension = (value, path, rem = false) => {
  if (!Number.isFinite(value?.value) || !['px', 'rem'].includes(value?.unit)) fail(path, 'invalid dimension')
  return rem && value.unit === 'px' ? `${value.value / 16}rem` : `${value.value}${value.unit}`
}
const color = (value, path) => {
  if (value?.colorSpace !== 'srgb' || value.components?.length !== 3 ||
      !value.components.every(n => Number.isFinite(n) && n >= 0 && n <= 1)) fail(path, 'expected an sRGB color')
  const alpha = value.alpha ?? 1
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) fail(path, 'invalid alpha')
  const rgb = value.components.map(n => Math.round(n * 255))
  const hex = `#${rgb.map(n => n.toString(16).padStart(2, '0')).join('')}`
  if (value.hex && value.hex.toLowerCase() !== hex) fail(path, 'hex fallback and sRGB components differ')
  return alpha === 1 ? hex : `rgba(${rgb.join(', ')}, ${alpha})`
}
const toCss = (entry, path) => {
  const value = entry.$value
  switch (entry.$type) {
    case 'color': return color(value, path)
    case 'dimension': return dimension(value, path, true)
    case 'fontFamily': {
      const families = Array.isArray(value) ? value : [value]
      if (!families.length || !families.every(n => typeof n === 'string' && n.length)) fail(path, 'invalid font family')
      return families.map(n => /\s/.test(n) ? JSON.stringify(n) : n).join(', ')
    }
    case 'fontWeight':
      if (!Number.isFinite(value) || value < 1 || value > 1000) fail(path, 'invalid font weight')
      return String(value)
    case 'number':
      if (!Number.isFinite(value)) fail(path, 'invalid number')
      return String(value)
    case 'duration':
      if (!Number.isFinite(value?.value) || value.value < 0 || !['ms', 's'].includes(value?.unit)) fail(path, 'invalid duration')
      return `${value.value}${value.unit}`
    case 'cubicBezier':
      if (!Array.isArray(value) || value.length !== 4 || !value.every(Number.isFinite) ||
          value[0] < 0 || value[0] > 1 || value[2] < 0 || value[2] > 1) fail(path, 'invalid easing')
      return `cubic-bezier(${value.join(', ')})`
    case 'shadow': {
      const layers = Array.isArray(value) ? value : [value]
      if (!layers.length) fail(path, 'empty shadow')
      return layers.map(layer => {
        if (layer.blur?.value < 0) fail(path, 'negative shadow blur')
        return `${layer.inset ? 'inset ' : ''}${['offsetX', 'offsetY', 'blur', 'spread'].map(key => dimension(layer[key], path)).join(' ')} ${color(layer.color, path)}`
      }).join(', ')
    }
    default: return fail(path, `unsupported type ${entry.$type}`)
  }
}
const variable = path => {
  const [group, subgroup, name] = path
  if (group === 'colors') {
    const key = subgroup === 'bg' ? name : name === 'default' ? subgroup : `${subgroup}-${name}`
    return `--color-${key}`
  }
  if (group === 'typography') {
    const prefixes = { fontFamily: 'font', fontWeights: 'font-weight', fontSizes: 'text', lineHeights: 'leading' }
    return `--${prefixes[subgroup]}-${name}`
  }
  if (group === 'spacing') return `--spacing-${subgroup}`
  if (group === 'shadows') return `--shadow-${subgroup}`
  if (group === 'radii') return `--radius-${subgroup}`
  if (group === 'motion') return subgroup === 'easing' ? `--ease-${name}` : `--motion-duration-${name}`
  return fail(path.join('.'), 'unmapped token group')
}
const walk = (group, path = []) => {
  for (const [name, entry] of Object.entries(group)) {
    if (name.startsWith('$')) continue
    if (!entry || typeof entry !== 'object') fail([...path, name].join('.'), 'expected a token or group')
    const next = [...path, name]
    if ('$value' in entry) declarations.push(`  ${variable(next)}: ${toCss(entry, next.join('.'))};`)
    else walk(entry, next)
  }
}
walk(tokens)
// Short semantic names requested for text-primary and border-subtle.
// Brand actions retain the explicit brand-primary name to avoid a color collision.
for (const name of ['primary', 'secondary', 'tertiary', 'inverse']) {
  declarations.push(`  --color-${name}: var(--color-text-${name});`)
}
for (const name of ['subtle', 'strong']) declarations.push(`  --color-${name}: var(--color-border-${name});`)
const css = `/* Generated from tokens.json by npm run tokens:build. Do not edit manually. */\n@theme static {\n${declarations.join('\n')}\n}\n`
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== css) throw new Error('theme.css is stale. Run npm run tokens:build.')
  console.log(`Theme verified: ${declarations.length} variables.`)
} else {
  writeFileSync(target, css)
  console.log(`Theme generated: ${fileURLToPath(target)}`)
}
