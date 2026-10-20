import { useId } from 'react'
import { Button, Icon } from '../../components/ui'

import { EXPENSE_PAGE_SIZES } from './expense-experience'

export function ExpensePagination({ total, page, pageSize, onPageChange, onPageSizeChange, listId }) {
  const id = useId()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize + 1
  return <footer className="expense-pagination">
    <p className="expense-pagination__summary" role="status">Mostrando {start}–{Math.min(page * pageSize, total)} de {total} {total === 1 ? 'gasto' : 'gastos'}</p>
    <label className="expense-pagination__size" htmlFor={`${id}-size`}>Gastos por página
      <span className="expense-pagination__select">
      <select id={`${id}-size`} className="ui-input" value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))} aria-controls={listId}>
        {EXPENSE_PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
      </select>
      <Icon name="chevron" size={16} />
      </span>
    </label>
    {pages > 1 && <nav className="expense-pagination__navigation" aria-label="Páginas de gastos">
      <Button variant="secondary" disabled={page === 1} onClick={() => onPageChange(page - 1)} aria-label="Página anterior de gastos" aria-controls={listId}><Icon name="chevron" className="expense-pagination__previous" size={16} /><span>Anterior</span></Button>
      <label className="expense-pagination__page" htmlFor={`${id}-page`}>Página
        <span className="expense-pagination__select">
        <select id={`${id}-page`} className="ui-input" value={page} onChange={event => onPageChange(Number(event.target.value))} aria-controls={listId}>
          {Array.from({ length: pages }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} de {pages}</option>)}
        </select>
        <Icon name="chevron" size={16} />
        </span>
      </label>
      <Button variant="secondary" disabled={page === pages} onClick={() => onPageChange(page + 1)} aria-label="Página siguiente de gastos" aria-controls={listId}><span>Siguiente</span><Icon name="chevron" size={16} /></Button>
    </nav>}
  </footer>
}
