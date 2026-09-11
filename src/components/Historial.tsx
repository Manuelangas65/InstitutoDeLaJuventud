import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'


type HistorialProps = {
  onVolver: () => void
}


type DatosCambio = Record<
  string,
  unknown
>


type Cambio = {
  id_cambio: number
  tabla_afectada: string
  id_registro: number
  accion: string
  datos_anteriores: DatosCambio | null
  datos_nuevos: DatosCambio | null
  fecha_cambio: string

  usuarios: {
    nombre: string
  } | null
}


type CambioCampo = {
  campo: string
  anterior: string
  nuevo: string
}


const etiquetas: Record<string, string> = {
  nombre: 'Nombre',
  sexo: 'Sexo',
  telefono: 'Teléfono',
  correo: 'Correo',
  colonia: 'Colonia',

  edad_al_momento: 'Edad',
  observaciones: 'Observaciones',
  estado: 'Estado',
  id_tipo_atencion: 'Tipo de atención',
}


const camposIgnorados = [
  'id_persona',
  'id_atencion',
  'creado_por',
  'actualizado_por',
  'fecha_creacion',
  'fecha_modificacion',
  'fecha_atencion',
]


function valorLegible(
  valor: unknown
) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return 'Sin información'
  }


  if (
    typeof valor === 'boolean'
  ) {
    return valor
      ? 'Sí'
      : 'No'
  }


  return String(valor)
}


function obtenerCambios(
  anteriores: DatosCambio | null,
  nuevos: DatosCambio | null
): CambioCampo[] {

  if (
    !anteriores ||
    !nuevos
  ) {
    return []
  }


  const cambios: CambioCampo[] = []


  Object
    .keys(nuevos)
    .forEach(
      (campo) => {

        if (
          camposIgnorados.includes(
            campo
          )
        ) {
          return
        }


        const anterior =
          anteriores[campo]

        const nuevo =
          nuevos[campo]


        if (
          JSON.stringify(anterior) !==
          JSON.stringify(nuevo)
        ) {

          cambios.push({
            campo:
              etiquetas[campo] ??
              campo,

            anterior:
              valorLegible(
                anterior
              ),

            nuevo:
              valorLegible(
                nuevo
              ),
          })
        }
      }
    )


  return cambios
}


function nombreAccion(
  accion: string
) {

  switch (accion) {

    case 'editar':
      return 'Edición'

    case 'inactivar':
      return 'Registro dado de baja'

    case 'reactivar':
      return 'Registro reactivado'

    case 'crear':
      return 'Registro creado'

    default:
      return accion
  }
}


function simboloAccion(
  accion: string
) {

  switch (accion) {

    case 'editar':
      return '✎'

    case 'inactivar':
      return '×'

    case 'reactivar':
      return '✓'

    case 'crear':
      return '+'

    default:
      return '•'
  }
}


function nombreTabla(
  tabla: string
) {

  switch (tabla) {

    case 'personas':
      return 'Persona'

    case 'atenciones':
      return 'Atención'

    default:
      return tabla
  }
}


function formatearFecha(
  fecha: string
) {

  return new Date(
    fecha
  ).toLocaleString(
    'es-MX',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  )
}


function Historial({
  onVolver,
}: HistorialProps) {

  const [
    cambios,
    setCambios,
  ] = useState<Cambio[]>([])


  const [
    cargando,
    setCargando,
  ] = useState(true)


  const [
    mensaje,
    setMensaje,
  ] = useState('')


  const [
    busqueda,
    setBusqueda,
  ] = useState('')


  const [
    filtroAccion,
    setFiltroAccion,
  ] = useState('')


  const [
    filtroTabla,
    setFiltroTabla,
  ] = useState('')


  // ==========================================================
  // CARGAR HISTORIAL
  // ==========================================================

  useEffect(() => {

    async function cargarHistorial() {

      setCargando(true)
      setMensaje('')


      const {
        data,
        error,
      } = await supabase
        .from(
          'historial_cambios'
        )
        .select(`
          id_cambio,
          tabla_afectada,
          id_registro,
          accion,
          datos_anteriores,
          datos_nuevos,
          fecha_cambio,

          usuarios (
            nombre
          )
        `)
        .order(
          'fecha_cambio',
          {
            ascending: false,
          }
        )
        .limit(200)


      if (error) {

        console.error(
          'Error cargando historial:',
          error
        )

        setMensaje(
          'No se pudo cargar el historial.'
        )

        setCargando(false)

        return
      }


      const historial =
        (data ?? []).map(
          (registro) => ({
            ...registro,

            usuarios:
              Array.isArray(
                registro.usuarios
              )
                ? registro
                    .usuarios[0]
                    ?? null
                : registro.usuarios,
          })
        )


      setCambios(
        historial as Cambio[]
      )

      setCargando(false)
    }


    cargarHistorial()

  }, [])


  // ==========================================================
  // FILTROS
  // ==========================================================

  const accionesDisponibles =
    useMemo(
      () =>
        Array
          .from(
            new Set(
              cambios.map(
                (cambio) =>
                  cambio.accion
              )
            )
          )
          .sort(),
      [cambios]
    )


  const tablasDisponibles =
    useMemo(
      () =>
        Array
          .from(
            new Set(
              cambios.map(
                (cambio) =>
                  cambio.tabla_afectada
              )
            )
          )
          .sort(),
      [cambios]
    )


  const cambiosFiltrados =
    useMemo(
      () => {

        const termino =
          busqueda
            .trim()
            .toLowerCase()


        return cambios.filter(
          (cambio) => {

            const coincideAccion =
              !filtroAccion ||
              cambio.accion ===
                filtroAccion


            const coincideTabla =
              !filtroTabla ||
              cambio
                .tabla_afectada ===
                filtroTabla


            const textoBusqueda = [
              cambio.usuarios
                ?.nombre
                ?? '',
              nombreTabla(
                cambio.tabla_afectada
              ),
              cambio.id_registro,
              nombreAccion(
                cambio.accion
              ),
            ]
              .join(' ')
              .toLowerCase()


            const coincideBusqueda =
              !termino ||
              textoBusqueda.includes(
                termino
              )


            return (
              coincideAccion &&
              coincideTabla &&
              coincideBusqueda
            )
          }
        )
      },
      [
        cambios,
        busqueda,
        filtroAccion,
        filtroTabla,
      ]
    )


  function limpiarFiltros() {

    setBusqueda('')
    setFiltroAccion('')
    setFiltroTabla('')
  }


  const hayFiltros =
    Boolean(
      busqueda ||
      filtroAccion ||
      filtroTabla
    )


  // ==========================================================
  // INTERFAZ
  // ==========================================================

  return (
    <div className="hi-page">

      {/* ==================================================== */}
      {/* ENCABEZADO */}
      {/* ==================================================== */}

      <div className="hi-header">

        <div>
          <button
            type="button"
            className="hi-back-button"
            onClick={onVolver}
          >
            <span>←</span>
            Volver al inicio
          </button>

          <h1>
            Historial de cambios
          </h1>

          <p>
            Consulta qué modificaciones se realizaron,
            quién las hizo y qué información cambió.
          </p>
        </div>


        <div className="hi-header-badge">

          <span className="hi-header-badge-icon">
            ↺
          </span>

          <div>
            <strong>
              Auditoría
            </strong>

            <small>
              Últimos 200 movimientos
            </small>
          </div>

        </div>

      </div>


      {/* ==================================================== */}
      {/* RESUMEN */}
      {/* ==================================================== */}

      <div className="hi-summary-grid">

        <article className="hi-summary-card">
          <span>Total cargados</span>
          <strong>{cambios.length}</strong>
          <small>
            Movimientos recientes
          </small>
        </article>


        <article className="hi-summary-card">
          <span>Mostrando</span>
          <strong>
            {cambiosFiltrados.length}
          </strong>
          <small>
            Según filtros actuales
          </small>
        </article>


        <article className="hi-summary-card">
          <span>Ediciones</span>
          <strong>
            {
              cambios.filter(
                (cambio) =>
                  cambio.accion ===
                  'editar'
              ).length
            }
          </strong>
          <small>
            Registros modificados
          </small>
        </article>


        <article className="hi-summary-card">
          <span>Bajas</span>
          <strong>
            {
              cambios.filter(
                (cambio) =>
                  cambio.accion ===
                  'inactivar'
              ).length
            }
          </strong>
          <small>
            Registros inactivados
          </small>
        </article>

      </div>


      {/* ==================================================== */}
      {/* FILTROS */}
      {/* ==================================================== */}

      <section className="hi-card hi-filter-card">

        <div className="hi-section-heading">

          <div>
            <h2>
              Buscar movimientos
            </h2>

            <p>
              Filtra por usuario, registro,
              acción o tipo de información.
            </p>
          </div>


          {hayFiltros && (
            <button
              type="button"
              className="hi-clear-button"
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </button>
          )}

        </div>


        <div className="hi-filter-grid">

          <div className="hi-field hi-search-field">

            <label htmlFor="historialBusqueda">
              Buscar
            </label>

            <input
              id="historialBusqueda"
              type="text"
              value={busqueda}
              onChange={(e) =>
                setBusqueda(
                  e.target.value
                )
              }
              placeholder="Usuario, registro o acción..."
            />

          </div>


          <div className="hi-field">

            <label htmlFor="filtroAccion">
              Acción
            </label>

            <select
              id="filtroAccion"
              value={filtroAccion}
              onChange={(e) =>
                setFiltroAccion(
                  e.target.value
                )
              }
            >
              <option value="">
                Todas
              </option>

              {accionesDisponibles.map(
                (accion) => (
                  <option
                    key={accion}
                    value={accion}
                  >
                    {nombreAccion(
                      accion
                    )}
                  </option>
                )
              )}
            </select>

          </div>


          <div className="hi-field">

            <label htmlFor="filtroTabla">
              Registro
            </label>

            <select
              id="filtroTabla"
              value={filtroTabla}
              onChange={(e) =>
                setFiltroTabla(
                  e.target.value
                )
              }
            >
              <option value="">
                Todos
              </option>

              {tablasDisponibles.map(
                (tabla) => (
                  <option
                    key={tabla}
                    value={tabla}
                  >
                    {nombreTabla(
                      tabla
                    )}
                  </option>
                )
              )}
            </select>

          </div>

        </div>

      </section>


      {/* ==================================================== */}
      {/* ESTADOS */}
      {/* ==================================================== */}

      {cargando && (
        <div className="hi-status">
          <span className="hi-loader" />

          <div>
            <strong>
              Cargando historial...
            </strong>

            <p>
              Estamos consultando los movimientos recientes.
            </p>
          </div>
        </div>
      )}


      {mensaje && (
        <div className="hi-status hi-status-error">

          <span className="hi-status-icon">
            !
          </span>

          <div>
            <strong>
              No se pudo completar la consulta
            </strong>

            <p>{mensaje}</p>
          </div>

        </div>
      )}


      {!cargando &&
        !mensaje &&
        cambios.length === 0 && (

          <div className="hi-empty">

            <div className="hi-empty-icon">
              ↺
            </div>

            <strong>
              Todavía no hay cambios registrados
            </strong>

            <p>
              Cuando se realicen modificaciones,
              aparecerán en esta sección.
            </p>

          </div>
        )}


      {!cargando &&
        !mensaje &&
        cambios.length > 0 &&
        cambiosFiltrados.length === 0 && (

          <div className="hi-empty">

            <div className="hi-empty-icon">
              ⌕
            </div>

            <strong>
              No encontramos coincidencias
            </strong>

            <p>
              Prueba con otros términos o limpia
              los filtros seleccionados.
            </p>

            <button
              type="button"
              className="hi-primary-button"
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </button>

          </div>
        )}


      {/* ==================================================== */}
      {/* HISTORIAL */}
      {/* ==================================================== */}

      {!cargando &&
        !mensaje &&
        cambiosFiltrados.length > 0 && (

          <section className="hi-history">

            <div className="hi-history-heading">

              <div>
                <h2>
                  Movimientos registrados
                </h2>

                <p>
                  Ordenados del más reciente
                  al más antiguo.
                </p>
              </div>

              <span>
                {cambiosFiltrados.length}
                {' '}
                {cambiosFiltrados.length === 1
                  ? 'movimiento'
                  : 'movimientos'}
              </span>

            </div>


            <div className="hi-timeline">

              {cambiosFiltrados.map(
                (cambio) => {

                  const diferencias =
                    obtenerCambios(
                      cambio
                        .datos_anteriores,
                      cambio
                        .datos_nuevos
                    )


                  return (
                    <article
                      key={
                        cambio.id_cambio
                      }
                      className={`hi-change hi-change-${cambio.accion}`}
                    >

                      <div className="hi-timeline-marker">
                        <span>
                          {simboloAccion(
                            cambio.accion
                          )}
                        </span>
                      </div>


                      <div className="hi-change-card">

                        <div className="hi-change-header">

                          <div className="hi-change-title">

                            <span className="hi-action-pill">
                              {nombreAccion(
                                cambio.accion
                              )}
                            </span>

                            <h3>
                              {nombreTabla(
                                cambio
                                  .tabla_afectada
                              )}
                              {' '}
                              #{cambio.id_registro}
                            </h3>

                          </div>


                          <time
                            dateTime={
                              cambio.fecha_cambio
                            }
                          >
                            {formatearFecha(
                              cambio.fecha_cambio
                            )}
                          </time>

                        </div>


                        <div className="hi-meta">

                          <div>
                            <span className="hi-meta-label">
                              Usuario
                            </span>

                            <strong>
                              {
                                cambio
                                  .usuarios
                                  ?.nombre
                                ??
                                'Usuario no identificado'
                              }
                            </strong>
                          </div>


                          <div>
                            <span className="hi-meta-label">
                              Registro
                            </span>

                            <strong>
                              {nombreTabla(
                                cambio
                                  .tabla_afectada
                              )}
                            </strong>
                          </div>


                          <div>
                            <span className="hi-meta-label">
                              ID
                            </span>

                            <strong>
                              #{cambio.id_registro}
                            </strong>
                          </div>

                        </div>


                        {diferencias.length > 0 ? (

                          <div className="hi-differences">

                            <div className="hi-differences-heading">
                              <strong>
                                Cambios realizados
                              </strong>

                              <span>
                                {diferencias.length}
                                {' '}
                                {diferencias.length === 1
                                  ? 'campo'
                                  : 'campos'}
                              </span>
                            </div>


                            <div className="hi-differences-list">

                              {diferencias.map(
                                (
                                  diferencia,
                                  index
                                ) => (

                                  <div
                                    key={
                                      `${cambio.id_cambio}-${diferencia.campo}-${index}`
                                    }
                                    className="hi-difference"
                                  >

                                    <strong className="hi-difference-name">
                                      {
                                        diferencia
                                          .campo
                                      }
                                    </strong>


                                    <div className="hi-before-after">

                                      <div className="hi-value hi-value-before">

                                        <span>
                                          Antes
                                        </span>

                                        <p>
                                          {
                                            diferencia
                                              .anterior
                                          }
                                        </p>

                                      </div>


                                      <div className="hi-change-arrow">
                                        →
                                      </div>


                                      <div className="hi-value hi-value-after">

                                        <span>
                                          Después
                                        </span>

                                        <p>
                                          {
                                            diferencia
                                              .nuevo
                                          }
                                        </p>

                                      </div>

                                    </div>

                                  </div>
                                )
                              )}

                            </div>

                          </div>

                        ) : (

                          <div className="hi-no-differences">
                            <span>ⓘ</span>

                            <p>
                              Este movimiento no contiene
                              cambios de campos visibles para mostrar.
                            </p>
                          </div>

                        )}

                      </div>

                    </article>
                  )
                }
              )}

            </div>

          </section>
        )}


      {/* ==================================================== */}
      {/* ESTILOS */}
      {/* ==================================================== */}

      <style>{`

        .hi-page {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 8px 0 40px;
          box-sizing: border-box;
        }

        .hi-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .hi-header h1 {
          margin: 14px 0 8px;
          color: var(--text);
          font-size: clamp(28px, 4vw, 38px);
          line-height: 1.1;
          letter-spacing: -0.8px;
        }

        .hi-header p {
          max-width: 680px;
          margin: 0;
          color: var(--text-soft);
          font-size: 15px;
          line-height: 1.6;
        }

        .hi-back-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0;
          border: none;
          background: transparent;
          color: var(--primary);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .hi-back-button:hover {
          opacity: 0.75;
        }

        .hi-back-button span {
          font-size: 18px;
        }

        .hi-header-badge {
          display: flex;
          min-width: 210px;
          flex-shrink: 0;
          align-items: center;
          gap: 12px;
          padding: 14px 17px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .hi-header-badge-icon {
          display: flex;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 12px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 21px;
          font-weight: 800;
        }

        .hi-header-badge > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .hi-header-badge strong {
          color: var(--text);
          font-size: 13px;
        }

        .hi-header-badge small {
          color: var(--text-soft);
          font-size: 11px;
        }

        .hi-summary-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 13px;
          margin-bottom: 20px;
        }

        .hi-summary-card {
          padding: 17px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .hi-summary-card > span {
          display: block;
          margin-bottom: 9px;
          color: var(--text-soft);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .hi-summary-card strong {
          display: block;
          margin-bottom: 4px;
          color: var(--text);
          font-size: 26px;
          line-height: 1;
        }

        .hi-summary-card small {
          color: var(--text-soft);
          font-size: 9px;
        }

        .hi-card {
          border: 1px solid var(--border);
          border-radius: 20px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .hi-filter-card {
          margin-bottom: 23px;
          padding: 24px 26px;
        }

        .hi-section-heading,
        .hi-history-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 20px;
        }

        .hi-section-heading h2,
        .hi-history-heading h2 {
          margin: 0 0 4px;
          color: var(--text);
          font-size: 17px;
        }

        .hi-section-heading p,
        .hi-history-heading p {
          margin: 0;
          color: var(--text-soft);
          font-size: 11px;
          line-height: 1.5;
        }

        .hi-clear-button {
          flex-shrink: 0;
          padding: 7px 10px;
          border: none;
          background: transparent;
          color: var(--primary);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .hi-filter-grid {
          display: grid;
          grid-template-columns:
            minmax(260px, 1.5fr)
            minmax(150px, 0.7fr)
            minmax(150px, 0.7fr);
          gap: 13px;
        }

        .hi-field label {
          display: block;
          margin-bottom: 7px;
          color: var(--text);
          font-size: 11px;
          font-weight: 700;
        }

        .hi-field input,
        .hi-field select {
          width: 100%;
          box-sizing: border-box;
        }

        .hi-field input:focus,
        .hi-field select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow:
            0 0 0 3px
            color-mix(
              in srgb,
              var(--primary) 13%,
              transparent
            );
        }

        .hi-history {
          margin-top: 5px;
        }

        .hi-history-heading {
          margin: 0 2px 17px;
        }

        .hi-history-heading > span {
          padding: 6px 10px;
          border-radius: 999px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 10px;
          font-weight: 700;
        }

        .hi-timeline {
          position: relative;
          display: grid;
          gap: 16px;
        }

        .hi-timeline::before {
          position: absolute;
          top: 25px;
          bottom: 25px;
          left: 21px;
          width: 1px;
          background: var(--border);
          content: '';
        }

        .hi-change {
          position: relative;
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 12px;
        }

        .hi-timeline-marker {
          position: relative;
          z-index: 1;
          display: flex;
          padding-top: 18px;
          justify-content: center;
        }

        .hi-timeline-marker span {
          display: flex;
          width: 31px;
          height: 31px;
          align-items: center;
          justify-content: center;
          border: 4px solid var(--bg);
          border-radius: 50%;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 13px;
          font-weight: 900;
          box-sizing: content-box;
        }

        .hi-change-inactivar .hi-timeline-marker span {
          color: var(--danger);
        }

        .hi-change-card {
          min-width: 0;
          padding: 20px;
          border: 1px solid var(--border);
          border-radius: 17px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .hi-change-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--border);
        }

        .hi-change-title {
          min-width: 0;
        }

        .hi-action-pill {
          display: inline-flex;
          margin-bottom: 7px;
          padding: 5px 8px;
          border-radius: 999px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 9px;
          font-weight: 800;
        }

        .hi-change-inactivar .hi-action-pill {
          background:
            color-mix(
              in srgb,
              var(--danger) 8%,
              var(--surface)
            );
          color: var(--danger);
        }

        .hi-change-header h3 {
          margin: 0;
          color: var(--text);
          font-size: 15px;
        }

        .hi-change-header time {
          flex-shrink: 0;
          color: var(--text-soft);
          font-size: 10px;
          line-height: 1.4;
          text-align: right;
        }

        .hi-meta {
          display: grid;
          grid-template-columns:
            1.5fr 1fr 0.5fr;
          gap: 12px;
          padding: 16px 0;
        }

        .hi-meta > div {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 3px;
        }

        .hi-meta-label {
          color: var(--text-soft);
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .hi-meta strong {
          overflow: hidden;
          color: var(--text);
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hi-differences {
          padding-top: 14px;
          border-top: 1px solid var(--border);
        }

        .hi-differences-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 11px;
        }

        .hi-differences-heading strong {
          color: var(--text);
          font-size: 11px;
        }

        .hi-differences-heading span {
          padding: 4px 7px;
          border-radius: 999px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 8px;
          font-weight: 800;
        }

        .hi-differences-list {
          display: grid;
          gap: 9px;
        }

        .hi-difference {
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 11px;
          background: var(--bg);
        }

        .hi-difference-name {
          display: block;
          margin-bottom: 9px;
          color: var(--text);
          font-size: 10px;
        }

        .hi-before-after {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            24px
            minmax(0, 1fr);
          align-items: center;
          gap: 8px;
        }

        .hi-value {
          min-width: 0;
          padding: 9px 10px;
          border-radius: 9px;
          background: var(--surface);
        }

        .hi-value span {
          display: block;
          margin-bottom: 4px;
          color: var(--text-soft);
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .hi-value p {
          overflow-wrap: anywhere;
          margin: 0;
          color: var(--text);
          font-size: 10px;
          line-height: 1.45;
        }

        .hi-value-after {
          background: var(--surface-soft);
        }

        .hi-value-after span {
          color: var(--primary);
        }

        .hi-change-arrow {
          color: var(--primary);
          font-size: 14px;
          font-weight: 800;
          text-align: center;
        }

        .hi-no-differences {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 11px 12px;
          border-radius: 10px;
          background: var(--surface-soft);
        }

        .hi-no-differences span {
          color: var(--primary);
          font-size: 11px;
          font-weight: 800;
        }

        .hi-no-differences p {
          margin: 0;
          color: var(--text-soft);
          font-size: 10px;
          line-height: 1.45;
        }

        .hi-status {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
          padding: 15px 17px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: var(--surface);
        }

        .hi-status strong {
          display: block;
          margin-bottom: 3px;
          color: var(--text);
          font-size: 11px;
        }

        .hi-status p {
          margin: 0;
          color: var(--text-soft);
          font-size: 10px;
        }

        .hi-status-error {
          border-color:
            color-mix(
              in srgb,
              var(--danger) 35%,
              var(--border)
            );
        }

        .hi-status-icon {
          display: flex;
          width: 28px;
          height: 28px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--danger);
          color: white;
          font-size: 11px;
          font-weight: 900;
        }

        .hi-loader {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: hi-spin 0.8s linear infinite;
        }

        @keyframes hi-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .hi-empty {
          display: flex;
          min-height: 260px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 30px;
          border: 1px dashed var(--border);
          border-radius: 18px;
          background: var(--surface);
          text-align: center;
        }

        .hi-empty-icon {
          display: flex;
          width: 50px;
          height: 50px;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          border-radius: 15px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 20px;
          font-weight: 800;
        }

        .hi-empty strong {
          color: var(--text);
          font-size: 13px;
        }

        .hi-empty p {
          max-width: 340px;
          margin: 6px 0 0;
          color: var(--text-soft);
          font-size: 11px;
          line-height: 1.5;
        }

        .hi-primary-button {
          margin-top: 14px;
          padding: 9px 14px;
          border: 1px solid var(--primary);
          border-radius: 9px;
          background: var(--primary);
          color: white;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 850px) {

          .hi-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .hi-header-badge {
            display: none;
          }

          .hi-summary-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .hi-filter-grid {
            grid-template-columns: 1fr 1fr;
          }

          .hi-search-field {
            grid-column: 1 / -1;
          }

          .hi-meta {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

        }

        @media (max-width: 600px) {

          .hi-filter-card {
            padding: 20px;
            border-radius: 16px;
          }

          .hi-filter-grid {
            grid-template-columns: 1fr;
          }

          .hi-search-field {
            grid-column: auto;
          }

          .hi-section-heading {
            flex-direction: column;
          }

          .hi-change {
            grid-template-columns: 32px 1fr;
            gap: 8px;
          }

          .hi-timeline::before {
            left: 15px;
          }

          .hi-timeline-marker span {
            width: 25px;
            height: 25px;
            border-width: 3px;
          }

          .hi-change-card {
            padding: 16px;
          }

          .hi-change-header {
            flex-direction: column;
          }

          .hi-change-header time {
            text-align: left;
          }

          .hi-meta {
            grid-template-columns: 1fr;
          }

          .hi-before-after {
            grid-template-columns: 1fr;
          }

          .hi-change-arrow {
            transform: rotate(90deg);
          }

        }

        @media (max-width: 430px) {

          .hi-summary-grid {
            grid-template-columns: 1fr;
          }

          .hi-history-heading {
            align-items: flex-start;
            flex-direction: column;
          }

        }

      `}</style>

    </div>
  )
}


export default Historial
