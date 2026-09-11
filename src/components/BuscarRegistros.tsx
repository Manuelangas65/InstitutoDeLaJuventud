import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Rol = 'administrador' | 'servicio_social'

type BuscarRegistrosProps = {
  onVolver: () => void
  rol: Rol
}

type TipoAtencion = {
  id_tipo_atencion: number
  nombre: string
}

type Persona = {
  id_persona: number
  nombre: string
  sexo: string
  telefono: string
  correo: string | null
  colonia: string | null
}

type Destino = {
  id_destino: number
  nombre: string
}

type Canalizacion = {
  id_canalizacion: number
  id_destino: number
  fecha_canalizacion: string
  observaciones: string | null
  destinos_canalizacion: Destino | null
}

type CanalizacionEditando = {
  id_canalizacion: number | null
  id_destino: string
  observaciones: string
}

type Atencion = {
  id_atencion: number
  id_tipo_atencion: number
  creado_por: string
  edad_al_momento: number
  fecha_atencion: string
  observaciones: string | null
  estado: string
  personas: Persona
  tipos_atencion: {
    nombre: string
  }
  canalizaciones: Canalizacion[]
}

const RESULTADOS_POR_PAGINA = 8

function BuscarRegistros({
  onVolver,
  rol,
}: BuscarRegistrosProps) {
  // ==========================================================
  // FILTROS
  // ==========================================================

  const [busqueda, setBusqueda] = useState('')
  const [sexo, setSexo] = useState('')
  const [idTipoAtencion, setIdTipoAtencion] = useState('')
  const [estado, setEstado] = useState('activo')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  // ==========================================================
  // DATOS
  // ==========================================================

  const [tiposAtencion, setTiposAtencion] =
    useState<TipoAtencion[]>([])

  const [destinos, setDestinos] =
    useState<Destino[]>([])

  const [resultados, setResultados] =
    useState<Atencion[]>([])

  const [buscando, setBuscando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [yaBusco, setYaBusco] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [detalleAbierto, setDetalleAbierto] =
    useState<number | null>(null)

  // ==========================================================
  // EDICIÓN
  // ==========================================================

  const [idEditando, setIdEditando] =
    useState<number | null>(null)

  const [nombreEditando, setNombreEditando] = useState('')
  const [sexoEditando, setSexoEditando] = useState('')
  const [telefonoEditando, setTelefonoEditando] = useState('')
  const [correoEditando, setCorreoEditando] = useState('')
  const [coloniaEditando, setColoniaEditando] = useState('')
  const [edadEditando, setEdadEditando] = useState('')
  const [tipoEditando, setTipoEditando] = useState('')
  const [observacionesEditando, setObservacionesEditando] =
    useState('')

  const [canalizacionesEditando, setCanalizacionesEditando] =
    useState<CanalizacionEditando[]>([])

  const [agregarCanalizacion, setAgregarCanalizacion] =
    useState(false)

  const [guardandoEdicion, setGuardandoEdicion] =
    useState(false)

  // ==========================================================
  // CARGAR CATÁLOGO
  // ==========================================================

  useEffect(() => {
    async function cargarCatalogos() {
      const [resultadoTipos, resultadoDestinos] =
        await Promise.all([
          supabase
            .from('tipos_atencion')
            .select('id_tipo_atencion, nombre')
            .eq('activo', true)
            .order('nombre'),

          supabase
            .from('destinos_canalizacion')
            .select('id_destino, nombre')
            .eq('activo', true)
            .order('nombre'),
        ])

      if (resultadoTipos.error) {
        console.error(
          'Error cargando tipos de atención:',
          resultadoTipos.error
        )
      } else {
        setTiposAtencion(resultadoTipos.data ?? [])
      }

      if (resultadoDestinos.error) {
        console.error(
          'Error cargando destinos de canalización:',
          resultadoDestinos.error
        )
      } else {
        setDestinos(resultadoDestinos.data ?? [])
      }
    }

    cargarCatalogos()
  }, [])

  // ==========================================================
  // BUSCAR REGISTROS
  // ==========================================================

  async function buscarRegistros() {
    setBuscando(true)
    setMensaje('')
    setYaBusco(true)
    setPagina(1)
    setDetalleAbierto(null)
    cancelarEdicion()

    try {
      let idsPersonas: number[] | null = null

      // ------------------------------------------------------
      // BUSCAR PERSONAS SI HAY NOMBRE / TELÉFONO / SEXO
      // ------------------------------------------------------

      if (busqueda.trim() || sexo) {
        let consultaPersonas = supabase
          .from('personas')
          .select('id_persona')

        if (busqueda.trim()) {
          const termino = busqueda
            .trim()
            .replace(/,/g, '')

          consultaPersonas = consultaPersonas.or(
            `nombre.ilike.%${termino}%,telefono.ilike.%${termino}%`
          )
        }

        if (sexo) {
          consultaPersonas =
            consultaPersonas.eq('sexo', sexo)
        }

        const {
          data: personasEncontradas,
          error: errorPersonas,
        } = await consultaPersonas

        if (errorPersonas) {
          console.error(errorPersonas)

          throw new Error(
            'No se pudieron buscar las personas.'
          )
        }

        idsPersonas =
          personasEncontradas?.map(
            (persona) => persona.id_persona
          ) ?? []

        if (idsPersonas.length === 0) {
          setResultados([])
          setMensaje(
            'No se encontraron registros con esos filtros.'
          )
          return
        }
      }

      // ------------------------------------------------------
      // CONSULTA DE ATENCIONES
      // ------------------------------------------------------

      let consulta = supabase
        .from('atenciones')
        .select(`
          id_atencion,
          id_tipo_atencion,
          creado_por,
          edad_al_momento,
          fecha_atencion,
          observaciones,
          estado,

          personas!inner (
            id_persona,
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
            id_canalizacion,
            id_destino,
            fecha_canalizacion,
            observaciones,

            destinos_canalizacion (
              id_destino,
              nombre
            )
          )
        `)

      if (idsPersonas) {
        consulta =
          consulta.in('id_persona', idsPersonas)
      }

      if (idTipoAtencion) {
        consulta = consulta.eq(
          'id_tipo_atencion',
          Number(idTipoAtencion)
        )
      }

      if (estado) {
        consulta =
          consulta.eq('estado', estado)
      }

      if (fechaInicio) {
        consulta = consulta.gte(
          'fecha_atencion',
          `${fechaInicio}T00:00:00`
        )
      }

      if (fechaFin) {
        consulta = consulta.lte(
          'fecha_atencion',
          `${fechaFin}T23:59:59.999`
        )
      }

      consulta = consulta
        .order('fecha_atencion', {
          ascending: false,
        })
        .limit(200)

      const { data, error } = await consulta

      if (error) {
        console.error(
          'Error buscando atenciones:',
          error
        )

        throw new Error(
          'No se pudieron consultar los registros.'
        )
      }

      const registros =
        (data ?? []) as unknown as Atencion[]

      setResultados(registros)

      if (registros.length === 0) {
        setMensaje(
          'No se encontraron registros con esos filtros.'
        )
      }
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setMensaje(error.message)
      } else {
        setMensaje(
          'Ocurrió un error inesperado.'
        )
      }
    } finally {
      setBuscando(false)
    }
  }

  // ==========================================================
  // INICIAR EDICIÓN
  // ==========================================================

  async function editarAtencion(atencion: Atencion) {
    setMensaje('')

    const {
      data: { user },
      error: errorUsuario,
    } = await supabase.auth.getUser()

    if (errorUsuario || !user) {
      setMensaje(
        'No se pudo identificar al usuario actual.'
      )
      return
    }

    const puedeEditar =
      rol === 'administrador' ||
      atencion.creado_por === user.id

    if (!puedeEditar) {
      const aviso =
        'No puedes editar este registro porque fue creado por otro usuario. Solo un administrador puede modificarlo.'

      setMensaje(`⛔ ${aviso}`)
      window.alert(aviso)
      return
    }

    setIdEditando(atencion.id_atencion)
    setDetalleAbierto(atencion.id_atencion)

    setNombreEditando(atencion.personas.nombre)
    setSexoEditando(atencion.personas.sexo)
    setTelefonoEditando(atencion.personas.telefono)
    setCorreoEditando(atencion.personas.correo ?? '')
    setColoniaEditando(atencion.personas.colonia ?? '')

    setEdadEditando(
      String(atencion.edad_al_momento)
    )

    setTipoEditando(
      String(atencion.id_tipo_atencion)
    )

    setObservacionesEditando(
      atencion.observaciones ?? ''
    )

    setCanalizacionesEditando(
      (atencion.canalizaciones ?? []).map(
        (canalizacion) => ({
          id_canalizacion:
            canalizacion.id_canalizacion,
          id_destino:
            String(canalizacion.id_destino),
          observaciones:
            canalizacion.observaciones ?? '',
        })
      )
    )

    setAgregarCanalizacion(false)
  }

  // ==========================================================
  // CANCELAR EDICIÓN
  // ==========================================================

  function cancelarEdicion() {
    setIdEditando(null)
    setNombreEditando('')
    setSexoEditando('')
    setTelefonoEditando('')
    setCorreoEditando('')
    setColoniaEditando('')
    setEdadEditando('')
    setTipoEditando('')
    setObservacionesEditando('')
    setCanalizacionesEditando([])
    setAgregarCanalizacion(false)
  }

  // ==========================================================
  // GUARDAR EDICIÓN
  // ==========================================================

  async function guardarEdicion(
    idAtencion: number
  ) {
    setMensaje('')

    const atencionOriginal = resultados.find(
      (item) => item.id_atencion === idAtencion
    )

    if (!atencionOriginal) {
      setMensaje(
        'No se encontró el registro que intentas editar.'
      )
      return
    }

    const {
      data: { user },
      error: errorUsuario,
    } = await supabase.auth.getUser()

    if (errorUsuario || !user) {
      setMensaje(
        'No se pudo identificar al usuario actual.'
      )
      return
    }

    if (
      rol !== 'administrador' &&
      atencionOriginal.creado_por !== user.id
    ) {
      setMensaje(
        '⛔ No puedes editar este registro porque fue creado por otro usuario.'
      )
      cancelarEdicion()
      return
    }

    if (!nombreEditando.trim()) {
      setMensaje('El nombre es obligatorio.')
      return
    }

    if (!sexoEditando) {
      setMensaje('Selecciona el sexo.')
      return
    }

    if (!telefonoEditando.trim()) {
      setMensaje('El teléfono es obligatorio.')
      return
    }

    const edadNumero = Number(edadEditando)

    if (
      !Number.isInteger(edadNumero) ||
      edadNumero < 0
    ) {
      setMensaje(
        'La edad debe ser un número entero válido.'
      )
      return
    }

    if (!tipoEditando) {
      setMensaje(
        'Selecciona un tipo de atención.'
      )
      return
    }

    const tipoSeleccionado =
      tiposAtencion.find(
        (tipo) =>
          tipo.id_tipo_atencion ===
          Number(tipoEditando)
      )

    const nombreTipoNormalizado =
      tipoSeleccionado?.nombre
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase() ?? ''

    const esJovenesConstruyendoElFuturo =
      nombreTipoNormalizado ===
      'JOVENES CONSTRUYENDO EL FUTURO'

    if (
      esJovenesConstruyendoElFuturo &&
      edadNumero > 29
    ) {
      setMensaje(
        'Para JÓVENES CONSTRUYENDO EL FUTURO la edad máxima permitida es de 29 años.'
      )
      return
    }

    const canalizacionesAGuardar =
      canalizacionesEditando.filter(
        (canalizacion) =>
          canalizacion.id_canalizacion !== null ||
          agregarCanalizacion
      )

    if (
      canalizacionesAGuardar.some(
        (canalizacion) =>
          !canalizacion.id_destino
      )
    ) {
      setMensaje(
        'Selecciona el destino de la canalización.'
      )
      return
    }

    setGuardandoEdicion(true)

    try {
      // Primero actualizamos la atención. La respuesta con .select()
      // permite detectar cuando RLS bloqueó el UPDATE sin devolver error.
      const {
        data: atencionActualizada,
        error: errorAtencion,
      } = await supabase
        .from('atenciones')
        .update({
          edad_al_momento: edadNumero,
          id_tipo_atencion:
            Number(tipoEditando),
          observaciones:
            observacionesEditando.trim() || null,
        })
        .eq('id_atencion', idAtencion)
        .select('id_atencion')
        .maybeSingle()

      if (errorAtencion) {
        console.error(
          'Error editando atención:',
          errorAtencion
        )

        throw new Error(
          'No se pudo guardar la modificación de la atención.'
        )
      }

      if (!atencionActualizada) {
        throw new Error(
          'No tienes permiso para editar este registro.'
        )
      }

      const { error: errorPersona } = await supabase
        .from('personas')
        .update({
          nombre: nombreEditando.trim(),
          sexo: sexoEditando,
          telefono: telefonoEditando.trim(),
          correo: correoEditando.trim() || null,
          colonia: coloniaEditando.trim() || null,
        })
        .eq(
          'id_persona',
          atencionOriginal.personas.id_persona
        )

      if (errorPersona) {
        console.error(
          'Error editando persona:',
          errorPersona
        )

        throw new Error(
          'La atención se actualizó, pero no se pudieron guardar los datos de la persona.'
        )
      }

      for (const canalizacion of canalizacionesEditando) {
        if (canalizacion.id_canalizacion === null) {
          if (!agregarCanalizacion) {
            continue
          }

          const { error: errorCrearCanalizacion } =
            await supabase
              .from('canalizaciones')
              .insert({
                id_atencion: idAtencion,
                id_destino:
                  Number(canalizacion.id_destino),
                observaciones:
                  canalizacion.observaciones.trim() ||
                  null,
              })

          if (errorCrearCanalizacion) {
            console.error(
              'Error creando canalización:',
              errorCrearCanalizacion
            )

            throw new Error(
              'Los datos principales se actualizaron, pero no se pudo crear la canalización.'
            )
          }

          continue
        }

        const {
          data: canalizacionActualizada,
          error: errorCanalizacion,
        } = await supabase
          .from('canalizaciones')
          .update({
            id_destino:
              Number(canalizacion.id_destino),
            observaciones:
              canalizacion.observaciones.trim() ||
              null,
          })
          .eq(
            'id_canalizacion',
            canalizacion.id_canalizacion
          )
          .select('id_canalizacion')
          .maybeSingle()

        if (errorCanalizacion) {
          console.error(
            'Error editando canalización:',
            errorCanalizacion
          )

          throw new Error(
            'Los datos principales se actualizaron, pero no se pudo modificar la canalización.'
          )
        }

        if (!canalizacionActualizada) {
          throw new Error(
            'No tienes permiso para editar esta canalización.'
          )
        }
      }

      cancelarEdicion()

      setMensaje(
        '✅ Registro actualizado correctamente.'
      )

      await buscarRegistros()
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setMensaje(error.message)
      } else {
        setMensaje(
          'Ocurrió un error inesperado.'
        )
      }
    } finally {
      setGuardandoEdicion(false)
    }
  }

  // ==========================================================
  // INACTIVAR ATENCIÓN
  // SOLO ADMINISTRADOR
  // ==========================================================

  async function inactivarAtencion(
    idAtencion: number
  ) {
    const confirmar = window.confirm(
      '¿Seguro que deseas dar de baja esta atención? El registro no se eliminará y podrá consultarse después.'
    )

    if (!confirmar) {
      return
    }

    setMensaje('')

    const { error } = await supabase
      .from('atenciones')
      .update({
        estado: 'inactivo',
      })
      .eq('id_atencion', idAtencion)

    if (error) {
      console.error(
        'Error inactivando atención:',
        error
      )

      setMensaje(
        'No se pudo dar de baja la atención.'
      )

      return
    }

    setMensaje(
      '✅ Atención dada de baja correctamente.'
    )

    await buscarRegistros()
  }

  // ==========================================================
  // REACTIVAR ATENCIÓN
  // SOLO ADMINISTRADOR
  // ==========================================================

  async function reactivarAtencion(
    idAtencion: number
  ) {
    const confirmar = window.confirm(
      '¿Deseas reactivar esta atención?'
    )

    if (!confirmar) {
      return
    }

    const { error } = await supabase
      .from('atenciones')
      .update({
        estado: 'activo',
      })
      .eq('id_atencion', idAtencion)

    if (error) {
      console.error(
        'Error reactivando atención:',
        error
      )

      setMensaje(
        'No se pudo reactivar la atención.'
      )

      return
    }

    setMensaje(
      '✅ Atención reactivada correctamente.'
    )

    await buscarRegistros()
  }

  // ==========================================================
  // LIMPIAR FILTROS
  // ==========================================================

  function limpiarFiltros() {
    setBusqueda('')
    setSexo('')
    setIdTipoAtencion('')
    setEstado('activo')
    setFechaInicio('')
    setFechaFin('')
    setResultados([])
    setMensaje('')
    setYaBusco(false)
    setPagina(1)
    setDetalleAbierto(null)
    cancelarEdicion()
  }

  // ==========================================================
  // AYUDANTES DE INTERFAZ
  // ==========================================================

  function formatearFecha(fecha: string) {
    return new Intl.DateTimeFormat(
      'es-MX',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    ).format(new Date(fecha))
  }

  function formatearFechaCorta(fecha: string) {
    return new Intl.DateTimeFormat(
      'es-MX',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    ).format(new Date(fecha))
  }

  function obtenerIniciales(nombre: string) {
    return nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('')
  }

  function alternarDetalle(id: number) {
    if (idEditando === id) {
      return
    }

    setDetalleAbierto(
      detalleAbierto === id ? null : id
    )
  }

  // ==========================================================
  // PAGINACIÓN LOCAL
  // ==========================================================

  const totalPaginas = Math.max(
    1,
    Math.ceil(
      resultados.length /
      RESULTADOS_POR_PAGINA
    )
  )

  const resultadosPagina = useMemo(() => {
    const inicio =
      (pagina - 1) *
      RESULTADOS_POR_PAGINA

    return resultados.slice(
      inicio,
      inicio + RESULTADOS_POR_PAGINA
    )
  }, [resultados, pagina])

  const desdeResultado =
    resultados.length === 0
      ? 0
      : (pagina - 1) *
          RESULTADOS_POR_PAGINA +
        1

  const hastaResultado =
    Math.min(
      pagina * RESULTADOS_POR_PAGINA,
      resultados.length
    )

  const filtrosActivos = [
    busqueda.trim(),
    sexo,
    idTipoAtencion,
    estado !== 'activo' ? estado : '',
    fechaInicio,
    fechaFin,
  ].filter(Boolean).length

  // ==========================================================
  // INTERFAZ
  // ==========================================================

  return (
    <div className="br-root">
      <style>{`
  .br-root {
    --br-bg: #fff8fb;
    --br-surface: #ffffff;
    --br-surface-soft: #fff2f7;
    --br-text: #2d2430;
    --br-muted: #746873;
    --br-border: #eadde5;
    --br-accent: #c94f82;
    --br-accent-strong: #aa3568;
    --br-accent-soft: #fde7f0;
    --br-success: #257a55;
    --br-success-soft: #e8f7ef;
    --br-danger: #a43e53;
    --br-danger-soft: #fdecef;
    --br-warning: #946315;
    --br-warning-soft: #fff5db;
    --br-shadow: 0 10px 30px rgba(75, 36, 55, 0.08);
    color: var(--br-text);
    max-width: 1240px;
    margin: 0 auto;
    padding: 24px;
    box-sizing: border-box;
  }

  /* Soporte para modo oscuro por clase en un ancestro (ej. <html class="dark"> o <body class="dark">) */
  :is(.dark, [data-theme='dark']) .br-root,
  .br-root.dark,
  .br-root[data-theme='dark'] {
    --br-bg: #181317;
    --br-surface: #221a20;
    --br-surface-soft: #2a2027;
    --br-text: #f5edf2;
    --br-muted: #b8aab3;
    --br-border: #42323c;
    --br-accent: #e16b9e;
    --br-accent-strong: #f08bb5;
    --br-accent-soft: #3d2130;
    --br-success: #72d5a5;
    --br-success-soft: #18372a;
    --br-danger: #f49aaa;
    --br-danger-soft: #43242c;
    --br-warning: #f3c66a;
    --br-warning-soft: #3c3018;
    --br-shadow: none;
  }

  .br-root * {
    box-sizing: border-box;
  }

  .br-root button,
  .br-root input,
  .br-root select,
  .br-root textarea {
    font: inherit;
  }

  .br-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 20px;
  }

  .br-header-main {
    min-width: 0;
  }

  .br-back {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 42px;
    padding: 0 14px;
    border: 1px solid var(--br-border);
    border-radius: 12px;
    background: var(--br-surface);
    color: var(--br-text);
    cursor: pointer;
    transition: 0.18s ease;
    margin-bottom: 14px;
  }

  .br-back:hover {
    border-color: var(--br-accent);
    color: var(--br-accent-strong);
    transform: translateY(-1px);
  }

  .br-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .br-title {
    margin: 0;
    font-size: clamp(1.65rem, 4vw, 2.2rem);
    line-height: 1.1;
    letter-spacing: -0.03em;
    color: var(--br-text);
  }

  .br-counter {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--br-accent-soft);
    color: var(--br-accent-strong);
    font-weight: 700;
    font-size: 0.85rem;
  }

  .br-subtitle {
    margin: 8px 0 0;
    color: var(--br-muted);
    line-height: 1.55;
  }

  .br-layout {
    display: grid;
    grid-template-columns: minmax(250px, 315px) minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }

  /* CORREGIDO: Se quitó el background #ffffff fijo */
  .br-panel {
    background: var(--br-surface);
    border: 1px solid var(--br-border);
    border-radius: 20px;
    box-shadow: var(--br-shadow);
  }

  .br-filters {
    padding: 18px;
    position: sticky;
    top: 18px;
  }

  .br-panel-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }

  .br-panel-title h2 {
    margin: 0;
    font-size: 1.06rem;
    color: var(--br-text);
  }

  .br-filter-count {
    font-size: 0.78rem;
    color: var(--br-muted);
  }

  .br-field {
    display: grid;
    gap: 7px;
    margin-bottom: 14px;
  }

  .br-field label {
    font-size: 0.86rem;
    font-weight: 700;
    color: var(--br-text);
  }

  .br-control {
    width: 100%;
    min-height: 44px;
    border: 1px solid var(--br-border);
    border-radius: 12px;
    padding: 10px 12px;
    background: var(--br-surface);
    color: var(--br-text);
    outline: none;
    transition: 0.16s ease;
  }

  .br-control:focus {
    border-color: var(--br-accent);
    box-shadow: 0 0 0 3px rgba(201, 79, 130, 0.13);
  }

  textarea.br-control {
    min-height: 110px;
    resize: vertical;
  }

  .br-date-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 10px;
  }

  .br-date-grid input {
    width: 100%;
    min-width: 0;
  }

  .br-actions {
    display: grid;
    gap: 9px;
    margin-top: 18px;
  }

  .br-btn {
    min-height: 44px;
    border-radius: 12px;
    padding: 10px 14px;
    border: 1px solid transparent;
    font-weight: 700;
    cursor: pointer;
    transition: 0.16s ease;
  }

  .br-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  .br-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .br-btn-primary {
    background: var(--br-accent);
    color: white;
  }

  .br-btn-primary:hover:not(:disabled) {
    background: var(--br-accent-strong);
  }

  .br-btn-secondary {
    background: var(--br-surface);
    border-color: var(--br-border);
    color: var(--br-text);
  }

  .br-btn-secondary:hover:not(:disabled) {
    border-color: var(--br-accent);
    color: var(--br-accent-strong);
  }

  .br-btn-danger {
    background: var(--br-danger-soft);
    border-color: rgba(164, 62, 83, 0.15);
    color: var(--br-danger);
  }

  .br-btn-success {
    background: var(--br-success-soft);
    border-color: rgba(37, 122, 85, 0.15);
    color: var(--br-success);
  }

  .br-results {
    min-width: 0;
  }

  .br-results-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  .br-results-title {
    display: flex;
    align-items: baseline;
    gap: 9px;
    flex-wrap: wrap;
  }

  .br-results-title h2 {
    margin: 0;
    font-size: 1.12rem;
    color: var(--br-text);
  }

  .br-results-meta {
    color: var(--br-muted);
    font-size: 0.85rem;
  }

  .br-message {
    margin: 0 0 14px;
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--br-surface);
    border: 1px solid var(--br-border);
    color: var(--br-text);
  }

  .br-empty {
    padding: 50px 24px;
    text-align: center;
    background: var(--br-surface);
    border: 1px dashed var(--br-border);
    border-radius: 20px;
    color: var(--br-muted);
  }

  .br-empty-icon {
    width: 54px;
    height: 54px;
    display: grid;
    place-items: center;
    border-radius: 16px;
    background: var(--br-accent-soft);
    margin: 0 auto 14px;
    font-size: 1.5rem;
  }

  .br-empty h3 {
    margin: 0 0 7px;
    color: var(--br-text);
    font-size: 1rem;
  }

  .br-empty p {
    margin: 0;
    line-height: 1.5;
  }

  .br-list {
    display: grid;
    gap: 12px;
  }

  .br-card {
    background: var(--br-surface);
    border: 1px solid var(--br-border);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: var(--br-shadow);
    transition: 0.18s ease;
  }

  .br-card:hover {
    border-color: var(--br-accent);
  }

  .br-card-main {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
    padding: 16px;
  }

  .br-avatar {
    width: 46px;
    height: 46px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    background: var(--br-accent-soft);
    color: var(--br-accent-strong);
    font-weight: 800;
    letter-spacing: 0.03em;
  }

  .br-card-info {
    min-width: 0;
  }

  .br-person-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 5px;
  }

  .br-person-name {
    margin: 0;
    min-width: 0;
    font-size: 1rem;
    color: var(--br-text);
    overflow-wrap: anywhere;
  }

  .br-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border-radius: 999px;
    font-size: 0.74rem;
    font-weight: 800;
  }

  .br-status-active {
    color: var(--br-success);
    background: var(--br-success-soft);
  }

  .br-status-inactive {
    color: var(--br-danger);
    background: var(--br-danger-soft);
  }

  .br-service {
    color: var(--br-text);
    font-size: 0.91rem;
    font-weight: 700;
    margin-bottom: 5px;
  }

  .br-quick-meta {
    display: flex;
    align-items: center;
    gap: 7px 14px;
    flex-wrap: wrap;
    color: var(--br-muted);
    font-size: 0.82rem;
  }

  .br-view {
    min-height: 40px;
    padding: 8px 12px;
    border: 1px solid var(--br-border);
    border-radius: 11px;
    background: var(--br-surface);
    color: var(--br-accent-strong);
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }

  .br-card-detail {
    padding: 0 16px 16px;
  }

  .br-divider {
    height: 1px;
    background: var(--br-border);
    margin: 0 0 16px;
  }

  .br-detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .br-detail-item {
    min-width: 0;
    padding: 11px 12px;
    border-radius: 12px;
    background: var(--br-surface-soft);
  }

  .br-detail-label {
    display: block;
    color: var(--br-muted);
    font-size: 0.75rem;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .br-detail-value {
    display: block;
    color: var(--br-text);
    font-size: 0.89rem;
    overflow-wrap: anywhere;
  }

  .br-detail-wide {
    grid-column: 1 / -1;
  }

  .br-channel {
    margin-top: 12px;
    padding: 13px;
    border-radius: 14px;
    background: var(--br-warning-soft);
    border: 1px solid var(--br-border);
  }

  .br-channel-title {
    margin: 0 0 8px;
    font-size: 0.87rem;
    color: var(--br-warning);
  }

  .br-channel-item + .br-channel-item {
    margin-top: 9px;
    padding-top: 9px;
    border-top: 1px solid var(--br-border);
  }

  .br-channel-item p {
    margin: 3px 0;
    font-size: 0.85rem;
    color: var(--br-text);
  }

  .br-edit-channel {
    border: 1px solid var(--br-border);
    border-radius: 16px;
    padding: 16px;
    background: var(--br-surface-soft);
  }

  .br-edit-channel-head {
    margin-bottom: 14px;
  }

  .br-edit-channel-head > div {
    display: grid;
    gap: 3px;
  }

  .br-edit-channel-head strong {
    color: var(--br-text);
    font-size: 0.98rem;
  }

  .br-edit-channel-head span {
    color: var(--br-muted);
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .br-edit-channel-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--br-border);
    border-radius: 14px;
    background: var(--br-surface);
    margin-top: 10px;
  }

  .br-edit-channel-card .br-field {
    margin-bottom: 0;
  }

  .br-link-danger {
    margin-top: 10px;
    border: 0;
    background: transparent;
    color: var(--br-danger);
    font-weight: 700;
    cursor: pointer;
    padding: 4px 0;
  }

  .br-link-danger:hover {
    text-decoration: underline;
  }

  .br-card-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 14px;
  }

  .br-card-actions .br-btn {
    min-height: 40px;
    padding: 8px 12px;
    font-size: 0.84rem;
  }

  .br-edit {
    padding: 16px;
    background: var(--br-surface);
  }

  .br-edit-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .br-edit-title {
    margin: 0;
    font-size: 1rem;
    color: var(--br-text);
  }

  .br-edit-subtitle {
    margin: 3px 0 0;
    color: var(--br-muted);
    font-size: 0.82rem;
  }

  .br-edit-grid {
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr);
    gap: 12px;
  }

  .br-edit-wide {
    grid-column: 1 / -1;
  }

  .br-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-top: 18px;
    flex-wrap: wrap;
  }

  .br-page-btn {
    min-width: 42px;
    min-height: 42px;
    border-radius: 11px;
    border: 1px solid var(--br-border);
    background: var(--br-surface);
    color: var(--br-text);
    cursor: pointer;
    font-weight: 700;
  }

  .br-page-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .br-page-info {
    color: var(--br-muted);
    font-size: 0.85rem;
    padding: 0 4px;
  }

  @media (max-width: 820px) {
    .br-root {
      padding: 16px;
    }

    .br-layout {
      grid-template-columns: 1fr;
    }

    .br-filters {
      position: static;
    }

    .br-card-main {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .br-view {
      grid-column: 1 / -1;
      width: 100%;
    }
  }

  @media (max-width: 560px) {
    .br-root {
      padding: 12px;
    }

    .br-header {
      margin-bottom: 14px;
    }

    .br-date-grid,
    .br-detail-grid,
    .br-edit-grid {
      grid-template-columns: 1fr;
    }

    .br-edit-wide,
    .br-detail-wide {
      grid-column: auto;
    }

    .br-card-main {
      gap: 10px;
      padding: 13px;
    }

    .br-avatar {
      width: 42px;
      height: 42px;
    }

    .br-card-detail,
    .br-edit {
      padding-left: 13px;
      padding-right: 13px;
    }

    .br-card-actions {
      display: grid;
      grid-template-columns: 1fr;
    }

    .br-card-actions .br-btn {
      width: 100%;
    }
  }
`}</style>

      <header className="br-header">
        <div className="br-header-main">
          <button
            type="button"
            className="br-back"
            onClick={onVolver}
          >
            ← Volver
          </button>

          <div className="br-title-row">
            <h1 className="br-title">
              Buscar registros
            </h1>

            {yaBusco && (
              <span className="br-counter">
                {resultados.length}{' '}
                {resultados.length === 1
                  ? 'atención'
                  : 'atenciones'}
              </span>
            )}
          </div>

          <p className="br-subtitle">
            Encuentra rápidamente una atención,
            revisa sus datos y administra su estado.
          </p>
        </div>
      </header>

      <div className="br-layout">
        {/* ====================================================
            FILTROS
        ==================================================== */}

        <aside className="br-panel br-filters">
          <div className="br-panel-title">
            <h2>🔎 Filtros</h2>

            <span className="br-filter-count">
              {filtrosActivos > 0
                ? `${filtrosActivos} aplicados`
                : 'Sin filtros extra'}
            </span>
          </div>

          <div className="br-field">
            <label htmlFor="busqueda">
              Nombre o teléfono
            </label>

            <input
              id="busqueda"
              className="br-control"
              type="text"
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  buscarRegistros()
                }
              }}
              placeholder="Ej. María López o 4691234567"
            />
          </div>

          <div className="br-field">
            <label htmlFor="sexo">
              Sexo
            </label>

            <select
              id="sexo"
              className="br-control"
              value={sexo}
              onChange={(e) =>
                setSexo(e.target.value)
              }
            >
              <option value="">
                Todos
              </option>

              <option value="Hombre">
                Hombre
              </option>

              <option value="Mujer">
                Mujer
              </option>

              <option value="No binario">
                No binario
              </option>

              <option value="Prefiero no decirlo">
                Prefiero no decirlo
              </option>

              <option value="Otro">
                Otro
              </option>
            </select>
          </div>

          <div className="br-field">
            <label htmlFor="tipo">
              Tipo de atención
            </label>

            <select
              id="tipo"
              className="br-control"
              value={idTipoAtencion}
              onChange={(e) =>
                setIdTipoAtencion(
                  e.target.value
                )
              }
            >
              <option value="">
                Todos
              </option>

              {tiposAtencion.map(
                (tipo) => (
                  <option
                    key={
                      tipo.id_tipo_atencion
                    }
                    value={
                      tipo.id_tipo_atencion
                    }
                  >
                    {tipo.nombre}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="br-field">
            <label htmlFor="estado">
              Estado
            </label>

            <select
              id="estado"
              className="br-control"
              value={estado}
              onChange={(e) =>
                setEstado(e.target.value)
              }
            >
              <option value="">
                Todos
              </option>

              <option value="activo">
                Activos
              </option>

              <option value="inactivo">
                Inactivos
              </option>
            </select>
          </div>

          <div className="br-field">
            <label>
              Rango de fechas
            </label>

            <div className="br-date-grid">
              <input
                aria-label="Fecha desde"
                className="br-control"
                type="date"
                value={fechaInicio}
                onChange={(e) =>
                  setFechaInicio(
                    e.target.value
                  )
                }
              />

              <input
                aria-label="Fecha hasta"
                className="br-control"
                type="date"
                value={fechaFin}
                onChange={(e) =>
                  setFechaFin(
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          <div className="br-actions">
            <button
              type="button"
              className="br-btn br-btn-primary"
              onClick={buscarRegistros}
              disabled={buscando}
            >
              {buscando
                ? 'Buscando...'
                : '🔎 Buscar registros'}
            </button>

            <button
              type="button"
              className="br-btn br-btn-secondary"
              onClick={limpiarFiltros}
              disabled={buscando}
            >
              Limpiar filtros
            </button>
          </div>
        </aside>

        {/* ====================================================
            RESULTADOS
        ==================================================== */}

        <main className="br-results">
          <div className="br-results-head">
            <div className="br-results-title">
              <h2>Resultados</h2>

              {resultados.length > 0 && (
                <span className="br-results-meta">
                  Mostrando {desdeResultado}–{hastaResultado}
                  {' '}de {resultados.length}
                </span>
              )}
            </div>
          </div>

          {mensaje && (
            <div className="br-message">
              {mensaje}
            </div>
          )}

          {!yaBusco && !buscando && (
            <div className="br-empty">
              <div className="br-empty-icon">
                🔎
              </div>

              <h3>
                Usa los filtros para comenzar
              </h3>

              <p>
                Puedes buscar por nombre, teléfono,
                sexo, tipo de atención, estado o fecha.
              </p>
            </div>
          )}

          {buscando && (
            <div className="br-empty">
              <div className="br-empty-icon">
                ⏳
              </div>

              <h3>
                Buscando registros...
              </h3>

              <p>
                Consultando las atenciones registradas.
              </p>
            </div>
          )}

          {yaBusco &&
            !buscando &&
            resultados.length === 0 && (
              <div className="br-empty">
                <div className="br-empty-icon">
                  📭
                </div>

                <h3>
                  No encontramos resultados
                </h3>

                <p>
                  Prueba cambiando o limpiando alguno
                  de los filtros.
                </p>
              </div>
            )}

          {!buscando &&
            resultadosPagina.length > 0 && (
              <div className="br-list">
                {resultadosPagina.map(
                  (atencion) => {
                    const abierto =
                      detalleAbierto ===
                        atencion.id_atencion ||
                      idEditando ===
                        atencion.id_atencion

                    const canalizaciones =
                      atencion.canalizaciones ?? []

                    return (
                      <article
                        className="br-card"
                        key={
                          atencion.id_atencion
                        }
                      >
                        {/* ====================================
                            MODO EDICIÓN
                        ==================================== */}

                        {idEditando ===
                        atencion.id_atencion ? (
                          <div className="br-edit">
                            <div className="br-edit-head">
                              <div className="br-avatar">
                                {obtenerIniciales(
                                  atencion.personas
                                    .nombre
                                )}
                              </div>

                              <div>
                                <h3 className="br-edit-title">
                                  Editar atención
                                </h3>

                                <p className="br-edit-subtitle">
                                  {
                                    atencion.personas
                                      .nombre
                                  }
                                </p>
                              </div>
                            </div>

                            <div className="br-edit-grid">
                              <div className="br-field">
                                <label htmlFor={`nombre-${atencion.id_atencion}`}>
                                  Nombre
                                </label>

                                <input
                                  id={`nombre-${atencion.id_atencion}`}
                                  className="br-control"
                                  type="text"
                                  value={nombreEditando}
                                  onChange={(e) =>
                                    setNombreEditando(
                                      e.target.value
                                    )
                                  }
                                />
                              </div>

                              <div className="br-field">
                                <label htmlFor={`sexo-${atencion.id_atencion}`}>
                                  Sexo
                                </label>

                                <select
                                  id={`sexo-${atencion.id_atencion}`}
                                  className="br-control"
                                  value={sexoEditando}
                                  onChange={(e) =>
                                    setSexoEditando(
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="">Selecciona</option>
                                  <option value="Mujer">Mujer</option>
                                  <option value="Hombre">Hombre</option>
                                  <option value="No binario">No binario</option>
                                  <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                                  <option value="Otro">Otro</option>
                                </select>
                              </div>

                              <div className="br-field">
                                <label htmlFor={`telefono-${atencion.id_atencion}`}>
                                  Teléfono
                                </label>

                                <input
                                  id={`telefono-${atencion.id_atencion}`}
                                  className="br-control"
                                  type="text"
                                  value={telefonoEditando}
                                  onChange={(e) =>
                                    setTelefonoEditando(
                                      e.target.value
                                    )
                                  }
                                />
                              </div>

                              <div className="br-field">
                                <label htmlFor={`correo-${atencion.id_atencion}`}>
                                  Correo
                                </label>

                                <input
                                  id={`correo-${atencion.id_atencion}`}
                                  className="br-control"
                                  type="email"
                                  value={correoEditando}
                                  onChange={(e) =>
                                    setCorreoEditando(
                                      e.target.value
                                    )
                                  }
                                  placeholder="Sin correo"
                                />
                              </div>

                              <div className="br-field">
                                <label htmlFor={`colonia-${atencion.id_atencion}`}>
                                  Colonia
                                </label>

                                <input
                                  id={`colonia-${atencion.id_atencion}`}
                                  className="br-control"
                                  type="text"
                                  value={coloniaEditando}
                                  onChange={(e) =>
                                    setColoniaEditando(
                                      e.target.value
                                    )
                                  }
                                  placeholder="Sin colonia"
                                />
                              </div>

                              <div className="br-field">
                                <label htmlFor={`edad-${atencion.id_atencion}`}>
                                  Edad
                                </label>

                                <input
                                  id={`edad-${atencion.id_atencion}`}
                                  className="br-control"
                                  type="number"
                                  min="0"
                                  value={edadEditando}
                                  onChange={(e) =>
                                    setEdadEditando(
                                      e.target.value
                                    )
                                  }
                                />
                              </div>

                              <div className="br-field br-edit-wide">
                                <label htmlFor={`tipo-edit-${atencion.id_atencion}`}>
                                  Tipo de atención
                                </label>

                                <select
                                  id={`tipo-edit-${atencion.id_atencion}`}
                                  className="br-control"
                                  value={tipoEditando}
                                  onChange={(e) =>
                                    setTipoEditando(
                                      e.target.value
                                    )
                                  }
                                >
                                  {tiposAtencion.map(
                                    (tipo) => (
                                      <option
                                        key={tipo.id_tipo_atencion}
                                        value={tipo.id_tipo_atencion}
                                      >
                                        {tipo.nombre}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>

                              <div className="br-field br-edit-wide">
                                <label htmlFor={`obs-${atencion.id_atencion}`}>
                                  Observaciones
                                </label>

                                <textarea
                                  id={`obs-${atencion.id_atencion}`}
                                  className="br-control"
                                  rows={4}
                                  value={observacionesEditando}
                                  onChange={(e) =>
                                    setObservacionesEditando(
                                      e.target.value
                                    )
                                  }
                                  placeholder="Sin observaciones"
                                />
                              </div>

                              <div className="br-edit-wide br-edit-channel">
                                <div className="br-edit-channel-head">
                                  <div>
                                    <strong>↗ Canalización</strong>
                                    <span>
                                      Edita el destino y las observaciones de canalización.
                                    </span>
                                  </div>
                                </div>

                                {canalizacionesEditando.length > 0 ? (
                                  canalizacionesEditando.map(
                                    (canalizacion, indice) => (
                                      <div
                                        className="br-edit-channel-card"
                                        key={
                                          canalizacion.id_canalizacion ??
                                          `nueva-${indice}`
                                        }
                                      >
                                        <div className="br-field">
                                          <label
                                            htmlFor={`destino-${atencion.id_atencion}-${indice}`}
                                          >
                                            Destino de canalización
                                          </label>

                                          <select
                                            id={`destino-${atencion.id_atencion}-${indice}`}
                                            className="br-control"
                                            value={
                                              canalizacion.id_destino
                                            }
                                            onChange={(e) => {
                                              const valor =
                                                e.target.value

                                              setCanalizacionesEditando(
                                                (actuales) =>
                                                  actuales.map(
                                                    (item, posicion) =>
                                                      posicion === indice
                                                        ? {
                                                            ...item,
                                                            id_destino:
                                                              valor,
                                                          }
                                                        : item
                                                  )
                                              )
                                            }}
                                          >
                                            <option value="">
                                              Selecciona un destino
                                            </option>

                                            {destinos.map(
                                              (destino) => (
                                                <option
                                                  key={destino.id_destino}
                                                  value={destino.id_destino}
                                                >
                                                  {destino.nombre}
                                                </option>
                                              )
                                            )}
                                          </select>
                                        </div>

                                        <div className="br-field">
                                          <label
                                            htmlFor={`obs-canal-${atencion.id_atencion}-${indice}`}
                                          >
                                            Observaciones de canalización
                                          </label>

                                          <textarea
                                            id={`obs-canal-${atencion.id_atencion}-${indice}`}
                                            className="br-control"
                                            rows={3}
                                            value={
                                              canalizacion.observaciones
                                            }
                                            onChange={(e) => {
                                              const valor =
                                                e.target.value

                                              setCanalizacionesEditando(
                                                (actuales) =>
                                                  actuales.map(
                                                    (item, posicion) =>
                                                      posicion === indice
                                                        ? {
                                                            ...item,
                                                            observaciones:
                                                              valor,
                                                          }
                                                        : item
                                                  )
                                              )
                                            }}
                                            placeholder="Sin observaciones"
                                          />
                                        </div>
                                      </div>
                                    )
                                  )
                                ) : (
                                  <>
                                    {!agregarCanalizacion ? (
                                      <button
                                        type="button"
                                        className="br-btn br-btn-secondary"
                                        onClick={() => {
                                          setAgregarCanalizacion(true)
                                          setCanalizacionesEditando([
                                            {
                                              id_canalizacion: null,
                                              id_destino: '',
                                              observaciones: '',
                                            },
                                          ])
                                        }}
                                      >
                                        ＋ Agregar canalización
                                      </button>
                                    ) : null}
                                  </>
                                )}

                                {agregarCanalizacion &&
                                  canalizacionesEditando.some(
                                    (item) =>
                                      item.id_canalizacion === null
                                  ) && (
                                    <button
                                      type="button"
                                      className="br-link-danger"
                                      onClick={() => {
                                        setAgregarCanalizacion(false)
                                        setCanalizacionesEditando([])
                                      }}
                                    >
                                      Cancelar nueva canalización
                                    </button>
                                  )}
                              </div>
                            </div>

                            <div className="br-card-actions">
                              <button
                                type="button"
                                className="br-btn br-btn-primary"
                                disabled={
                                  guardandoEdicion
                                }
                                onClick={() =>
                                  guardarEdicion(
                                    atencion.id_atencion
                                  )
                                }
                              >
                                {guardandoEdicion
                                  ? 'Guardando...'
                                  : 'Guardar cambios'}
                              </button>

                              <button
                                type="button"
                                className="br-btn br-btn-secondary"
                                onClick={
                                  cancelarEdicion
                                }
                                disabled={
                                  guardandoEdicion
                                }
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* ================================
                                RESUMEN
                            ================================ */}

                            <div className="br-card-main">
                              <div className="br-avatar">
                                {obtenerIniciales(
                                  atencion.personas
                                    .nombre
                                )}
                              </div>

                              <div className="br-card-info">
                                <div className="br-person-row">
                                  <h3 className="br-person-name">
                                    {
                                      atencion.personas
                                        .nombre
                                    }
                                  </h3>

                                  <span
                                    className={`br-status ${
                                      atencion.estado ===
                                      'activo'
                                        ? 'br-status-active'
                                        : 'br-status-inactive'
                                    }`}
                                  >
                                    {atencion.estado ===
                                    'activo'
                                      ? '● Activa'
                                      : '● Inactiva'}
                                  </span>
                                </div>

                                <div className="br-service">
                                  {
                                    atencion
                                      .tipos_atencion
                                      .nombre
                                  }
                                </div>

                                <div className="br-quick-meta">
                                  <span>
                                    📅{' '}
                                    {formatearFechaCorta(
                                      atencion.fecha_atencion
                                    )}
                                  </span>

                                  <span>
                                    🎂{' '}
                                    {
                                      atencion.edad_al_momento
                                    }{' '}
                                    años
                                  </span>

                                  <span>
                                    👤{' '}
                                    {
                                      atencion.personas
                                        .sexo
                                    }
                                  </span>

                                  <span>
                                    📞{' '}
                                    {
                                      atencion.personas
                                        .telefono
                                    }
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="br-view"
                                onClick={() =>
                                  alternarDetalle(
                                    atencion.id_atencion
                                  )
                                }
                                aria-expanded={
                                  abierto
                                }
                              >
                                {abierto
                                  ? 'Ocultar'
                                  : '👁 Ver detalle'}
                              </button>
                            </div>

                            {/* ================================
                                DETALLE
                            ================================ */}

                            {abierto && (
                              <div className="br-card-detail">
                                <div className="br-divider" />

                                <div className="br-detail-grid">
                                  <div className="br-detail-item">
                                    <span className="br-detail-label">
                                      Fecha y hora
                                    </span>

                                    <span className="br-detail-value">
                                      {formatearFecha(
                                        atencion.fecha_atencion
                                      )}
                                    </span>
                                  </div>

                                  <div className="br-detail-item">
                                    <span className="br-detail-label">
                                      Teléfono
                                    </span>

                                    <span className="br-detail-value">
                                      {
                                        atencion.personas
                                          .telefono
                                      }
                                    </span>
                                  </div>

                                  <div className="br-detail-item">
                                    <span className="br-detail-label">
                                      Correo
                                    </span>

                                    <span className="br-detail-value">
                                      {atencion.personas
                                        .correo ||
                                        'No registrado'}
                                    </span>
                                  </div>

                                  <div className="br-detail-item">
                                    <span className="br-detail-label">
                                      Colonia
                                    </span>

                                    <span className="br-detail-value">
                                      {atencion.personas
                                        .colonia ||
                                        'No registrada'}
                                    </span>
                                  </div>

                                  <div className="br-detail-item">
                                    <span className="br-detail-label">
                                      Tipo de atención
                                    </span>

                                    <span className="br-detail-value">
                                      {
                                        atencion
                                          .tipos_atencion
                                          .nombre
                                      }
                                    </span>
                                  </div>

                                  <div className="br-detail-item">
                                    <span className="br-detail-label">
                                      Estado
                                    </span>

                                    <span className="br-detail-value">
                                      {atencion.estado ===
                                      'activo'
                                        ? 'Activa'
                                        : 'Inactiva'}
                                    </span>
                                  </div>

                                  <div className="br-detail-item br-detail-wide">
                                    <span className="br-detail-label">
                                      Observaciones
                                    </span>

                                    <span className="br-detail-value">
                                      {atencion.observaciones ||
                                        'Sin observaciones'}
                                    </span>
                                  </div>
                                </div>

                                {canalizaciones.length >
                                  0 && (
                                  <div className="br-channel">
                                    <h4 className="br-channel-title">
                                      ↗ Canalización
                                    </h4>

                                    {canalizaciones.map(
                                      (
                                        canalizacion
                                      ) => (
                                        <div
                                          className="br-channel-item"
                                          key={
                                            canalizacion.id_canalizacion
                                          }
                                        >
                                          <p>
                                            <strong>
                                              Destino:
                                            </strong>{' '}
                                            {canalizacion
                                              .destinos_canalizacion
                                              ?.nombre ||
                                              'Sin destino'}
                                          </p>

                                          <p>
                                            <strong>
                                              Fecha:
                                            </strong>{' '}
                                            {formatearFechaCorta(
                                              canalizacion.fecha_canalizacion
                                            )}
                                          </p>

                                          {canalizacion.observaciones && (
                                            <p>
                                              {
                                                canalizacion.observaciones
                                              }
                                            </p>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}

                                <div className="br-card-actions">
                                  {atencion.estado ===
                                    'activo' && (
                                    <button
                                      type="button"
                                      className="br-btn br-btn-secondary"
                                      onClick={() =>
                                        editarAtencion(
                                          atencion
                                        )
                                      }
                                    >
                                      ✏️ Editar atención
                                    </button>
                                  )}

                                  {rol ===
                                    'administrador' &&
                                    (atencion.estado ===
                                    'activo' ? (
                                      <button
                                        type="button"
                                        className="br-btn br-btn-danger"
                                        onClick={() =>
                                          inactivarAtencion(
                                            atencion.id_atencion
                                          )
                                        }
                                      >
                                        Dar de baja
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="br-btn br-btn-success"
                                        onClick={() =>
                                          reactivarAtencion(
                                            atencion.id_atencion
                                          )
                                        }
                                      >
                                        Reactivar
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </article>
                    )
                  }
                )}
              </div>
            )}

          {/* ==================================================
              PAGINACIÓN
          ================================================== */}

          {!buscando &&
            resultados.length >
              RESULTADOS_POR_PAGINA && (
              <div className="br-pagination">
                <button
                  type="button"
                  className="br-page-btn"
                  onClick={() =>
                    setPagina((actual) =>
                      Math.max(
                        1,
                        actual - 1
                      )
                    )
                  }
                  disabled={pagina <= 1}
                  aria-label="Página anterior"
                >
                  ←
                </button>

                <span className="br-page-info">
                  Página{' '}
                  <strong>{pagina}</strong>{' '}
                  de{' '}
                  <strong>
                    {totalPaginas}
                  </strong>
                </span>

                <button
                  type="button"
                  className="br-page-btn"
                  onClick={() =>
                    setPagina((actual) =>
                      Math.min(
                        totalPaginas,
                        actual + 1
                      )
                    )
                  }
                  disabled={
                    pagina >= totalPaginas
                  }
                  aria-label="Página siguiente"
                >
                  →
                </button>
              </div>
            )}
        </main>
      </div>
    </div>
  )
}

export default BuscarRegistros
