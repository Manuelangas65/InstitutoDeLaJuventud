import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import { supabase } from '../lib/supabase'


type NuevaAtencionProps = {
  onVolver: () => void
}


type TipoAtencion = {
  id_tipo_atencion: number
  nombre: string
  categoria: string | null
}


type DestinoCanalizacion = {
  id_destino: number
  nombre: string
  tipo: string | null
}


type Persona = {
  id_persona: number
  nombre: string
  sexo: string
  telefono: string
  correo: string | null
  colonia: string | null
}


function NuevaAtencion({ onVolver }: NuevaAtencionProps) {

  // ==========================================================
  // CATÁLOGOS
  // ==========================================================

  const [tiposAtencion, setTiposAtencion] =
    useState<TipoAtencion[]>([])

  const [destinos, setDestinos] =
    useState<DestinoCanalizacion[]>([])

  const [cargandoCatalogos, setCargandoCatalogos] =
    useState(true)


  // ==========================================================
  // BÚSQUEDA DE PERSONAS
  // ==========================================================

  const [busqueda, setBusqueda] = useState('')

  const [resultadosBusqueda, setResultadosBusqueda] =
    useState<Persona[]>([])

  const [buscandoPersona, setBuscandoPersona] =
    useState(false)

  const [mensajeBusqueda, setMensajeBusqueda] =
    useState('')

  const [terminoNoEncontrado, setTerminoNoEncontrado] =
    useState('')

  const [personaSeleccionada, setPersonaSeleccionada] =
    useState<Persona | null>(null)


  // ==========================================================
  // DATOS DE PERSONA
  // ==========================================================

  const [nombre, setNombre] = useState('')
  const [sexo, setSexo] = useState('')
  const [edad, setEdad] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [colonia, setColonia] = useState('')


  // ==========================================================
  // DATOS DE ATENCIÓN
  // ==========================================================

  const [idTipoAtencion, setIdTipoAtencion] =
    useState('')

  const [observaciones, setObservaciones] =
    useState('')


  // ==========================================================
  // CANALIZACIÓN
  // ==========================================================

  const [fueCanalizada, setFueCanalizada] =
    useState(false)

  const [idDestino, setIdDestino] =
    useState('')

  const [
    observacionesCanalizacion,
    setObservacionesCanalizacion,
  ] = useState('')


  // ==========================================================
  // ESTADO GENERAL
  // ==========================================================

  const [guardando, setGuardando] =
    useState(false)

  const [mensaje, setMensaje] =
    useState('')

  const [errorMensaje, setErrorMensaje] =
    useState('')


  // ==========================================================
  // CARGAR CATÁLOGOS
  // ==========================================================

  useEffect(() => {

    async function cargarCatalogos() {

      setCargandoCatalogos(true)
      setErrorMensaje('')


      const [
        resultadoTipos,
        resultadoDestinos,
      ] = await Promise.all([

        supabase
          .from('tipos_atencion')
          .select(
            'id_tipo_atencion, nombre, categoria'
          )
          .eq('activo', true)
          .order('nombre'),

        supabase
          .from('destinos_canalizacion')
          .select(
            'id_destino, nombre, tipo'
          )
          .eq('activo', true)
          .order('nombre'),

      ])


      if (resultadoTipos.error) {

        console.error(
          'Error cargando tipos:',
          resultadoTipos.error
        )

        setErrorMensaje(
          'No se pudieron cargar los tipos de atención.'
        )
      }

      else {

        setTiposAtencion(
          resultadoTipos.data ?? []
        )
      }


      if (resultadoDestinos.error) {

        console.error(
          'Error cargando destinos:',
          resultadoDestinos.error
        )

        setErrorMensaje(
          'No se pudieron cargar los destinos de canalización.'
        )
      }

      else {

        setDestinos(
          resultadoDestinos.data ?? []
        )
      }


      setCargandoCatalogos(false)
    }


    cargarCatalogos()

  }, [])


  // ==========================================================
  // BUSCAR PERSONAS
  // ==========================================================

  async function buscarPersonas() {

    const termino = busqueda.trim()

    setMensajeBusqueda('')
    setTerminoNoEncontrado('')
    setResultadosBusqueda([])


    if (termino.length < 2) {

      setMensajeBusqueda(
        'Escribe al menos 2 caracteres para buscar.'
      )

      return
    }


    setBuscandoPersona(true)


    const { data, error } = await supabase
      .from('personas')
      .select(`
        id_persona,
        nombre,
        sexo,
        telefono,
        correo,
        colonia
      `)
      .eq('activo', true)
      .or(
        `nombre.ilike.%${termino}%,telefono.ilike.%${termino}%`
      )
      .order('nombre')
      .limit(10)


    if (error) {

      console.error(
        'Error buscando personas:',
        error
      )

      setMensajeBusqueda(
        'No se pudo realizar la búsqueda.'
      )

      setBuscandoPersona(false)

      return
    }


    const personas = data ?? []

    setResultadosBusqueda(personas)


    if (personas.length === 0) {

      setTerminoNoEncontrado(termino)
    }


    setBuscandoPersona(false)
  }


  // ==========================================================
  // AGREGAR PERSONA NO ENCONTRADA
  // ==========================================================

  function agregarPersonaNoEncontrada() {

    const termino = terminoNoEncontrado.trim()

    if (!termino) {
      return
    }


    const soloNumeros = termino.replace(/\D/g, '')

    const pareceTelefono =
      soloNumeros.length >= 7 &&
      /^[\d\s()+-]+$/.test(termino)


    setPersonaSeleccionada(null)

    setNombre(
      pareceTelefono
        ? ''
        : termino
    )

    setTelefono(
      pareceTelefono
        ? termino
        : ''
    )

    setSexo('')
    setEdad('')
    setCorreo('')
    setColonia('')

    setBusqueda('')
    setResultadosBusqueda([])
    setMensajeBusqueda('')
    setTerminoNoEncontrado('')

    setMensaje('')
    setErrorMensaje('')


    window.setTimeout(() => {

      const campoDestino = document.getElementById(
        pareceTelefono
          ? 'telefono'
          : 'nombre'
      )

      campoDestino?.focus()

    }, 0)
  }



  // ==========================================================
  // SELECCIONAR PERSONA EXISTENTE
  // ==========================================================

  function seleccionarPersona(persona: Persona) {

    setPersonaSeleccionada(persona)

    setNombre(persona.nombre)
    setSexo(persona.sexo)
    setTelefono(persona.telefono)
    setCorreo(persona.correo ?? '')
    setColonia(persona.colonia ?? '')

    setEdad('')

    setBusqueda('')
    setResultadosBusqueda([])
    setMensajeBusqueda('')
    setTerminoNoEncontrado('')

    setMensaje('')
    setErrorMensaje('')
  }


  // ==========================================================
  // PERSONA NUEVA
  // ==========================================================

  function registrarPersonaNueva() {

    setPersonaSeleccionada(null)

    setNombre('')
    setSexo('')
    setEdad('')
    setTelefono('')
    setCorreo('')
    setColonia('')

    setBusqueda('')
    setResultadosBusqueda([])
    setMensajeBusqueda('')
    setTerminoNoEncontrado('')

    setMensaje('')
    setErrorMensaje('')
  }


  // ==========================================================
  // LIMPIAR FORMULARIO
  // ==========================================================

  function limpiarFormulario() {

    setPersonaSeleccionada(null)

    setBusqueda('')
    setResultadosBusqueda([])
    setMensajeBusqueda('')
    setTerminoNoEncontrado('')

    setNombre('')
    setSexo('')
    setEdad('')
    setTelefono('')
    setCorreo('')
    setColonia('')

    setIdTipoAtencion('')
    setObservaciones('')

    setFueCanalizada(false)
    setIdDestino('')
    setObservacionesCanalizacion('')
  }


  // ==========================================================
  // REGLA DE EDAD POR TIPO DE ATENCIÓN
  // ==========================================================

  const tipoAtencionSeleccionado =
    tiposAtencion.find(
      (tipo) =>
        String(tipo.id_tipo_atencion) === idTipoAtencion
    )

  const nombreTipoNormalizado =
    (tipoAtencionSeleccionado?.nombre ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase()

  const esJovenesConstruyendoElFuturo =
    nombreTipoNormalizado ===
    'JOVENES CONSTRUYENDO EL FUTURO'


  // ==========================================================
  // GUARDAR
  // ==========================================================

  async function guardarAtencion(
    e: FormEvent<HTMLFormElement>
  ) {

    e.preventDefault()

    setMensaje('')
    setErrorMensaje('')


    const edadNumero = Number(edad)


    // ========================================================
    // VALIDACIONES
    // ========================================================

    if (
      !Number.isInteger(edadNumero) ||
      edadNumero < 0
    ) {

      setErrorMensaje(
        'La edad debe ser un número entero de 0 años o más.'
      )

      return
    }


    if (
      esJovenesConstruyendoElFuturo &&
      edadNumero > 29
    ) {

      setErrorMensaje(
        'Para JÓVENES CONSTRUYENDO EL FUTURO la edad máxima permitida es de 29 años.'
      )

      return
    }


    if (!idTipoAtencion) {

      setErrorMensaje(
        'Selecciona un tipo de atención.'
      )

      return
    }


    if (fueCanalizada && !idDestino) {

      setErrorMensaje(
        'Selecciona el destino de canalización.'
      )

      return
    }


    if (!personaSeleccionada) {

      if (!nombre.trim()) {

        setErrorMensaje(
          'El nombre es obligatorio.'
        )

        return
      }


      if (!sexo) {

        setErrorMensaje(
          'Selecciona el sexo.'
        )

        return
      }


      if (!telefono.trim()) {

        setErrorMensaje(
          'El teléfono es obligatorio.'
        )

        return
      }
    }


    setGuardando(true)


    try {

      // ======================================================
      // USUARIO ACTUAL
      // ======================================================

      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser()


      if (errorUsuario || !user) {

        throw new Error(
          'No se pudo identificar al usuario.'
        )
      }


      // ======================================================
      // OBTENER / CREAR PERSONA
      // ======================================================

      let idPersona: number


      if (personaSeleccionada) {

        idPersona =
          personaSeleccionada.id_persona
      }

      else {

        const {
          data: personaNueva,
          error: errorPersona,
        } = await supabase
          .from('personas')
          .insert({
            nombre: nombre.trim(),
            sexo,
            telefono: telefono.trim(),

            correo:
              correo.trim() || null,

            colonia:
              colonia.trim() || null,
          })
          .select('id_persona')
          .single()


        if (errorPersona) {

          console.error(
            'Error registrando persona:',
            errorPersona
          )

          throw new Error(
            'No se pudo registrar a la persona.'
          )
        }


        idPersona =
          personaNueva.id_persona
      }


      // ======================================================
      // CREAR ATENCIÓN
      // ======================================================

      const {
        data: atencionNueva,
        error: errorAtencion,
      } = await supabase
        .from('atenciones')
        .insert({
          id_persona: idPersona,

          id_tipo_atencion:
            Number(idTipoAtencion),

          edad_al_momento:
            edadNumero,

          observaciones:
            observaciones.trim() || null,

          creado_por:
            user.id,
        })
        .select('id_atencion')
        .single()


      if (errorAtencion) {

        console.error(
          'Error registrando atención:',
          errorAtencion
        )

        throw new Error(
          'No se pudo registrar la atención.'
        )
      }


      // ======================================================
      // CREAR CANALIZACIÓN SI APLICA
      // ======================================================

      if (fueCanalizada) {

        const {
          error: errorCanalizacion,
        } = await supabase
          .from('canalizaciones')
          .insert({

            id_atencion:
              atencionNueva.id_atencion,

            id_destino:
              Number(idDestino),

            observaciones:
              observacionesCanalizacion.trim()
              || null,
          })


        if (errorCanalizacion) {

          console.error(
            'Error registrando canalización:',
            errorCanalizacion
          )

          throw new Error(
            'La atención se registró, pero hubo un problema al guardar la canalización.'
          )
        }
      }


      // ======================================================
      // ÉXITO
      // ======================================================

      setMensaje(
        fueCanalizada
          ? 'Atención y canalización guardadas correctamente.'
          : 'Atención guardada correctamente.'
      )

      limpiarFormulario()

    }

    catch (error) {

      console.error(error)


      if (error instanceof Error) {

        setErrorMensaje(
          error.message
        )
      }

      else {

        setErrorMensaje(
          'Ocurrió un error inesperado.'
        )
      }
    }

    finally {

      setGuardando(false)
    }
  }


  // ==========================================================
  // INTERFAZ
  // ==========================================================

  return (
    <div className="na-page">

      {/* ==================================================== */}
      {/* ENCABEZADO */}
      {/* ==================================================== */}

      <div className="na-header">

        <div>
          <button
            type="button"
            className="na-back-button"
            onClick={onVolver}
          >
            <span>←</span>
            Volver al inicio
          </button>

          <h1>Nueva atención</h1>

          <p>
            Registra una nueva atención y consulta primero si la
            persona ya se encuentra en el sistema.
          </p>
        </div>

        <div className="na-header-badge">
          <span className="na-header-badge-icon">＋</span>

          <div>
            <strong>Nuevo registro</strong>
            <small>Sistema de atenciones</small>
          </div>
        </div>

      </div>


      {/* ==================================================== */}
      {/* BUSCADOR */}
      {/* ==================================================== */}

      <section className="na-card">

        <div className="na-section-header">

          <div className="na-section-number">
            1
          </div>

          <div>
            <h2>Buscar persona</h2>

            <p>
              Antes de crear un registro nuevo, verifica si la
              persona ya existe.
            </p>
          </div>

        </div>


        <div className="na-search-row">

          <div className="na-field na-search-field">

            <label htmlFor="busqueda">
              Nombre o teléfono
            </label>

            <input
              id="busqueda"
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)

                if (terminoNoEncontrado) {
                  setTerminoNoEncontrado('')
                }

                if (mensajeBusqueda) {
                  setMensajeBusqueda('')
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()

                  if (
                    terminoNoEncontrado &&
                    busqueda.trim() === terminoNoEncontrado
                  ) {
                    agregarPersonaNoEncontrada()
                  }

                  else {
                    buscarPersonas()
                  }
                }
              }}
              placeholder="Ej. Juan Pérez o 4691234567"
            />

          </div>


          <button
            type="button"
            className="na-primary-button na-search-button"
            onClick={buscarPersonas}
            disabled={buscandoPersona}
          >
            {buscandoPersona
              ? 'Buscando...'
              : 'Buscar persona'}
          </button>

        </div>


        {mensajeBusqueda && (
          <div className="na-search-message">
            <span>ⓘ</span>
            {mensajeBusqueda}
          </div>
        )}


        {terminoNoEncontrado && (
          <div className="na-not-found">

            <div className="na-not-found-icon">
              ?
            </div>

            <div className="na-not-found-content">

              <strong>
                Persona no encontrada
              </strong>

              <p>
                No encontramos ningún registro que coincida con
                {' '}
                <b>“{terminoNoEncontrado}”</b>.
              </p>

              <small>
                Puedes agregarla como una persona nueva haciendo
                clic en el botón o presionando Enter nuevamente.
              </small>

            </div>

            <button
              type="button"
              className="na-primary-button na-add-person-button"
              onClick={agregarPersonaNoEncontrada}
            >
              + Agregar persona
            </button>

          </div>
        )}


        {/* ================================================== */}
        {/* RESULTADOS */}
        {/* ================================================== */}

        {resultadosBusqueda.length > 0 && (

          <div className="na-results">

            <div className="na-results-header">
              <h3>
                Resultados encontrados
              </h3>

              <span>
                {resultadosBusqueda.length}
                {' '}
                {resultadosBusqueda.length === 1
                  ? 'persona'
                  : 'personas'}
              </span>
            </div>


            <div className="na-results-grid">

              {resultadosBusqueda.map(
                (persona) => (

                  <div
                    key={persona.id_persona}
                    className="na-person-result"
                  >

                    <div className="na-person-avatar">
                      {persona.nombre
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>


                    <div className="na-person-info">

                      <strong>
                        {persona.nombre}
                      </strong>

                      <span>
                        Tel. {persona.telefono}
                      </span>

                      <span>
                        {persona.sexo}
                        {persona.colonia
                          ? ` · ${persona.colonia}`
                          : ''}
                      </span>

                    </div>


                    <button
                      type="button"
                      className="na-select-button"
                      onClick={() =>
                        seleccionarPersona(persona)
                      }
                    >
                      Seleccionar
                    </button>

                  </div>

                )
              )}

            </div>

          </div>

        )}


        <div className="na-new-person-area">

          <div>
            <strong>
              ¿No encontraste a la persona?
            </strong>

            <span>
              Puedes crear un registro nuevo para continuar.
            </span>
          </div>

          <button
            type="button"
            className="na-secondary-button"
            onClick={registrarPersonaNueva}
          >
            + Registrar persona nueva
          </button>

        </div>

      </section>


      {/* ==================================================== */}
      {/* FORMULARIO */}
      {/* ==================================================== */}

      <form onSubmit={guardarAtencion}>

        {/* ================================================== */}
        {/* DATOS PERSONALES */}
        {/* ================================================== */}

        <section className="na-card">

          <div className="na-section-header">

            <div className="na-section-number">
              2
            </div>

            <div>
              <h2>Datos de la persona</h2>

              <p>
                Captura la información general de la persona que
                recibe la atención.
              </p>
            </div>

          </div>


          {personaSeleccionada && (

            <div className="na-selected-person">

              <div className="na-selected-icon">
                ✓
              </div>

              <div className="na-selected-data">
                <small>
                  PERSONA SELECCIONADA
                </small>

                <strong>
                  {personaSeleccionada.nombre}
                </strong>

                <span>
                  {personaSeleccionada.telefono}
                </span>
              </div>

              <button
                type="button"
                className="na-change-button"
                onClick={registrarPersonaNueva}
              >
                Cambiar
              </button>

            </div>

          )}


          <div className="na-form-grid">

            <div className="na-field na-field-wide">

              <label htmlFor="nombre">
                Nombre completo
                <span className="na-required">*</span>
              </label>

              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) =>
                  setNombre(e.target.value)
                }
                disabled={
                  personaSeleccionada !== null
                }
                required={
                  personaSeleccionada === null
                }
                placeholder="Nombre completo de la persona"
              />

            </div>


            <div className="na-field">

              <label htmlFor="sexo">
                Sexo
                <span className="na-required">*</span>
              </label>

              <select
                id="sexo"
                value={sexo}
                onChange={(e) =>
                  setSexo(e.target.value)
                }
                disabled={
                  personaSeleccionada !== null
                }
                required={
                  personaSeleccionada === null
                }
              >
                <option value="">
                  Selecciona una opción
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


            <div className="na-field">

              <label htmlFor="edad">
                Edad actual
                <span className="na-required">*</span>
              </label>

              <input
                id="edad"
                type="number"
                min="0"
                max={
                  esJovenesConstruyendoElFuturo
                    ? 29
                    : undefined
                }
                value={edad}
                onChange={(e) =>
                  setEdad(e.target.value)
                }
                required
                placeholder={
                  esJovenesConstruyendoElFuturo
                    ? '0 - 29'
                    : '0 o más'
                }
              />

              <small className="na-helper">
                {esJovenesConstruyendoElFuturo
                  ? 'Para JÓVENES CONSTRUYENDO EL FUTURO: máximo 29 años.'
                  : 'Sin límite máximo de edad para este tipo de atención.'}
              </small>

            </div>


            <div className="na-field">

              <label htmlFor="telefono">
                Teléfono
                <span className="na-required">*</span>
              </label>

              <input
                id="telefono"
                type="tel"
                value={telefono}
                onChange={(e) =>
                  setTelefono(e.target.value)
                }
                disabled={
                  personaSeleccionada !== null
                }
                required={
                  personaSeleccionada === null
                }
                placeholder="Ej. 4691234567"
              />

            </div>


            <div className="na-field">

              <label htmlFor="correo">
                Correo electrónico
                <span className="na-optional">
                  Opcional
                </span>
              </label>

              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) =>
                  setCorreo(e.target.value)
                }
                disabled={
                  personaSeleccionada !== null
                }
                placeholder="correo@ejemplo.com"
              />

            </div>


            <div className="na-field na-field-wide">

              <label htmlFor="colonia">
                Colonia
                <span className="na-optional">
                  Opcional
                </span>
              </label>

              <input
                id="colonia"
                type="text"
                value={colonia}
                onChange={(e) =>
                  setColonia(e.target.value)
                }
                disabled={
                  personaSeleccionada !== null
                }
                placeholder="Colonia o comunidad"
              />

            </div>

          </div>

        </section>


        {/* ================================================== */}
        {/* DATOS DE ATENCIÓN */}
        {/* ================================================== */}

        <section className="na-card">

          <div className="na-section-header">

            <div className="na-section-number">
              3
            </div>

            <div>
              <h2>Datos de la atención</h2>

              <p>
                Indica el tipo de servicio brindado y agrega
                información relevante.
              </p>
            </div>

          </div>


          <div className="na-form-grid">

            <div className="na-field na-field-wide">

              <label htmlFor="tipoAtencion">
                Tipo de atención
                <span className="na-required">*</span>
              </label>

              <select
                id="tipoAtencion"
                value={idTipoAtencion}
                onChange={(e) =>
                  setIdTipoAtencion(
                    e.target.value
                  )
                }
                disabled={cargandoCatalogos}
                required
              >

                <option value="">
                  {cargandoCatalogos
                    ? 'Cargando tipos de atención...'
                    : 'Selecciona un tipo de atención'}
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
                      {tipo.categoria
                        ? `${tipo.nombre} — ${tipo.categoria}`
                        : tipo.nombre}
                    </option>

                  )
                )}

              </select>

            </div>


            <div className="na-field na-field-full">

              <label htmlFor="observaciones">
                Observaciones
                <span className="na-optional">
                  Opcional
                </span>
              </label>

              <textarea
                id="observaciones"
                rows={5}
                value={observaciones}
                onChange={(e) =>
                  setObservaciones(
                    e.target.value
                  )
                }
                placeholder="Escribe aquí detalles relevantes sobre la atención..."
              />

            </div>

          </div>

        </section>


        {/* ================================================== */}
        {/* CANALIZACIÓN */}
        {/* ================================================== */}

        <section
          className={
            fueCanalizada
              ? 'na-card na-card-highlight'
              : 'na-card'
          }
        >

          <div className="na-section-header">

            <div className="na-section-number">
              4
            </div>

            <div>
              <h2>Canalización</h2>

              <p>
                Indica si la persona fue dirigida a otra
                institución o área para continuar su atención.
              </p>
            </div>

          </div>


          <div className="na-channel-question">

            <div>
              <strong>
                ¿La persona fue canalizada?
              </strong>

              <span>
                Selecciona una opción para continuar.
              </span>
            </div>


            <div className="na-toggle-options">

              <button
                type="button"
                className={
                  !fueCanalizada
                    ? 'na-toggle active'
                    : 'na-toggle'
                }
                onClick={() => {
                  setFueCanalizada(false)
                  setIdDestino('')
                  setObservacionesCanalizacion('')
                }}
              >
                No
              </button>

              <button
                type="button"
                className={
                  fueCanalizada
                    ? 'na-toggle active'
                    : 'na-toggle'
                }
                onClick={() =>
                  setFueCanalizada(true)
                }
              >
                Sí
              </button>

            </div>

          </div>


          {fueCanalizada && (

            <div className="na-channel-content">

              <div className="na-channel-notice">
                <span>↗</span>

                <div>
                  <strong>
                    Información de canalización
                  </strong>

                  <p>
                    Selecciona el destino al que fue enviada
                    la persona.
                  </p>
                </div>
              </div>


              <div className="na-form-grid">

                <div className="na-field na-field-wide">

                  <label htmlFor="destino">
                    Destino de canalización
                    <span className="na-required">*</span>
                  </label>

                  <select
                    id="destino"
                    value={idDestino}
                    onChange={(e) =>
                      setIdDestino(
                        e.target.value
                      )
                    }
                    required
                  >

                    <option value="">
                      Selecciona un destino
                    </option>


                    {destinos.map(
                      (destino) => (

                        <option
                          key={
                            destino.id_destino
                          }
                          value={
                            destino.id_destino
                          }
                        >
                          {destino.tipo
                            ? `${destino.nombre} — ${destino.tipo}`
                            : destino.nombre}
                        </option>

                      )
                    )}

                  </select>

                </div>


                <div className="na-field na-field-full">

                  <label htmlFor="observacionesCanalizacion">
                    Observaciones de canalización
                    <span className="na-optional">
                      Opcional
                    </span>
                  </label>

                  <textarea
                    id="observacionesCanalizacion"
                    rows={4}
                    value={
                      observacionesCanalizacion
                    }
                    onChange={(e) =>
                      setObservacionesCanalizacion(
                        e.target.value
                      )
                    }
                    placeholder="Agrega información adicional sobre la canalización..."
                  />

                </div>

              </div>

            </div>

          )}

        </section>


        {/* ================================================== */}
        {/* MENSAJES */}
        {/* ================================================== */}

        {errorMensaje && (

          <div className="na-alert na-alert-error">

            <div className="na-alert-icon">
              !
            </div>

            <div>
              <strong>
                No se pudo completar el registro
              </strong>

              <p>
                {errorMensaje}
              </p>
            </div>

          </div>

        )}


        {mensaje && (

          <div className="na-alert na-alert-success">

            <div className="na-alert-icon">
              ✓
            </div>

            <div>
              <strong>
                Registro completado
              </strong>

              <p>
                {mensaje}
              </p>
            </div>

          </div>

        )}


        {/* ================================================== */}
        {/* ACCIONES */}
        {/* ================================================== */}

        <div className="na-actions">

          <div className="na-actions-info">
            <span>*</span>
            Los campos marcados son obligatorios.
          </div>


          <div className="na-actions-buttons">

            <button
              type="button"
              className="na-secondary-button"
              onClick={onVolver}
              disabled={guardando}
            >
              Cancelar
            </button>


            <button
              type="submit"
              className="na-primary-button na-save-button"
              disabled={
                guardando ||
                cargandoCatalogos
              }
            >

              {guardando
                ? 'Guardando atención...'
                : 'Guardar atención'}

            </button>

          </div>

        </div>

      </form>


      {/* ==================================================== */}
      {/* ESTILOS */}
      {/* ==================================================== */}

      <style>{`

        .na-page {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 8px 0 40px;
          box-sizing: border-box;
        }


        /* ================================================== */
        /* HEADER */
        /* ================================================== */

        .na-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .na-header h1 {
          margin: 14px 0 8px;
          color: var(--text);
          font-size: clamp(28px, 4vw, 38px);
          line-height: 1.1;
          letter-spacing: -0.8px;
        }

        .na-header p {
          max-width: 680px;
          margin: 0;
          color: var(--text-soft);
          font-size: 15px;
          line-height: 1.6;
        }

        .na-back-button {
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

        .na-back-button:hover {
          opacity: 0.75;
        }

        .na-back-button span {
          font-size: 18px;
        }

        .na-header-badge {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          gap: 12px;
          min-width: 210px;
          padding: 14px 17px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .na-header-badge-icon {
          display: flex;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 12px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 24px;
          font-weight: 500;
        }

        .na-header-badge div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .na-header-badge strong {
          color: var(--text);
          font-size: 13px;
        }

        .na-header-badge small {
          color: var(--text-soft);
          font-size: 11px;
        }


        /* ================================================== */
        /* TARJETAS */
        /* ================================================== */

        .na-card {
          margin-bottom: 22px;
          padding: 28px;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: var(--surface);
          box-shadow: var(--shadow);
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .na-card-highlight {
          border-color: color-mix(
            in srgb,
            var(--primary) 45%,
            var(--border)
          );
        }

        .na-section-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 25px;
        }

        .na-section-number {
          display: flex;
          width: 38px;
          height: 38px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 12px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 15px;
          font-weight: 800;
        }

        .na-section-header h2 {
          margin: 1px 0 5px;
          color: var(--text);
          font-size: 19px;
          line-height: 1.25;
        }

        .na-section-header p {
          margin: 0;
          color: var(--text-soft);
          font-size: 13px;
          line-height: 1.5;
        }


        /* ================================================== */
        /* CAMPOS */
        /* ================================================== */

        .na-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }

        .na-field {
          min-width: 0;
        }

        .na-field-wide {
          grid-column: span 2;
        }

        .na-field-full {
          grid-column: 1 / -1;
        }

        .na-field label {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 8px;
          color: var(--text);
          font-size: 13px;
          font-weight: 700;
        }

        .na-field input,
        .na-field select,
        .na-field textarea {
          width: 100%;
          box-sizing: border-box;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .na-field textarea {
          min-height: 110px;
          resize: vertical;
          line-height: 1.55;
        }

        .na-field input:focus,
        .na-field select:focus,
        .na-field textarea:focus {
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

        .na-field input:disabled,
        .na-field select:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .na-required {
          color: var(--primary);
          font-size: 14px;
        }

        .na-optional {
          margin-left: 4px;
          color: var(--text-soft);
          font-size: 10px;
          font-weight: 500;
        }

        .na-helper {
          display: block;
          margin-top: 6px;
          color: var(--text-soft);
          font-size: 11px;
        }


        /* ================================================== */
        /* BUSCADOR */
        /* ================================================== */

        .na-search-row {
          display: flex;
          align-items: flex-end;
          gap: 12px;
        }

        .na-search-field {
          flex: 1;
        }

        .na-search-button {
          min-width: 150px;
          min-height: 43px;
        }

        .na-search-message {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 13px;
          padding: 11px 13px;
          border-radius: 10px;
          background: var(--surface-soft);
          color: var(--text-soft);
          font-size: 12px;
        }

        .na-search-message span {
          color: var(--primary);
          font-weight: 800;
        }


        .na-not-found {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 16px;
          padding: 16px;
          border: 1px solid
            color-mix(
              in srgb,
              var(--primary) 28%,
              var(--border)
            );
          border-radius: 13px;
          background: var(--surface-soft);
        }

        .na-not-found-icon {
          display: flex;
          width: 38px;
          height: 38px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--surface);
          color: var(--primary);
          font-size: 17px;
          font-weight: 900;
          box-shadow: 0 0 0 1px var(--border);
        }

        .na-not-found-content {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 3px;
        }

        .na-not-found-content strong {
          color: var(--text);
          font-size: 13px;
        }

        .na-not-found-content p {
          margin: 0;
          color: var(--text-soft);
          font-size: 12px;
          line-height: 1.45;
        }

        .na-not-found-content b {
          color: var(--text);
          font-weight: 700;
        }

        .na-not-found-content small {
          color: var(--text-soft);
          font-size: 10px;
          line-height: 1.4;
        }

        .na-add-person-button {
          flex-shrink: 0;
          white-space: nowrap;
        }


        /* ================================================== */
        /* RESULTADOS */
        /* ================================================== */

        .na-results {
          margin-top: 22px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }

        .na-results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .na-results-header h3 {
          margin: 0;
          color: var(--text);
          font-size: 14px;
        }

        .na-results-header > span {
          padding: 5px 9px;
          border-radius: 999px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 10px;
          font-weight: 700;
        }

        .na-results-grid {
          display: grid;
          gap: 10px;
        }

        .na-person-result {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 13px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: var(--bg);
          transition:
            transform 0.15s ease,
            border-color 0.15s ease;
        }

        .na-person-result:hover {
          border-color: var(--primary);
          transform: translateY(-1px);
        }

        .na-person-avatar {
          display: flex;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 15px;
          font-weight: 800;
        }

        .na-person-info {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 2px;
        }

        .na-person-info strong {
          overflow: hidden;
          color: var(--text);
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .na-person-info span {
          color: var(--text-soft);
          font-size: 11px;
        }

        .na-select-button {
          padding: 8px 13px;
          border: 1px solid var(--primary);
          border-radius: 9px;
          background: transparent;
          color: var(--primary);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .na-select-button:hover {
          background: var(--surface-soft);
        }


        /* ================================================== */
        /* PERSONA NUEVA */
        /* ================================================== */

        .na-new-person-area {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 22px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }

        .na-new-person-area > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .na-new-person-area strong {
          color: var(--text);
          font-size: 12px;
        }

        .na-new-person-area span {
          color: var(--text-soft);
          font-size: 11px;
        }


        /* ================================================== */
        /* PERSONA SELECCIONADA */
        /* ================================================== */

        .na-selected-person {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 22px;
          padding: 14px 16px;
          border: 1px solid
            color-mix(
              in srgb,
              var(--primary) 35%,
              var(--border)
            );
          border-radius: 13px;
          background: var(--surface-soft);
        }

        .na-selected-icon {
          display: flex;
          width: 35px;
          height: 35px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          font-size: 14px;
          font-weight: 800;
        }

        .na-selected-data {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 2px;
        }

        .na-selected-data small {
          color: var(--primary);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.7px;
        }

        .na-selected-data strong {
          color: var(--text);
          font-size: 13px;
        }

        .na-selected-data span {
          color: var(--text-soft);
          font-size: 11px;
        }

        .na-change-button {
          border: none;
          background: transparent;
          color: var(--primary);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }


        /* ================================================== */
        /* BOTONES */
        /* ================================================== */

        .na-primary-button,
        .na-secondary-button {
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            opacity 0.15s ease,
            box-shadow 0.15s ease;
        }

        .na-primary-button {
          padding: 11px 18px;
          border: 1px solid var(--primary);
          background: var(--primary);
          color: white;
        }

        .na-primary-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 7px 16px
            color-mix(
              in srgb,
              var(--primary) 22%,
              transparent
            );
        }

        .na-secondary-button {
          padding: 10px 16px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
        }

        .na-secondary-button:hover:not(:disabled) {
          border-color: var(--primary);
          color: var(--primary);
        }

        .na-primary-button:disabled,
        .na-secondary-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }


        /* ================================================== */
        /* CANALIZACIÓN */
        /* ================================================== */

        .na-channel-question {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: var(--bg);
        }

        .na-channel-question > div:first-child {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .na-channel-question strong {
          color: var(--text);
          font-size: 13px;
        }

        .na-channel-question span {
          color: var(--text-soft);
          font-size: 11px;
        }

        .na-toggle-options {
          display: flex;
          gap: 5px;
          padding: 4px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--surface);
        }

        .na-toggle {
          min-width: 55px;
          padding: 7px 13px;
          border: none;
          border-radius: 7px;
          background: transparent;
          color: var(--text-soft);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .na-toggle.active {
          background: var(--primary);
          color: white;
        }

        .na-channel-content {
          margin-top: 18px;
        }

        .na-channel-notice {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin-bottom: 19px;
          padding: 12px 14px;
          border-radius: 11px;
          background: var(--surface-soft);
        }

        .na-channel-notice > span {
          color: var(--primary);
          font-size: 17px;
          font-weight: 800;
        }

        .na-channel-notice strong {
          color: var(--text);
          font-size: 12px;
        }

        .na-channel-notice p {
          margin: 3px 0 0;
          color: var(--text-soft);
          font-size: 11px;
        }


        /* ================================================== */
        /* ALERTAS */
        /* ================================================== */

        .na-alert {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 18px;
          padding: 14px 16px;
          border: 1px solid;
          border-radius: 13px;
        }

        .na-alert-icon {
          display: flex;
          width: 27px;
          height: 27px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 900;
        }

        .na-alert strong {
          color: var(--text);
          font-size: 12px;
        }

        .na-alert p {
          margin: 3px 0 0;
          color: var(--text-soft);
          font-size: 11px;
          line-height: 1.45;
        }

        .na-alert-error {
          border-color: color-mix(
            in srgb,
            var(--danger) 40%,
            var(--border)
          );
          background: color-mix(
            in srgb,
            var(--danger) 7%,
            var(--surface)
          );
        }

        .na-alert-error .na-alert-icon {
          background: var(--danger);
          color: white;
        }

        .na-alert-success {
          border-color: #8ac9a3;
          background: color-mix(
            in srgb,
            #2f9e62 7%,
            var(--surface)
          );
        }

        .na-alert-success .na-alert-icon {
          background: #2f9e62;
          color: white;
        }


        /* ================================================== */
        /* ACCIONES */
        /* ================================================== */

        .na-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 5px;
          padding: 20px 0 5px;
        }

        .na-actions-info {
          color: var(--text-soft);
          font-size: 11px;
        }

        .na-actions-info span {
          color: var(--primary);
          font-weight: 800;
        }

        .na-actions-buttons {
          display: flex;
          gap: 10px;
        }

        .na-save-button {
          min-width: 165px;
        }


        /* ================================================== */
        /* RESPONSIVE */
        /* ================================================== */

        @media (max-width: 800px) {

          .na-page {
            padding-bottom: 25px;
          }

          .na-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .na-header-badge {
            display: none;
          }

          .na-card {
            padding: 22px;
            border-radius: 16px;
          }

          .na-form-grid {
            grid-template-columns: 1fr;
          }

          .na-field-wide,
          .na-field-full {
            grid-column: 1;
          }

          .na-search-row {
            align-items: stretch;
            flex-direction: column;
          }

          .na-search-button {
            width: 100%;
          }

          .na-not-found {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .na-not-found-content {
            width: calc(100% - 55px);
          }

          .na-add-person-button {
            width: 100%;
          }

          .na-new-person-area {
            align-items: stretch;
            flex-direction: column;
          }

          .na-new-person-area button {
            width: 100%;
          }

          .na-channel-question {
            align-items: stretch;
            flex-direction: column;
          }

          .na-toggle-options {
            width: 100%;
            box-sizing: border-box;
          }

          .na-toggle {
            flex: 1;
          }

          .na-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .na-actions-buttons {
            width: 100%;
          }

          .na-actions-buttons button {
            flex: 1;
          }

        }


        @media (max-width: 520px) {

          .na-card {
            padding: 18px;
          }

          .na-section-number {
            width: 34px;
            height: 34px;
          }

          .na-person-result {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .na-person-info {
            width: calc(100% - 55px);
          }

          .na-select-button {
            width: 100%;
          }

          .na-selected-person {
            flex-wrap: wrap;
          }

          .na-change-button {
            width: 100%;
            padding-top: 6px;
            text-align: left;
          }

          .na-actions-buttons {
            flex-direction: column-reverse;
          }

          .na-actions-buttons button {
            width: 100%;
          }

        }

      `}</style>

    </div>
  )
}


export default NuevaAtencion