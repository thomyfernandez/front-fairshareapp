import { useState, useMemo } from 'react'
import { Button, PageHeader, ResourceState } from '../../components/ui'
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
  const filteredExpenses = useMemo(() => {
    if (!searchTerm.trim()) return expenses
    const term = searchTerm.toLowerCase()
    return expenses.filter(g => {
      const desc = (g.descripcion || '').toLowerCase()
      const payer = (g.pagadorNombre || '').toLowerCase()
      return desc.includes(term) || payer.includes(term)
    })
  }, [expenses, searchTerm])

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
    <div className="space-y-6">
      {/* Cabecera principal */}
      <PageHeader
        title="Gastos"
        description="Gestiona y distribuye los gastos compartidos del espacio."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={tab === 'lista' ? 'secondary' : 'ghost'}
              onClick={() => setTab('lista')}
            >
              Ver listado
            </Button>
            <Button
              variant={tab === 'individual' ? 'primary' : 'secondary'}
              onClick={() => setTab('individual')}
            >
              + Registrar gasto
            </Button>
            <Button
              variant={tab === 'lote' ? 'primary' : 'secondary'}
              onClick={() => setTab('lote')}
            >
              Registrar por lote
            </Button>
          </div>
        }
      />

      {/* Vista 1: Formulario Individual */}
      {tab === 'individual' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary">Nuevo gasto individual</h2>
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary">Carga masiva por lote</h2>
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
