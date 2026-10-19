import contracts from './contracts.json'
import { assertContractShape } from './contract-validation'

export const assertContract = (type, value, path) => assertContractShape(contracts, type, value, path)
