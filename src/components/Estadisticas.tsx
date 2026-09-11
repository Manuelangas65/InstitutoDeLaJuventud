/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

import * as XLSX from 'xlsx'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'


type EstadisticasProps = {
  onVolver: () => void
}


type JsPDFConAutoTable = InstanceType<typeof jsPDF> & {
  lastAutoTable: {
    finalY: number
  }
}


type RegistroEstadistica = {
  id_atencion: number
  id_persona: number
  fecha_atencion: string
  edad_al_momento: number
  observaciones: string | null

  personas: {
    nombre: string
    sexo: string
    telefono: string
    correo: string | null
    colonia: string | null
  }

  tipos_atencion: {
    nombre: string
  }

  canalizaciones: {
    destinos_canalizacion: {
      nombre: string
    } | null
  }[]
}


type ConteoTipo = {
  nombre: string
  cantidad: number
}


// ==========================================================
// OBTENER TRIMESTRE ACTUAL
// ==========================================================

function obtenerTrimestreActual() {
  const ahora = new Date()

  const año = ahora.getFullYear()
  const mes = ahora.getMonth()

  const trimestre = Math.floor(mes / 3)
  const mesInicio = trimestre * 3

  const inicio = new Date(
    año,
    mesInicio,
    1
  )

  const fin = new Date(
    año,
    mesInicio + 3,
    0
  )


  function formatoFecha(fecha: Date) {
    const año = fecha.getFullYear()

    const mes = String(
      fecha.getMonth() + 1
    ).padStart(2, '0')

    const dia = String(
      fecha.getDate()
    ).padStart(2, '0')

    return `${año}-${mes}-${dia}`
  }


  return {
    inicio: formatoFecha(inicio),
    fin: formatoFecha(fin),
  }
}


// ==========================================================
// FORMATEAR FECHA PARA MOSTRAR
// ==========================================================

function formatearFecha(
  fecha: string
) {
  return new Date(
    fecha
  ).toLocaleString('es-MX')
}


// ==========================================================
// COMPONENTE
// ==========================================================

function Estadisticas({
  onVolver,
}: EstadisticasProps) {

  const trimestreActual =
    obtenerTrimestreActual()


  // ========================================================
  // FILTROS
  // ========================================================

  const [fechaInicio, setFechaInicio] =
    useState(
      trimestreActual.inicio
    )

  const [fechaFin, setFechaFin] =
    useState(
      trimestreActual.fin
    )


  // ========================================================
  // RESULTADOS
  // ========================================================

  const [
    registros,
    setRegistros,
  ] = useState<
    RegistroEstadistica[]
  >([])


  const [
    totalAtenciones,
    setTotalAtenciones,
  ] = useState(0)


  const [
    hombres,
    setHombres,
  ] = useState(0)


  const [
    mujeres,
    setMujeres,
  ] = useState(0)


  


  const [
    porTipo,
    setPorTipo,
  ] = useState<
    ConteoTipo[]
  >([])


  const [
    cargando,
    setCargando,
  ] = useState(false)


  const [
    mensaje,
    setMensaje,
  ] = useState('')


  // ========================================================
  // CARGAR ESTADÍSTICAS
  // ========================================================

  async function cargarEstadisticas() {

    if (
      !fechaInicio ||
      !fechaFin
    ) {
      setMensaje(
        'Selecciona una fecha inicial y una fecha final.'
      )
      return
    }


    if (
      fechaInicio >
      fechaFin
    ) {
      setMensaje(
        'La fecha inicial no puede ser posterior a la fecha final.'
      )
      return
    }


    setCargando(true)
    setMensaje('')


    try {

      const {
        data,
        error,
      } = await supabase
        .from('atenciones')
        .select(`
          id_atencion,
          id_persona,
          fecha_atencion,
          edad_al_momento,
          observaciones,

          personas!inner (
            nombre,
            sexo,
            telefono,
            correo,
            colonia
          ),

          tipos_atencion!inner (
            nombre
          ),

          canalizaciones (
            destinos_canalizacion (
              nombre
            )
          )
        `)

        .eq(
          'estado',
          'activo'
        )

        .gte(
          'fecha_atencion',
          `${fechaInicio}T00:00:00`
        )

        .lte(
          'fecha_atencion',
          `${fechaFin}T23:59:59.999`
        )

        .order(
          'fecha_atencion',
          {
            ascending: true,
          }
        )


      if (error) {

        console.error(
          'Error obteniendo estadísticas:',
          error
        )

        throw new Error(
          'No se pudieron obtener las estadísticas.'
        )
      }


      const datos: RegistroEstadistica[] = (data ?? [])
  .map((registro) => {
    const persona = Array.isArray(registro.personas)
      ? registro.personas[0]
      : registro.personas

    const tipoAtencion = Array.isArray(registro.tipos_atencion)
      ? registro.tipos_atencion[0]
      : registro.tipos_atencion

    const canalizaciones = (registro.canalizaciones ?? []).map(
      (canalizacion) => ({
        destinos_canalizacion: Array.isArray(
          canalizacion.destinos_canalizacion
        )
          ? canalizacion.destinos_canalizacion[0] ?? null
          : canalizacion.destinos_canalizacion ?? null,
      })
    )

    return {
      id_atencion: registro.id_atencion,
      id_persona: registro.id_persona,
      fecha_atencion: registro.fecha_atencion,
      edad_al_momento: registro.edad_al_momento,
      observaciones: registro.observaciones,

      personas: {
        nombre: persona?.nombre ?? '',
        sexo: persona?.sexo ?? '',
        telefono: persona?.telefono ?? '',
        correo: persona?.correo ?? null,
        colonia: persona?.colonia ?? null,
      },

      tipos_atencion: {
        nombre: tipoAtencion?.nombre ?? '',
      },

      canalizaciones,
    }
  })


      setRegistros(datos)


      // ====================================================
      // TOTAL
      // ====================================================

      setTotalAtenciones(
        datos.length
      )


      // ====================================================
      // HOMBRES
      // ====================================================

      const totalHombres =
        datos.filter(
          (registro) =>
            registro
              .personas
              .sexo ===
            'Hombre'
        ).length


      setHombres(
        totalHombres
      )


      // ====================================================
      // MUJERES
      // ====================================================

      const totalMujeres =
        datos.filter(
          (registro) =>
            registro
              .personas
              .sexo ===
            'Mujer'
        ).length


      setMujeres(
        totalMujeres
      )


      // ====================================================
      // PERSONAS DIFERENTES
      // ====================================================



      // ====================================================
      // ATENCIONES POR TIPO
      // ====================================================

      const conteos:
        Record<
          string,
          number
        > = {}


      datos.forEach(
        (registro) => {

          const nombre =
            registro
              .tipos_atencion
              .nombre


          conteos[nombre] =
            (
              conteos[nombre]
              ?? 0
            ) + 1
        }
      )


      const arreglo =
        Object
          .entries(
            conteos
          )

          .map(
            ([
              nombre,
              cantidad,
            ]) => ({
              nombre,
              cantidad,
            })
          )

          .sort(
            (a, b) =>
              b.cantidad -
              a.cantidad
          )


      setPorTipo(
        arreglo
      )


      if (
        datos.length === 0
      ) {
        setMensaje(
          'No hay atenciones registradas durante este periodo.'
        )
      }

    }

    catch (error) {

      console.error(
        error
      )


      if (
        error instanceof Error
      ) {
        setMensaje(
          error.message
        )
      }

      else {
        setMensaje(
          'Ocurrió un error inesperado.'
        )
      }

    }

    finally {
      setCargando(
        false
      )
    }
  }


  // ========================================================
  // CARGAR AL ENTRAR
  // ========================================================

  useEffect(() => {
    cargarEstadisticas()
  }, [])


  // ========================================================
  // TRIMESTRE ACTUAL
  // ========================================================

  function seleccionarTrimestreActual() {

    const trimestre =
      obtenerTrimestreActual()


    setFechaInicio(
      trimestre.inicio
    )

    setFechaFin(
      trimestre.fin
    )
  }


  // ========================================================
  // AÑO ACTUAL
  // ========================================================

  function seleccionarAñoActual() {

    const año =
      new Date()
        .getFullYear()


    setFechaInicio(
      `${año}-01-01`
    )


    setFechaFin(
      `${año}-12-31`
    )
  }


  // ========================================================
  // CANALIZACIONES
  // ========================================================

  const detalleCanalizaciones =
    registros.flatMap(
      (registro) =>
        registro.canalizaciones
          .filter(
            (canalizacion) =>
              canalizacion
                .destinos_canalizacion
                ?.nombre
          )
          .map(
            (canalizacion) => ({
              idAtencion: registro.id_atencion,
              idPersona: registro.id_persona,
              fecha: registro.fecha_atencion,
              nombre: registro.personas.nombre,
              telefono: registro.personas.telefono,
              correo: registro.personas.correo,
              colonia: registro.personas.colonia,
              sexo: registro.personas.sexo,
              edad: registro.edad_al_momento,
              tipoAtencion:
                registro.tipos_atencion.nombre,
              destino:
                canalizacion
                  .destinos_canalizacion
                  ?.nombre
                ?? 'Sin destino',
            })
          )
    )


  const personasCanalizadas =
    new Set(
      detalleCanalizaciones.map(
        (item) => item.idPersona
      )
    ).size


  const totalDestinosCanalizacion =
    detalleCanalizaciones.length


  // ========================================================
  // EXPORTAR EXCEL
  // ========================================================

  function exportarExcel() {

    if (
      registros.length === 0
    ) {
      setMensaje(
        'No hay información para exportar.'
      )
      return
    }


    // ------------------------------------------------------
    // HOJA 1 - RESUMEN
    // ------------------------------------------------------

    const resumen = [
      {
        Concepto:
          'Periodo inicial',

        Valor:
          fechaInicio,
      },

      {
        Concepto:
          'Periodo final',

        Valor:
          fechaFin,
      },

      {
        Concepto:
          'Total de atenciones',

        Valor:
          totalAtenciones,
      },

      {
        Concepto:
          'Hombres',

        Valor:
          hombres,
      },

      {
        Concepto:
          'Mujeres',

        Valor:
          mujeres,
      },

      {
        Concepto:
          'Personas canalizadas',

        Valor:
          personasCanalizadas,
      },

      {
        Concepto:
          'Canalizaciones / destinos',

        Valor:
          totalDestinosCanalizacion,
      },
    ]


    const hojaResumen =
      XLSX.utils.json_to_sheet(
        resumen
      )


    // ------------------------------------------------------
    // HOJA 2 - POR TIPO
    // ------------------------------------------------------

    const resumenTipos =
      porTipo.map(
        (tipo) => ({
          'Tipo de atención':
            tipo.nombre,

          Cantidad:
            tipo.cantidad,
        })
      )


    const hojaTipos =
      XLSX.utils.json_to_sheet(
        resumenTipos
      )


    // ------------------------------------------------------
    // HOJA 3 - DETALLE
    // ------------------------------------------------------

    const detalle =
      registros.map(
        (registro) => {

          const destinos =
            registro
              .canalizaciones
              ?.map(
                (canalizacion) =>
                  canalizacion
                    .destinos_canalizacion
                    ?.nombre
              )
              .filter(
                Boolean
              )
              .join(', ')
              || ''


          return {
            'ID atención':
              registro.id_atencion,

            Fecha:
              formatearFecha(
                registro.fecha_atencion
              ),

            Nombre:
              registro
                .personas
                .nombre,

            Sexo:
              registro
                .personas
                .sexo,

            Edad:
              registro
                .edad_al_momento,

            Teléfono:
              registro
                .personas
                .telefono,

            Correo:
              registro
                .personas
                .correo
              ?? '',

            Colonia:
              registro
                .personas
                .colonia
              ?? '',

            'Tipo de atención':
              registro
                .tipos_atencion
                .nombre,

            Canalización:
              destinos,

            Observaciones:
              registro
                .observaciones
              ?? '',
          }
        }
      )


    const hojaDetalle =
      XLSX.utils.json_to_sheet(
        detalle
      )


    // ------------------------------------------------------
    // HOJA 4 - CANALIZACIONES
    // ------------------------------------------------------

    const canalizacionesExcel =
      detalleCanalizaciones.map(
        (item) => ({
          'ID atención':
            item.idAtencion,

          Fecha:
            formatearFecha(
              item.fecha
            ),

          Nombre:
            item.nombre,

          Sexo:
            item.sexo,

          Edad:
            item.edad,

          Teléfono:
            item.telefono,

          Correo:
            item.correo ?? '',

          Colonia:
            item.colonia ?? '',

          'Tipo de atención':
            item.tipoAtencion,

          'Destino de canalización':
            item.destino,
        })
      )


    const hojaCanalizaciones =
      XLSX.utils.json_to_sheet(
        canalizacionesExcel
      )


    // ------------------------------------------------------
    // CREAR LIBRO
    // ------------------------------------------------------

    const libro =
      XLSX.utils.book_new()


    XLSX.utils.book_append_sheet(
      libro,
      hojaResumen,
      'Resumen'
    )


    XLSX.utils.book_append_sheet(
      libro,
      hojaTipos,
      'Por tipo'
    )


    XLSX.utils.book_append_sheet(
      libro,
      hojaDetalle,
      'Detalle'
    )


    XLSX.utils.book_append_sheet(
      libro,
      hojaCanalizaciones,
      'Canalizaciones'
    )


    XLSX.writeFile(
      libro,
      `reporte_atenciones_${fechaInicio}_${fechaFin}.xlsx`
    )
  }


  // ========================================================
  // GENERAR PDF
  // ========================================================

  function generarPDF() {

    if (
      registros.length === 0
    ) {
      setMensaje(
        'No hay información para generar el PDF.'
      )
      return
    }


    const doc =
      new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })


    const anchoPagina =
      doc.internal.pageSize.getWidth()

    const margen = 14


    doc.setFontSize(18)
    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.text(
      'Reporte de Atenciones',
      margen,
      18
    )


    doc.setFontSize(10)
    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.text(
      `Periodo: ${fechaInicio} al ${fechaFin}`,
      margen,
      26
    )


    // ------------------------------------------------------
    // RESUMEN
    // ------------------------------------------------------

    autoTable(
      doc,
      {
        startY: 32,

        head: [
          [
            'Concepto',
            'Cantidad',
          ],
        ],

        body: [
          [
            'Total de atenciones',
            totalAtenciones,
          ],

          [
            'Personas atendidas',
            personasUnicas,
          ],

          [
            'Hombres',
            hombres,
          ],

          [
            'Mujeres',
            mujeres,
          ],

          [
            'Personas canalizadas',
            personasCanalizadas,
          ],

          [
            'Canalizaciones / destinos',
            totalDestinosCanalizacion,
          ],
        ],

        styles: {
          fontSize: 9,
        },
      }
    )


    // ------------------------------------------------------
    // GRÁFICA RESUMEN
    // ------------------------------------------------------

    let yGrafica =
      (
        doc as JsPDFConAutoTable
      )
        .lastAutoTable
        .finalY
      + 11


    const tiposGrafica =
      [...porTipo]
        .sort(
          (a, b) =>
            b.cantidad -
            a.cantidad
        )
        .slice(0, 8)


    const altoGrafica =
      16 +
      (
        Math.max(
          tiposGrafica.length,
          1
        ) * 9
      )


    if (
      yGrafica +
      altoGrafica >
      278
    ) {
      doc.addPage()
      yGrafica = 18
    }


    doc.setFontSize(12)
    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.text(
      'Resumen gráfico por tipo de atención',
      margen,
      yGrafica
    )


    if (
      tiposGrafica.length === 0
    ) {
      doc.setFontSize(9)
      doc.setFont(
        'helvetica',
        'normal'
      )

      doc.text(
        'No hay información por tipo para representar.',
        margen,
        yGrafica + 8
      )
    } else {

      const maxGrafica =
        Math.max(
          ...tiposGrafica.map(
            (tipo) =>
              tipo.cantidad
          ),
          1
        )

      const xEtiqueta =
        margen

      const anchoEtiqueta =
        59

      const xBarra =
        xEtiqueta +
        anchoEtiqueta +
        3

      const anchoMaximoBarra =
        anchoPagina -
        xBarra -
        margen -
        14

      let y =
        yGrafica + 9


      tiposGrafica.forEach(
        (tipo) => {

          const etiqueta =
            tipo.nombre.length > 28
              ? `${tipo.nombre.slice(0, 27)}…`
              : tipo.nombre

          const anchoBarra =
            (
              tipo.cantidad /
              maxGrafica
            ) *
            anchoMaximoBarra


          doc.setFontSize(7.5)
          doc.setFont(
            'helvetica',
            'normal'
          )

          doc.text(
            etiqueta,
            xEtiqueta,
            y + 3
          )


          doc.setDrawColor(
            225,
            225,
            225
          )

          doc.setFillColor(
            242,
            242,
            242
          )

          doc.roundedRect(
            xBarra,
            y,
            anchoMaximoBarra,
            4.2,
            1,
            1,
            'FD'
          )


          doc.setFillColor(
            186,
            64,
            129
          )

          doc.roundedRect(
            xBarra,
            y,
            Math.max(
              anchoBarra,
              1.2
            ),
            4.2,
            1,
            1,
            'F'
          )


          doc.setFontSize(7.5)
          doc.setFont(
            'helvetica',
            'bold'
          )

          doc.text(
            String(
              tipo.cantidad
            ),
            xBarra +
              anchoMaximoBarra +
              3,
            y + 3
          )


          y += 9
        }
      )
    }


    // ------------------------------------------------------
    // TABLA POR TIPO
    // ------------------------------------------------------

    let inicioTipos =
      yGrafica +
      altoGrafica +
      3


    if (
      inicioTipos > 260
    ) {
      doc.addPage()
      inicioTipos = 18
    }


    autoTable(
      doc,
      {
        startY:
          inicioTipos,

        head: [
          [
            'Tipo de atención',
            'Cantidad',
          ],
        ],

        body:
          porTipo.map(
            (tipo) => [
              tipo.nombre,
              tipo.cantidad,
            ]
          ),

        styles: {
          fontSize: 8,
        },
      }
    )


    // ------------------------------------------------------
    // PERSONAS CANALIZADAS
    // ------------------------------------------------------

    if (
      detalleCanalizaciones.length >
      0
    ) {
      autoTable(
        doc,
        {
          startY:
            (
              doc as JsPDFConAutoTable
            )
              .lastAutoTable
              .finalY
            + 10,

          head: [
            [
              'Fecha',
              'Persona',
              'Tipo de atención',
              'Destino',
            ],
          ],

          body:
            detalleCanalizaciones.map(
              (item) => [
                new Date(
                  item.fecha
                )
                  .toLocaleDateString(
                    'es-MX'
                  ),

                item.nombre,

                item.tipoAtencion,

                item.destino,
              ]
            ),

          styles: {
            fontSize: 7,
          },

          columnStyles: {
            0: {
              cellWidth: 24,
            },

            1: {
              cellWidth: 43,
            },

            2: {
              cellWidth: 56,
            },

            3: {
              cellWidth: 58,
            },
          },
        }
      )
    }


    // ------------------------------------------------------
    // DETALLE GENERAL
    // ------------------------------------------------------

    autoTable(
      doc,
      {
        startY:
          (
            doc as JsPDFConAutoTable
          )
            .lastAutoTable
            .finalY
          + 10,

        head: [
          [
            'Fecha',
            'Nombre',
            'Sexo',
            'Edad',
            'Tipo',
            'Canalización',
          ],
        ],

        body:
          registros.map(
            (registro) => {

              const destinos =
                registro
                  .canalizaciones
                  .map(
                    (canalizacion) =>
                      canalizacion
                        .destinos_canalizacion
                        ?.nombre
                  )
                  .filter(Boolean)
                  .join(', ')


              return [
                new Date(
                  registro.fecha_atencion
                )
                  .toLocaleDateString(
                    'es-MX'
                  ),

                registro
                  .personas
                  .nombre,

                registro
                  .personas
                  .sexo,

                registro
                  .edad_al_momento,

                registro
                  .tipos_atencion
                  .nombre,

                destinos || '—',
              ]
            }
          ),

        styles: {
          fontSize: 6.8,
        },

        columnStyles: {
          0: {
            cellWidth: 22,
          },

          1: {
            cellWidth: 39,
          },

          2: {
            cellWidth: 16,
          },

          3: {
            cellWidth: 13,
          },

          4: {
            cellWidth: 50,
          },

          5: {
            cellWidth: 41,
          },
        },
      }
    )


    // ------------------------------------------------------
    // NÚMERO DE PÁGINA
    // ------------------------------------------------------

    const totalPaginas =
      doc.getNumberOfPages()


    for (
      let pagina = 1;
      pagina <= totalPaginas;
      pagina++
    ) {
      doc.setPage(pagina)

      doc.setFontSize(7)
      doc.setFont(
        'helvetica',
        'normal'
      )

      doc.text(
        `Página ${pagina} de ${totalPaginas}`,
        anchoPagina - margen,
        291,
        {
          align: 'right',
        }
      )
    }


    doc.save(
      `reporte_atenciones_${fechaInicio}_${fechaFin}.pdf`
    )
  }


  // ========================================================
  // GRÁFICA
  // ========================================================

  const maximo =
    porTipo.length > 0
      ? Math.max(
          ...porTipo.map(
            (tipo) =>
              tipo.cantidad
          )
        )
      : 0


  // ========================================================
  // DATOS DERIVADOS PARA EL DASHBOARD
  // ========================================================

  const personasUnicas =
    new Set(
      registros.map(
        (registro) => registro.id_persona
      )
    ).size

  const totalCanalizaciones =
    totalDestinosCanalizacion

  const porcentajeHombres =
    totalAtenciones > 0
      ? Math.round((hombres / totalAtenciones) * 100)
      : 0

  const porcentajeMujeres =
    totalAtenciones > 0
      ? Math.round((mujeres / totalAtenciones) * 100)
      : 0


  // ========================================================
  // INTERFAZ
  // ========================================================

  return (
    <div className="es-page">

      {/* ==================================================== */}
      {/* ENCABEZADO */}
      {/* ==================================================== */}

      <div className="es-header">

        <div>
          <button
            type="button"
            className="es-back-button"
            onClick={onVolver}
          >
            <span>←</span>
            Volver al inicio
          </button>

          <h1>Estadísticas</h1>

          <p>
            Consulta el comportamiento de las atenciones,
            analiza los resultados por periodo y genera reportes.
          </p>
        </div>

        <div className="es-header-badge">
          <div className="es-header-badge-icon">▥</div>

          <div>
            <strong>Panel de análisis</strong>
            <small>Resumen de atenciones</small>
          </div>
        </div>

      </div>


      {/* ==================================================== */}
      {/* FILTROS */}
      {/* ==================================================== */}

      <section className="es-card es-filter-card">

        <div className="es-section-header">

          <div className="es-section-icon">
            ◷
          </div>

          <div>
            <h2>Periodo de consulta</h2>
            <p>
              Selecciona las fechas que deseas analizar.
            </p>
          </div>

        </div>


        <div className="es-filter-grid">

          <div className="es-field">
            <label htmlFor="fechaInicio">
              Desde
            </label>

            <input
              id="fechaInicio"
              type="date"
              value={fechaInicio}
              onChange={(e) =>
                setFechaInicio(e.target.value)
              }
            />
          </div>


          <div className="es-field">
            <label htmlFor="fechaFin">
              Hasta
            </label>

            <input
              id="fechaFin"
              type="date"
              value={fechaFin}
              onChange={(e) =>
                setFechaFin(e.target.value)
              }
            />
          </div>


          <button
            type="button"
            className="es-primary-button es-consult-button"
            onClick={cargarEstadisticas}
            disabled={cargando}
          >
            {cargando
              ? 'Consultando...'
              : 'Consultar periodo'}
          </button>

        </div>


        <div className="es-quick-filters">

          <span>Accesos rápidos:</span>

          <button
            type="button"
            onClick={seleccionarTrimestreActual}
          >
            Trimestre actual
          </button>

          <button
            type="button"
            onClick={seleccionarAñoActual}
          >
            Año actual
          </button>

        </div>

      </section>


      {/* ==================================================== */}
      {/* MENSAJE */}
      {/* ==================================================== */}

      {mensaje && (
        <div className="es-message">
          <span>ⓘ</span>
          <p>{mensaje}</p>
        </div>
      )}


      {/* ==================================================== */}
      {/* INDICADORES */}
      {/* ==================================================== */}

      <div className="es-summary-heading">
        <div>
          <h2>Resumen general</h2>
          <p>
            Indicadores correspondientes al periodo seleccionado.
          </p>
        </div>

        <span className="es-period-pill">
          {fechaInicio} → {fechaFin}
        </span>
      </div>


      <div className="es-kpi-grid">

        <article className="es-kpi es-kpi-primary">
          <div className="es-kpi-top">
            <span className="es-kpi-icon">▦</span>
            <span className="es-kpi-label">
              Total de atenciones
            </span>
          </div>

          <strong>{totalAtenciones}</strong>

          <small>
            Registros activos en el periodo
          </small>
        </article>


        <article className="es-kpi">
          <div className="es-kpi-top">
            <span className="es-kpi-icon">◎</span>
            <span className="es-kpi-label">
              Personas atendidas
            </span>
          </div>

          <strong>{personasUnicas}</strong>

          <small>
            Personas diferentes atendidas
          </small>
        </article>


        <article className="es-kpi">
          <div className="es-kpi-top">
            <span className="es-kpi-icon">♂</span>
            <span className="es-kpi-label">
              Hombres
            </span>
          </div>

          <div className="es-kpi-value-row">
            <strong>{hombres}</strong>
            <span>{porcentajeHombres}%</span>
          </div>

          <small>
            Del total de atenciones
          </small>
        </article>


        <article className="es-kpi">
          <div className="es-kpi-top">
            <span className="es-kpi-icon">♀</span>
            <span className="es-kpi-label">
              Mujeres
            </span>
          </div>

          <div className="es-kpi-value-row">
            <strong>{mujeres}</strong>
            <span>{porcentajeMujeres}%</span>
          </div>

          <small>
            Del total de atenciones
          </small>
        </article>


        <article className="es-kpi">
          <div className="es-kpi-top">
            <span className="es-kpi-icon">↗</span>
            <span className="es-kpi-label">
              Personas canalizadas
            </span>
          </div>

          <div className="es-kpi-value-row">
            <strong>{personasCanalizadas}</strong>
            <span>{totalCanalizaciones} destinos</span>
          </div>

          <small>
            Personas distintas enviadas a uno o más destinos
          </small>
        </article>

      </div>


      {/* ==================================================== */}
      {/* PERSONAS CANALIZADAS */}
      {/* ==================================================== */}

      <section className="es-card es-referral-card">

        <div className="es-card-heading">
          <div>
            <h2>Personas canalizadas</h2>
            <p>
              Consulta quién fue canalizado, cuándo y a qué destino.
            </p>
          </div>

          <span className="es-count-pill">
            {personasCanalizadas}
            {' '}
            {personasCanalizadas === 1
              ? 'persona'
              : 'personas'}
          </span>
        </div>


        {detalleCanalizaciones.length === 0 ? (

          <div className="es-empty es-referral-empty">
            <div className="es-empty-icon">↗</div>
            <strong>Sin canalizaciones</strong>
            <p>
              No hay personas canalizadas durante el periodo seleccionado.
            </p>
          </div>

        ) : (

          <div className="es-referral-table-wrap">

            <table className="es-referral-table">

              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Persona</th>
                  <th>Tipo de atención</th>
                  <th>Destino</th>
                </tr>
              </thead>

              <tbody>

                {detalleCanalizaciones.map(
                  (item, index) => (

                    <tr
                      key={
                        `${item.idAtencion}-${item.destino}-${index}`
                      }
                    >
                      <td>
                        {new Date(
                          item.fecha
                        ).toLocaleDateString(
                          'es-MX'
                        )}
                      </td>

                      <td>
                        <strong>
                          {item.nombre}
                        </strong>

                        <small>
                          {item.telefono}
                        </small>
                      </td>

                      <td>
                        {item.tipoAtencion}
                      </td>

                      <td>
                        <span className="es-referral-destination">
                          {item.destino}
                        </span>
                      </td>
                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* ==================================================== */}
      {/* CONTENIDO PRINCIPAL */}
      {/* ==================================================== */}

      <div className="es-main-grid">

        {/* ================================================== */}
        {/* ATENCIONES POR TIPO */}
        {/* ================================================== */}

        <section className="es-card es-chart-card">

          <div className="es-card-heading">
            <div>
              <h2>Atenciones por tipo</h2>
              <p>
                Distribución de servicios durante el periodo.
              </p>
            </div>

            <span className="es-count-pill">
              {porTipo.length}
              {' '}
              {porTipo.length === 1
                ? 'tipo'
                : 'tipos'}
            </span>
          </div>


          {porTipo.length === 0 ? (

            <div className="es-empty">
              <div className="es-empty-icon">▥</div>
              <strong>Sin información</strong>
              <p>
                No hay datos para representar durante este periodo.
              </p>
            </div>

          ) : (

            <div className="es-bars">

              {porTipo.map(
                (tipo, index) => {

                  const porcentaje =
                    maximo > 0
                      ? (
                          tipo.cantidad /
                          maximo
                        ) * 100
                      : 0

                  const porcentajeTotal =
                    totalAtenciones > 0
                      ? Math.round(
                          (
                            tipo.cantidad /
                            totalAtenciones
                          ) * 100
                        )
                      : 0


                  return (
                    <div
                      key={tipo.nombre}
                      className="es-bar-item"
                    >

                      <div className="es-bar-header">

                        <div className="es-bar-name">
                          <span>
                            {index + 1}
                          </span>

                          <strong>
                            {tipo.nombre}
                          </strong>
                        </div>

                        <div className="es-bar-value">
                          <strong>
                            {tipo.cantidad}
                          </strong>

                          <small>
                            {porcentajeTotal}%
                          </small>
                        </div>

                      </div>


                      <div className="es-bar-track">
                        <div
                          className="es-bar-fill"
                          style={{
                            width:
                              `${Math.max(
                                porcentaje,
                                2
                              )}%`,
                          }}
                        />
                      </div>

                    </div>
                  )
                }
              )}

            </div>

          )}

        </section>


        {/* ================================================== */}
        {/* REPORTES */}
        {/* ================================================== */}

        <aside className="es-card es-report-card">

          <div className="es-card-heading">
            <div>
              <h2>Generar reportes</h2>
              <p>
                Exporta la información del periodo consultado.
              </p>
            </div>
          </div>


          <div className="es-report-list">

            <button
              type="button"
              className="es-report-option"
              onClick={exportarExcel}
              disabled={
                registros.length === 0
              }
            >
              <span className="es-report-icon">
                X
              </span>

              <span className="es-report-copy">
                <strong>
                  Descargar Excel
                </strong>

                <small>
                  Resumen, tipos, detalle y canalizaciones
                </small>
              </span>

              <span className="es-report-arrow">
                ↓
              </span>
            </button>


            <button
              type="button"
              className="es-report-option"
              onClick={generarPDF}
              disabled={
                registros.length === 0
              }
            >
              <span className="es-report-icon">
                PDF
              </span>

              <span className="es-report-copy">
                <strong>
                  Generar PDF
                </strong>

                <small>
                  Resumen, gráfica y personas canalizadas
                </small>
              </span>

              <span className="es-report-arrow">
                ↓
              </span>
            </button>

          </div>


          <div className="es-report-note">
            <span>ⓘ</span>

            <p>
              Los archivos se generan utilizando únicamente
              los datos del periodo seleccionado.
            </p>
          </div>

        </aside>

      </div>


      {/* ==================================================== */}
      {/* ESTILOS */}
      {/* ==================================================== */}

      <style>{`

        .es-page {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 8px 0 40px;
          box-sizing: border-box;
        }

        .es-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .es-header h1 {
          margin: 14px 0 8px;
          color: var(--text);
          font-size: clamp(28px, 4vw, 38px);
          line-height: 1.1;
          letter-spacing: -0.8px;
        }

        .es-header p {
          max-width: 680px;
          margin: 0;
          color: var(--text-soft);
          font-size: 15px;
          line-height: 1.6;
        }

        .es-back-button {
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

        .es-back-button:hover {
          opacity: 0.75;
        }

        .es-back-button span {
          font-size: 18px;
        }

        .es-header-badge {
          display: flex;
          min-width: 205px;
          flex-shrink: 0;
          align-items: center;
          gap: 12px;
          padding: 14px 17px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .es-header-badge-icon {
          display: flex;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 12px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 20px;
          font-weight: 800;
        }

        .es-header-badge > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .es-header-badge strong {
          color: var(--text);
          font-size: 13px;
        }

        .es-header-badge small {
          color: var(--text-soft);
          font-size: 11px;
        }

        .es-card {
          border: 1px solid var(--border);
          border-radius: 20px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .es-filter-card {
          margin-bottom: 22px;
          padding: 25px 28px;
        }

        .es-section-header {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-bottom: 21px;
        }

        .es-section-icon {
          display: flex;
          width: 38px;
          height: 38px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 12px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 17px;
          font-weight: 800;
        }

        .es-section-header h2,
        .es-card-heading h2,
        .es-summary-heading h2 {
          margin: 0 0 4px;
          color: var(--text);
          font-size: 17px;
          line-height: 1.3;
        }

        .es-section-header p,
        .es-card-heading p,
        .es-summary-heading p {
          margin: 0;
          color: var(--text-soft);
          font-size: 12px;
          line-height: 1.5;
        }

        .es-filter-grid {
          display: grid;
          grid-template-columns:
            minmax(180px, 1fr)
            minmax(180px, 1fr)
            auto;
          align-items: end;
          gap: 14px;
        }

        .es-field label {
          display: block;
          margin-bottom: 8px;
          color: var(--text);
          font-size: 12px;
          font-weight: 700;
        }

        .es-field input {
          width: 100%;
          box-sizing: border-box;
        }

        .es-field input:focus {
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

        .es-primary-button {
          padding: 11px 18px;
          border: 1px solid var(--primary);
          border-radius: 10px;
          background: var(--primary);
          color: white;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            opacity 0.15s ease,
            box-shadow 0.15s ease;
        }

        .es-primary-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 7px 16px
            color-mix(
              in srgb,
              var(--primary) 22%,
              transparent
            );
        }

        .es-primary-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .es-consult-button {
          min-width: 150px;
          min-height: 43px;
        }

        .es-quick-filters {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 15px;
        }

        .es-quick-filters > span {
          margin-right: 2px;
          color: var(--text-soft);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .es-quick-filters button {
          padding: 7px 11px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--bg);
          color: var(--text-soft);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .es-quick-filters button:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .es-message {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--surface-soft);
        }

        .es-message span {
          color: var(--primary);
          font-weight: 800;
        }

        .es-message p {
          margin: 0;
          color: var(--text-soft);
          font-size: 12px;
        }

        .es-summary-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin: 27px 2px 14px;
        }

        .es-period-pill,
        .es-count-pill {
          flex-shrink: 0;
          padding: 6px 10px;
          border-radius: 999px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 10px;
          font-weight: 700;
        }

        .es-kpi-grid {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          gap: 13px;
          margin-bottom: 22px;
        }

        .es-kpi {
          min-width: 0;
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 17px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .es-kpi-primary {
          border-color:
            color-mix(
              in srgb,
              var(--primary) 35%,
              var(--border)
            );
          background:
            color-mix(
              in srgb,
              var(--primary) 5%,
              var(--surface)
            );
        }

        .es-kpi-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 13px;
        }

        .es-kpi-icon {
          display: flex;
          width: 29px;
          height: 29px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 9px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 13px;
          font-weight: 800;
        }

        .es-kpi-label {
          overflow: hidden;
          color: var(--text-soft);
          font-size: 10px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .es-kpi > strong,
        .es-kpi-value-row strong {
          display: block;
          margin-bottom: 4px;
          color: var(--text);
          font-size: 28px;
          line-height: 1;
          letter-spacing: -0.7px;
        }

        .es-kpi small {
          color: var(--text-soft);
          font-size: 9px;
          line-height: 1.35;
        }

        .es-kpi-value-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .es-kpi-value-row span {
          margin-bottom: 4px;
          padding: 3px 6px;
          border-radius: 999px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 9px;
          font-weight: 800;
        }

        .es-main-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.65fr)
            minmax(280px, 0.75fr);
          align-items: start;
          gap: 18px;
        }

        .es-chart-card,
        .es-report-card {
          padding: 25px;
        }

        .es-card-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 24px;
        }

        .es-bars {
          display: grid;
          gap: 19px;
        }

        .es-bar-item {
          min-width: 0;
        }

        .es-bar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 8px;
        }

        .es-bar-name {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 9px;
        }

        .es-bar-name > span {
          display: flex;
          width: 24px;
          height: 24px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 7px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 9px;
          font-weight: 800;
        }

        .es-bar-name strong {
          overflow: hidden;
          color: var(--text);
          font-size: 12px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .es-bar-value {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          gap: 7px;
        }

        .es-bar-value strong {
          color: var(--text);
          font-size: 12px;
        }

        .es-bar-value small {
          min-width: 29px;
          color: var(--text-soft);
          font-size: 9px;
          text-align: right;
        }

        .es-bar-track {
          width: 100%;
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--bg);
          box-shadow: inset 0 0 0 1px var(--border);
        }

        .es-bar-fill {
          height: 100%;
          border-radius: 999px;
          background: var(--primary);
          transition: width 0.4s ease;
        }

        .es-report-list {
          display: grid;
          gap: 10px;
        }

        .es-report-option {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 11px;
          padding: 13px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg);
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.15s ease,
            transform 0.15s ease;
        }

        .es-report-option:hover:not(:disabled) {
          border-color: var(--primary);
          transform: translateY(-1px);
        }

        .es-report-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .es-report-icon {
          display: flex;
          width: 37px;
          height: 37px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 10px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 10px;
          font-weight: 900;
        }

        .es-report-copy {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 2px;
        }

        .es-report-copy strong {
          color: var(--text);
          font-size: 11px;
        }

        .es-report-copy small {
          color: var(--text-soft);
          font-size: 9px;
          line-height: 1.35;
        }

        .es-report-arrow {
          color: var(--primary);
          font-size: 15px;
          font-weight: 800;
        }

        .es-report-note {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 15px;
          padding: 11px 12px;
          border-radius: 10px;
          background: var(--surface-soft);
        }

        .es-report-note span {
          color: var(--primary);
          font-size: 11px;
          font-weight: 800;
        }

        .es-report-note p {
          margin: 0;
          color: var(--text-soft);
          font-size: 9px;
          line-height: 1.45;
        }

        .es-empty {
          display: flex;
          min-height: 220px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 20px;
          text-align: center;
        }

        .es-empty-icon {
          display: flex;
          width: 48px;
          height: 48px;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          border-radius: 14px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 20px;
        }

        .es-empty strong {
          color: var(--text);
          font-size: 13px;
        }

        .es-empty p {
          max-width: 280px;
          margin: 5px 0 0;
          color: var(--text-soft);
          font-size: 11px;
          line-height: 1.5;
        }


        .es-referral-card {
          margin-bottom: 20px;
          padding: 24px;
        }

        .es-referral-table-wrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 13px;
        }

        .es-referral-table {
          width: 100%;
          min-width: 720px;
          border-collapse: collapse;
          background: var(--surface);
        }

        .es-referral-table th,
        .es-referral-table td {
          padding: 12px 13px;
          border-bottom: 1px solid var(--border);
          color: var(--text);
          font-size: 10px;
          line-height: 1.4;
          text-align: left;
          vertical-align: middle;
        }

        .es-referral-table th {
          background: var(--surface-soft);
          color: var(--text-soft);
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .45px;
        }

        .es-referral-table tbody tr:last-child td {
          border-bottom: none;
        }

        .es-referral-table tbody tr:hover td {
          background: var(--surface-soft);
        }

        .es-referral-table td:nth-child(2) strong {
          display: block;
          margin-bottom: 2px;
          color: var(--text);
          font-size: 10px;
        }

        .es-referral-table td:nth-child(2) small {
          color: var(--text-soft);
          font-size: 8px;
        }

        .es-referral-destination {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 999px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 8px;
          font-weight: 800;
        }

        .es-referral-empty {
          min-height: 170px;
        }

        @media (max-width: 1050px) {

          .es-kpi-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

        }

        @media (max-width: 800px) {

          .es-page {
            padding-bottom: 25px;
          }

          .es-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .es-header-badge {
            display: none;
          }

          .es-filter-card,
          .es-chart-card,
          .es-report-card {
            padding: 21px;
            border-radius: 16px;
          }

          .es-filter-grid {
            grid-template-columns: 1fr 1fr;
          }

          .es-consult-button {
            grid-column: 1 / -1;
            width: 100%;
          }

          .es-main-grid {
            grid-template-columns: 1fr;
          }

        }

        @media (max-width: 620px) {

          .es-filter-grid {
            grid-template-columns: 1fr;
          }

          .es-consult-button {
            grid-column: auto;
          }

          .es-kpi-grid {
            grid-template-columns: 1fr 1fr;
          }

          .es-summary-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .es-period-pill {
            white-space: normal;
          }

        }

        @media (max-width: 430px) {

          .es-kpi-grid {
            grid-template-columns: 1fr;
          }

          .es-filter-card,
          .es-chart-card,
          .es-report-card {
            padding: 18px;
          }

          .es-bar-name strong {
            white-space: normal;
          }

        }

      `}</style>

    </div>
  )
}


export default Estadisticas