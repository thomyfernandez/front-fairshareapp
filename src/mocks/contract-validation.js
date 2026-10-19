export function assertContractShape(contracts, type, value, path = type) {
  if (type.endsWith('[]')) {
    if (!Array.isArray(value)) throw new Error(`${path}: se esperaba un array`)
    value.forEach((item, index) => assertContractShape(contracts, type.slice(0, -2), item, `${path}[${index}]`))
    return
  }
  const model = contracts.models[type]
  if (!model || !value || Array.isArray(value) || typeof value !== 'object') throw new Error(`${path}: DTO inválido`)
  for (const key of Object.keys(value)) if (!(key in model.fields)) throw new Error(`${path}.${key}: campo ajeno al DTO Java`)
  for (const [key, javaType] of Object.entries(model.fields)) {
    if (type === 'ErrorResponseDTO' && key === 'fieldErrors' && !(key in value)) continue
    if (!(key in value)) throw new Error(`${path}.${key}: falta el campo del DTO Java`)
    const field = value[key]
    if (field === null && !['int', 'long', 'boolean'].includes(javaType)) continue
    const at = `${path}.${key}`
    if (javaType.startsWith('List<')) {
      if (!Array.isArray(field)) throw new Error(`${at}: se esperaba un array`)
      const itemType = javaType.slice(5, -1)
      if (contracts.models[itemType]) field.forEach((item, index) => assertContractShape(contracts, itemType, item, `${at}[${index}]`))
      else if (!field.every(Number.isInteger)) throw new Error(`${at}: identificadores inválidos`)
    } else if (contracts.models[javaType]) assertContractShape(contracts, javaType, field, at)
    else if (contracts.enums[javaType]) {
      if (!contracts.enums[javaType].includes(field)) throw new Error(`${at}: enum inválido`)
    } else if (['Long', 'Integer', 'int', 'long'].includes(javaType)) {
      if (!Number.isSafeInteger(field)) throw new Error(`${at}: se esperaba un entero`)
    } else if (javaType === 'BigDecimal') {
      if (typeof field !== 'number' || !Number.isFinite(field)) throw new Error(`${at}: se esperaba un número JSON`)
    } else if (['Boolean', 'boolean'].includes(javaType)) {
      if (typeof field !== 'boolean') throw new Error(`${at}: se esperaba un booleano`)
    } else if (javaType === 'Map<String,String>') {
      if (!field || typeof field !== 'object' || Array.isArray(field) || !Object.values(field).every(item => typeof item === 'string')) throw new Error(`${at}: mapa de errores inválido`)
    } else {
      if (typeof field !== 'string') throw new Error(`${at}: se esperaba texto`)
      if (javaType === 'LocalDate' && !/^\d{4}-\d{2}-\d{2}$/.test(field)) throw new Error(`${at}: fecha ISO inválida`)
      if (javaType === 'Instant' && !Number.isFinite(Date.parse(field))) throw new Error(`${at}: instante ISO inválido`)
    }
  }
}
