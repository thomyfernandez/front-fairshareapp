import { useState } from 'react'
import { Button, Icon, PageHeader, ResourceState } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { useWorkspace } from '../../app/useWorkspace'
import { useSearchParams } from 'react-router'
import { ExpenseForm } from './ExpenseForm.jsx'
import { ExpenseFilters } from './ExpenseFilters.jsx'
import { ExpenseList } from './ExpenseList.jsx'
import { ExpenseBatchForm } from './ExpenseBatchForm.jsx'

export default function ExpensesPage() {
  const { spaceId } = useWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()

  const spacePath = `/api/v1/espacios/${spaceId}`
  const filters = new URLSearchParams(
    [...searchParams].filter(([key]) => ['desde', 'hasta'].includes(key))
  )

  const { resource, membersState, members, refresh } = useFeature(
    `${spacePath}/gastos${filters.size ? `?${filters}` : ''}`
  )
  const expenses = resource.data || []

  // Pestaña o modo activo ('lista', 'individual', 'lote')
  const [tab, setTab] = useState(() => {
    if (searchParams.has('nuevo')) {
      return searchParams.get('modo') === 'lote' ? 'lote' : 'individual'
    }
    return 'lista'
  })

  // Estado del buscador de texto en cliente
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrado reactivo en cliente para búsqueda por texto
  const term = searchTerm.trim().toLocaleLowerCase('es-AR')
  const filteredExpenses = term ? expenses.filter(g => [g.descripcion, g.pagadorNombre].some(value => value?.toLocaleLowerCase('es-AR').includes(term))) : expenses

  const handleDesdeChange = (val) => {
    const next = new URLSearchParams(searchParams)
    if (val) next.set('desde', val)
    else next.delete('desde')
    setSearchParams(next)
  }

  const handleHastaChange = (val) => {
    const next = new URLSearchParams(searchParams)
    if (val) next.set('hasta', val)
    else next.delete('hasta')
    setSearchParams(next)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setSearchParams({})
  }

  return (
    <div className="feature-page expenses-page">
      {/* Cabecera principal */}
      <PageHeader
        title={tab === 'lista' ? 'Gastos' : tab === 'individual' ? 'Registrar gasto' : 'Registrar por lote'}
        description={tab === 'lista' ? 'Lo que compartieron, en un solo lugar.' : tab === 'individual' ? 'Contanos qué pagaste y cómo lo comparten.' : 'Cargá varios gastos y revisalos antes de guardarlos juntos.'}
        actions={tab === 'lista' &&
          <>
            <Button variant="secondary" onClick={() => setTab('lote')}>Registrar por lote</Button>
            <Button onClick={() => setTab('individual')}><Icon name="plus" size={18} />Registrar gasto</Button>
          </>
        }
      />

      {/* Vista 1: Formulario Individual */}
      {tab === 'individual' && (
        <section className="space-y-4">
          <div className="feature-section-heading">
            <Button variant="ghost" size="small" onClick={() => setTab('lista')}>
              Volver al listado
            </Button>
          </div>
          <ExpenseForm
            spaceId={spaceId}
            members={members}
            onSuccess={() => {
              refresh()
              setTab('lista')
              if (searchParams.has('nuevo')) {
                const next = new URLSearchParams(searchParams)
                next.delete('nuevo')
                setSearchParams(next)
              }
            }}
            onCancel={() => setTab('lista')}
          />
        </section>
      )}

      {/* Vista 2: Formulario por Lote */}
      {tab === 'lote' && (
        <section className="space-y-4">
          <div className="feature-section-heading">
            <Button variant="ghost" size="small" onClick={() => setTab('lista')}>
              Volver al listado
            </Button>
          </div>
          <ExpenseBatchForm
            spaceId={spaceId}
            members={members}
            onSuccess={() => {
              refresh()
              setTab('lista')
              if (searchParams.has('nuevo')) {
                const next = new URLSearchParams(searchParams)
                next.delete('nuevo')
                setSearchParams(next)
              }
            }}
            onCancel={() => setTab('lista')}
          />
        </section>
      )}

      {/* Vista 3: Listado con Filtros */}
      {tab === 'lista' && (
        <ResourceState resource={resource}>
          <ResourceState resource={membersState}>
            <div className="space-y-4">
              {/* Barra de Filtros */}
              <ExpenseFilters
                search={searchTerm}
                onSearchChange={setSearchTerm}
                desde={searchParams.get('desde') || ''}
                onDesdeChange={handleDesdeChange}
                hasta={searchParams.get('hasta') || ''}
                onHastaChange={handleHastaChange}
                onClear={handleClearFilters}
                totalResults={filteredExpenses.length}
              />

              {/* Listado de Gastos */}
              <ExpenseList
                expenses={filteredExpenses}
                members={members}
                spaceId={spaceId}
                onExpenseDeleted={() => refresh()}
                onRegisterClick={() => setTab('individual')}
              />
            </div>
          </ResourceState>
        </ResourceState>
      )}
    </div>
  )
}
