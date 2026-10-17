import { useRef, useState } from 'react'

// Controlled auth form: keeps input after errors, validates per field and blocks duplicate submits.
export function useAuthForm({ initialValues, validate, submit, mapError }) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)

  const field = name => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: event => {
      const next = { ...values, [name]: event.target.value }
      setValues(next)
      // Once an error is visible, clear it as soon as the value becomes valid.
      if (errors[name]) setErrors(current => ({ ...current, [name]: validate(next)[name] }))
    },
    onBlur: event => {
      if (event.target.value) setErrors(current => ({ ...current, [name]: validate(values)[name] }))
    },
  })

  const handleSubmit = async event => {
    event.preventDefault()
    if (pending.current) return
    const form = event.currentTarget
    const found = validate(values)
    setErrors(found)
    setFormError(null)
    const first = Object.keys(found)[0]
    if (first) {
      form.elements.namedItem(first)?.focus()
      return
    }
    pending.current = true
    setBusy(true)
    try {
      await submit(values)
    } catch (failure) {
      if (failure?.name === 'AbortError') return
      const mapped = mapError(failure, values)
      setErrors(mapped.fields || {})
      setFormError(mapped.form || null)
      const fieldWithError = Object.keys(mapped.fields || {})[0]
      if (fieldWithError) form.elements.namedItem(fieldWithError)?.focus()
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return { values, field, formError, busy, handleSubmit }
}
