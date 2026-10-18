import { Button, Field, Icon } from '../../components/ui'

/**
 * ExpenseFilters
 * Componente para filtrar y buscar gastos en el espacio.
 * Soporta:
 * - Búsqueda de texto en tiempo real (por descripción o pagador).
 * - Rango de fechas (desde / hasta).
 * - Filtro opcional por estado (Todos, Pendiente, Liquidado).
 * - Botón para restablecer filtros.
 */
export function ExpenseFilters({
  search = '',
  onSearchChange,
  desde = '',
  onDesdeChange,
  hasta = '',
  onHastaChange,
  estado = '',
  onEstadoChange,
  onClear,
  totalResults,
  className = '',
}) {
  const hasActiveFilters = Boolean(search || desde || hasta || estado)

  return (
    <div className={`expense-filters ${className}`}>
      <div className="expense-filters__fields">
        {/* Buscador de texto */}
        <div className="lg:col-span-1">
          <Field label="Buscar gasto">
            <div className="relative">
              <input
                type="search"
                placeholder="Descripción, concepto..."
                value={search}
                onChange={e => onSearchChange?.(e.target.value)}
                className="ui-input pr-12"
                aria-label="Buscar gastos por texto"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.('')}
                  className="expense-filters__clear"
                  aria-label="Limpiar búsqueda"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          </Field>
        </div>

        {/* Filtro fecha desde */}
        <div>
          <Field label="Desde" name="desde">
            <input
              type="date"
              value={desde}
              onChange={e => onDesdeChange?.(e.target.value)}
              className="ui-input"
              aria-label="Fecha desde"
            />
          </Field>
        </div>

        {/* Filtro fecha hasta */}
        <div>
          <Field label="Hasta" name="hasta">
            <input
              type="date"
              value={hasta}
              onChange={e => onHastaChange?.(e.target.value)}
              className="ui-input"
              aria-label="Fecha hasta"
            />
          </Field>
        </div>

        {/* Estado y Limpiar */}
        <div className="flex items-center gap-2">
          {onEstadoChange && (
            <div className="flex-1">
              <Field label="Estado">
                <select
                  value={estado}
                  onChange={e => onEstadoChange(e.target.value)}
                  className="ui-input"
                  aria-label="Filtrar por estado"
                >
                  <option value="">Todos</option>
                  <option value="PENDIENTE">Pendientes</option>
                  <option value="LIQUIDADO">Liquidados</option>
                </select>
              </Field>
            </div>
          )}

          {hasActiveFilters && onClear && (
            <div className="shrink-0 self-end">
              <Button
                variant="secondary"
                onClick={onClear}
                className="min-h-[44px] text-xs px-3"
                aria-label="Limpiar todos los filtros"
              >
                <Icon name="close" size={14} />
                Limpiar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Barra de estado de filtros activos */}
      {hasActiveFilters && (
        <div className="expense-filters__summary">
          <span>
            Filtros activos:{' '}
            {[
              search ? `Texto: "${search}"` : '',
              desde ? `Desde: ${desde}` : '',
              hasta ? `Hasta: ${hasta}` : '',
              estado ? `Estado: ${estado}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          {totalResults !== undefined && (
            <span className="font-medium text-primary">
              {totalResults} {totalResults === 1 ? 'resultado encontrado' : 'resultados encontrados'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
