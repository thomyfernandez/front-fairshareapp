import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
window.scrollTo = () => {}

// Las secciones se cargan de forma diferida: la primera vez pueden tardar más que el segundo por defecto de findBy.
configure({ asyncUtilTimeout: 3000 })

// jsdom does not implement native dialogs; browser focus containment is also checked manually.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
