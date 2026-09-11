/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type AdministracionProps = {
  onVolver: () => void
}

type TipoAtencion = {
  id_tipo_atencion: number
  nombre: string
  categoria: string | null
  descripcion: string | null
  activo: boolean
}

type Destino = {
  id_destino: number
  nombre: string
  tipo: string | null
  activo: boolean
}

type CategoriaDocumento = {
  id_categoria: number
  nombre: string
  descripcion: string | null
  activo: boolean
}

type Seccion =
  | 'tipos'
  | 'destinos'
  | 'categorias'

function Administracion({
  onVolver,
}: AdministracionProps) {
  const [seccion, setSeccion] =
    useState<Seccion>('tipos')

  const [tipos, setTipos] =
    useState<TipoAtencion[]>([])

  const [destinos, setDestinos] =
    useState<Destino[]>([])

  const [categorias, setCategorias] =
    useState<CategoriaDocumento[]>([])

  const [cargando, setCargando] =
    useState(true)

  const [mensaje, setMensaje] =
    useState('')

  const [errorMensaje, setErrorMensaje] =
    useState('')

  // ==========================================================
  // FORMULARIOS
  // ==========================================================

  const [nombreTipo, setNombreTipo] =
    useState('')

  const [categoriaTipo, setCategoriaTipo] =
    useState('')

  const [descripcionTipo, setDescripcionTipo] =
    useState('')

  const [nombreDestino, setNombreDestino] =
    useState('')

  const [tipoDestino, setTipoDestino] =
    useState('')

  const [nombreCategoria, setNombreCategoria] =
    useState('')

  const [
    descripcionCategoria,
    setDescripcionCategoria,
  ] = useState('')

  // ==========================================================
  // CARGAR CATÁLOGOS
  // ==========================================================

  async function cargarCatalogos() {
    setCargando(true)
    setErrorMensaje('')

    const [
      resultadoTipos,
      resultadoDestinos,
      resultadoCategorias,
    ] = await Promise.all([
      supabase
        .from('tipos_atencion')
        .select(`
          id_tipo_atencion,
          nombre,
          categoria,
          descripcion,
          activo
        `)
        .order('nombre'),

      supabase
        .from('destinos_canalizacion')
        .select(`
          id_destino,
          nombre,
          tipo,
          activo
        `)
        .order('nombre'),

      supabase
        .from('categorias_documento')
        .select(`
          id_categoria,
          nombre,
          descripcion,
          activo
        `)
        .order('nombre'),
    ])

    if (resultadoTipos.error) {
      console.error(resultadoTipos.error)
      setErrorMensaje(
        'No se pudieron cargar los tipos de atención.'
      )
    } else {
      setTipos(
        resultadoTipos.data ?? []
      )
    }

    if (resultadoDestinos.error) {
      console.error(resultadoDestinos.error)
      setErrorMensaje(
        'No se pudieron cargar los destinos.'
      )
    } else {
      setDestinos(
        resultadoDestinos.data ?? []
      )
    }

    if (resultadoCategorias.error) {
      console.error(resultadoCategorias.error)
      setErrorMensaje(
        'No se pudieron cargar las categorías.'
      )
    } else {
      setCategorias(
        resultadoCategorias.data ?? []
      )
    }

    setCargando(false)
  }

  useEffect(() => {
    cargarCatalogos()
  }, [])

  // ==========================================================
  // CREAR TIPO DE ATENCIÓN
  // ==========================================================

  async function crearTipo(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setMensaje('')
    setErrorMensaje('')

    if (!nombreTipo.trim()) {
      setErrorMensaje(
        'Escribe el nombre del tipo de atención.'
      )
      return
    }

    const { error } = await supabase
      .from('tipos_atencion')
      .insert({
        nombre: nombreTipo.trim(),

        categoria:
          categoriaTipo.trim() || null,

        descripcion:
          descripcionTipo.trim() || null,
      })

    if (error) {
      console.error(error)

      setErrorMensaje(
        'No se pudo agregar el tipo de atención.'
      )

      return
    }

    setNombreTipo('')
    setCategoriaTipo('')
    setDescripcionTipo('')

    setMensaje(
      '✅ Tipo de atención agregado.'
    )

    await cargarCatalogos()
  }

  // ==========================================================
  // CREAR DESTINO
  // ==========================================================

  async function crearDestino(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setMensaje('')
    setErrorMensaje('')

    if (!nombreDestino.trim()) {
      setErrorMensaje(
        'Escribe el nombre del destino.'
      )
      return
    }

    const { error } = await supabase
      .from('destinos_canalizacion')
      .insert({
        nombre:
          nombreDestino.trim(),

        tipo:
          tipoDestino.trim() || null,
      })

    if (error) {
      console.error(error)

      setErrorMensaje(
        'No se pudo agregar el destino.'
      )

      return
    }

    setNombreDestino('')
    setTipoDestino('')

    setMensaje(
      '✅ Destino agregado.'
    )

    await cargarCatalogos()
  }

  // ==========================================================
  // CREAR CATEGORÍA
  // ==========================================================

  async function crearCategoria(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setMensaje('')
    setErrorMensaje('')

    if (!nombreCategoria.trim()) {
      setErrorMensaje(
        'Escribe el nombre de la categoría.'
      )
      return
    }

    const { error } = await supabase
      .from('categorias_documento')
      .insert({
        nombre:
          nombreCategoria.trim(),

        descripcion:
          descripcionCategoria.trim()
          || null,
      })

    if (error) {
      console.error(error)

      setErrorMensaje(
        'No se pudo agregar la categoría.'
      )

      return
    }

    setNombreCategoria('')
    setDescripcionCategoria('')

    setMensaje(
      '✅ Categoría agregada.'
    )

    await cargarCatalogos()
  }

  // ==========================================================
  // ACTIVAR / DESACTIVAR
  // ==========================================================

  async function cambiarEstadoTipo(
    id: number,
    activo: boolean
  ) {
    const { error } = await supabase
      .from('tipos_atencion')
      .update({
        activo: !activo,
      })
      .eq(
        'id_tipo_atencion',
        id
      )

    if (error) {
      console.error(error)
      setErrorMensaje(
        'No se pudo modificar el tipo de atención.'
      )
      return
    }

    await cargarCatalogos()
  }

  async function cambiarEstadoDestino(
    id: number,
    activo: boolean
  ) {
    const { error } = await supabase
      .from('destinos_canalizacion')
      .update({
        activo: !activo,
      })
      .eq(
        'id_destino',
        id
      )

    if (error) {
      console.error(error)
      setErrorMensaje(
        'No se pudo modificar el destino.'
      )
      return
    }

    await cargarCatalogos()
  }

  async function cambiarEstadoCategoria(
    id: number,
    activo: boolean
  ) {
    const { error } = await supabase
      .from('categorias_documento')
      .update({
        activo: !activo,
      })
      .eq(
        'id_categoria',
        id
      )

    if (error) {
      console.error(error)
      setErrorMensaje(
        'No se pudo modificar la categoría.'
      )
      return
    }

    await cargarCatalogos()
  }

  // ==========================================================
  // EDICIÓN SENCILLA
  // ==========================================================

  async function editarTipo(
    tipo: TipoAtencion
  ) {
    const nuevoNombre =
      window.prompt(
        'Nuevo nombre:',
        tipo.nombre
      )

    if (
      nuevoNombre === null ||
      !nuevoNombre.trim()
    ) {
      return
    }

    const nuevaCategoria =
      window.prompt(
        'Categoría:',
        tipo.categoria ?? ''
      )

    if (nuevaCategoria === null) {
      return
    }

    const { error } = await supabase
      .from('tipos_atencion')
      .update({
        nombre:
          nuevoNombre.trim(),

        categoria:
          nuevaCategoria.trim()
          || null,
      })
      .eq(
        'id_tipo_atencion',
        tipo.id_tipo_atencion
      )

    if (error) {
      console.error(error)
      setErrorMensaje(
        'No se pudo editar el tipo de atención.'
      )
      return
    }

    setMensaje(
      '✅ Tipo de atención actualizado.'
    )

    await cargarCatalogos()
  }

  async function editarDestino(
    destino: Destino
  ) {
    const nuevoNombre =
      window.prompt(
        'Nuevo nombre:',
        destino.nombre
      )

    if (
      nuevoNombre === null ||
      !nuevoNombre.trim()
    ) {
      return
    }

    const nuevoTipo =
      window.prompt(
        'Tipo:',
        destino.tipo ?? ''
      )

    if (nuevoTipo === null) {
      return
    }

    const { error } = await supabase
      .from('destinos_canalizacion')
      .update({
        nombre:
          nuevoNombre.trim(),

        tipo:
          nuevoTipo.trim() || null,
      })
      .eq(
        'id_destino',
        destino.id_destino
      )

    if (error) {
      console.error(error)
      setErrorMensaje(
        'No se pudo editar el destino.'
      )
      return
    }

    setMensaje(
      '✅ Destino actualizado.'
    )

    await cargarCatalogos()
  }

  async function editarCategoria(
    categoria: CategoriaDocumento
  ) {
    const nuevoNombre =
      window.prompt(
        'Nuevo nombre:',
        categoria.nombre
      )

    if (
      nuevoNombre === null ||
      !nuevoNombre.trim()
    ) {
      return
    }

    const nuevaDescripcion =
      window.prompt(
        'Descripción:',
        categoria.descripcion ?? ''
      )

    if (nuevaDescripcion === null) {
      return
    }

    const { error } = await supabase
      .from('categorias_documento')
      .update({
        nombre:
          nuevoNombre.trim(),

        descripcion:
          nuevaDescripcion.trim()
          || null,
      })
      .eq(
        'id_categoria',
        categoria.id_categoria
      )

    if (error) {
      console.error(error)
      setErrorMensaje(
        'No se pudo editar la categoría.'
      )
      return
    }

    setMensaje(
      '✅ Categoría actualizada.'
    )

    await cargarCatalogos()
  }

  // ==========================================================
  // RESUMEN VISUAL
  // ==========================================================

  const activosTipos =
    tipos.filter((item) => item.activo).length

  const activosDestinos =
    destinos.filter((item) => item.activo).length

  const activosCategorias =
    categorias.filter((item) => item.activo).length


  // ==========================================================
  // INTERFAZ
  // ==========================================================

  return (
    <div className="admin-page">

      <header className="admin-header">

        <div>
          <button
            type="button"
            className="admin-back"
            onClick={onVolver}
          >
            ← Volver al inicio
          </button>

          <h1>Administración</h1>

          <p>
            Administra los catálogos utilizados por el sistema
            para atenciones, canalizaciones y documentos.
          </p>
        </div>

        <div className="admin-badge">
          <span>⚙</span>

          <div>
            <strong>Configuración</strong>
            <small>Catálogos del sistema</small>
          </div>
        </div>

      </header>


      <section className="admin-stats">

        <article>
          <span>Tipos de atención</span>
          <strong>{tipos.length}</strong>
          <small>{activosTipos} activos</small>
        </article>

        <article>
          <span>Destinos</span>
          <strong>{destinos.length}</strong>
          <small>{activosDestinos} activos</small>
        </article>

        <article>
          <span>Categorías</span>
          <strong>{categorias.length}</strong>
          <small>{activosCategorias} activas</small>
        </article>

      </section>


      <nav className="admin-tabs">

        <button
          type="button"
          className={
            seccion === 'tipos'
              ? 'admin-tab active'
              : 'admin-tab'
          }
          onClick={() => setSeccion('tipos')}
        >
          <span className="admin-tab-icon">▦</span>

          <span>
            <strong>Tipos de atención</strong>
            <small>Servicios disponibles</small>
          </span>
        </button>


        <button
          type="button"
          className={
            seccion === 'destinos'
              ? 'admin-tab active'
              : 'admin-tab'
          }
          onClick={() => setSeccion('destinos')}
        >
          <span className="admin-tab-icon">↗</span>

          <span>
            <strong>Destinos</strong>
            <small>Canalizaciones</small>
          </span>
        </button>


        <button
          type="button"
          className={
            seccion === 'categorias'
              ? 'admin-tab active'
              : 'admin-tab'
          }
          onClick={() => setSeccion('categorias')}
        >
          <span className="admin-tab-icon">▤</span>

          <span>
            <strong>Categorías</strong>
            <small>Documentos</small>
          </span>
        </button>

      </nav>


      {cargando && (
        <div className="admin-message">
          <span className="admin-loader" />

          <div>
            <strong>Cargando catálogos...</strong>
            <p>Obteniendo la configuración actual.</p>
          </div>
        </div>
      )}


      {errorMensaje && (
        <div className="admin-message error">
          <span className="admin-message-icon">!</span>

          <div>
            <strong>Ocurrió un problema</strong>
            <p>{errorMensaje}</p>
          </div>
        </div>
      )}


      {mensaje && (
        <div className="admin-message success">
          <span className="admin-message-icon">✓</span>

          <div>
            <strong>Cambio guardado</strong>
            <p>{mensaje.replace('✅ ', '')}</p>
          </div>
        </div>
      )}


      {!cargando && seccion === 'tipos' && (
        <div className="admin-grid">

          <section className="admin-card admin-form-card">

            <div className="admin-section-title">
              <span>+</span>

              <div>
                <h2>Nuevo tipo de atención</h2>
                <p>
                  Agrega un servicio disponible para
                  los nuevos registros.
                </p>
              </div>
            </div>


            <form
              className="admin-form"
              onSubmit={crearTipo}
            >

              <div className="admin-field">
                <label htmlFor="nombreTipo">
                  Nombre *
                </label>

                <input
                  id="nombreTipo"
                  type="text"
                  value={nombreTipo}
                  onChange={(e) =>
                    setNombreTipo(e.target.value)
                  }
                  required
                  placeholder="Ej. Asesoría jurídica"
                />
              </div>


              <div className="admin-field">
                <label htmlFor="categoriaTipo">
                  Categoría
                </label>

                <input
                  id="categoriaTipo"
                  type="text"
                  value={categoriaTipo}
                  onChange={(e) =>
                    setCategoriaTipo(e.target.value)
                  }
                  placeholder="Actividad, Servicio..."
                />
              </div>


              <div className="admin-field">
                <label htmlFor="descripcionTipo">
                  Descripción
                </label>

                <textarea
                  id="descripcionTipo"
                  rows={4}
                  value={descripcionTipo}
                  onChange={(e) =>
                    setDescripcionTipo(e.target.value)
                  }
                  placeholder="Descripción opcional..."
                />
              </div>


              <button
                type="submit"
                className="admin-primary"
              >
                + Agregar tipo
              </button>

            </form>

          </section>


          <section className="admin-card admin-list-card">

            <div className="admin-list-header">
              <div>
                <h2>Tipos registrados</h2>
                <p>
                  Edita o cambia el estado de cada servicio.
                </p>
              </div>

              <span>{tipos.length}</span>
            </div>


            {tipos.length === 0 ? (
              <div className="admin-empty">
                <span>▦</span>
                <strong>No hay tipos registrados</strong>
                <p>Agrega el primero desde el formulario.</p>
              </div>
            ) : (
              <div className="admin-items">

                {tipos.map((tipo) => (
                  <article
                    key={tipo.id_tipo_atencion}
                    className={
                      tipo.activo
                        ? 'admin-item'
                        : 'admin-item inactive'
                    }
                  >

                    <div className="admin-item-info">

                      <div className="admin-item-name">
                        <strong>{tipo.nombre}</strong>

                        <span
                          className={
                            tipo.activo
                              ? 'admin-state active'
                              : 'admin-state'
                          }
                        >
                          {tipo.activo
                            ? 'Activo'
                            : 'Inactivo'}
                        </span>
                      </div>

                      {tipo.categoria && (
                        <span className="admin-tag">
                          {tipo.categoria}
                        </span>
                      )}

                      {tipo.descripcion && (
                        <p>{tipo.descripcion}</p>
                      )}

                    </div>


                    <div className="admin-actions">

                      <button
                        type="button"
                        className="admin-edit"
                        onClick={() => editarTipo(tipo)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className={
                          tipo.activo
                            ? 'admin-toggle off'
                            : 'admin-toggle on'
                        }
                        onClick={() =>
                          cambiarEstadoTipo(
                            tipo.id_tipo_atencion,
                            tipo.activo
                          )
                        }
                      >
                        {tipo.activo
                          ? 'Desactivar'
                          : 'Activar'}
                      </button>

                    </div>

                  </article>
                ))}

              </div>
            )}

          </section>

        </div>
      )}


      {!cargando && seccion === 'destinos' && (
        <div className="admin-grid">

          <section className="admin-card admin-form-card">

            <div className="admin-section-title">
              <span>+</span>

              <div>
                <h2>Nuevo destino</h2>
                <p>
                  Registra una institución o dependencia
                  para canalizaciones.
                </p>
              </div>
            </div>


            <form
              className="admin-form"
              onSubmit={crearDestino}
            >

              <div className="admin-field">
                <label htmlFor="nombreDestino">
                  Nombre *
                </label>

                <input
                  id="nombreDestino"
                  type="text"
                  value={nombreDestino}
                  onChange={(e) =>
                    setNombreDestino(e.target.value)
                  }
                  required
                  placeholder="Ej. Instituto de Salud"
                />
              </div>


              <div className="admin-field">
                <label htmlFor="tipoDestino">
                  Tipo
                </label>

                <input
                  id="tipoDestino"
                  type="text"
                  value={tipoDestino}
                  onChange={(e) =>
                    setTipoDestino(e.target.value)
                  }
                  placeholder="Institución, Dependencia..."
                />
              </div>


              <div className="admin-note">
                <span>ⓘ</span>
                <p>
                  Los destinos activos estarán disponibles
                  al registrar una canalización.
                </p>
              </div>


              <button
                type="submit"
                className="admin-primary"
              >
                + Agregar destino
              </button>

            </form>

          </section>


          <section className="admin-card admin-list-card">

            <div className="admin-list-header">
              <div>
                <h2>Destinos registrados</h2>
                <p>
                  Administra las opciones de canalización.
                </p>
              </div>

              <span>{destinos.length}</span>
            </div>


            {destinos.length === 0 ? (
              <div className="admin-empty">
                <span>↗</span>
                <strong>No hay destinos registrados</strong>
                <p>Agrega el primero desde el formulario.</p>
              </div>
            ) : (
              <div className="admin-items">

                {destinos.map((destino) => (
                  <article
                    key={destino.id_destino}
                    className={
                      destino.activo
                        ? 'admin-item'
                        : 'admin-item inactive'
                    }
                  >

                    <div className="admin-item-info">

                      <div className="admin-item-name">
                        <strong>{destino.nombre}</strong>

                        <span
                          className={
                            destino.activo
                              ? 'admin-state active'
                              : 'admin-state'
                          }
                        >
                          {destino.activo
                            ? 'Activo'
                            : 'Inactivo'}
                        </span>
                      </div>

                      {destino.tipo && (
                        <span className="admin-tag">
                          {destino.tipo}
                        </span>
                      )}

                    </div>


                    <div className="admin-actions">

                      <button
                        type="button"
                        className="admin-edit"
                        onClick={() =>
                          editarDestino(destino)
                        }
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className={
                          destino.activo
                            ? 'admin-toggle off'
                            : 'admin-toggle on'
                        }
                        onClick={() =>
                          cambiarEstadoDestino(
                            destino.id_destino,
                            destino.activo
                          )
                        }
                      >
                        {destino.activo
                          ? 'Desactivar'
                          : 'Activar'}
                      </button>

                    </div>

                  </article>
                ))}

              </div>
            )}

          </section>

        </div>
      )}


      {!cargando && seccion === 'categorias' && (
        <div className="admin-grid">

          <section className="admin-card admin-form-card">

            <div className="admin-section-title">
              <span>+</span>

              <div>
                <h2>Nueva categoría</h2>
                <p>
                  Organiza los documentos disponibles
                  dentro del sistema.
                </p>
              </div>
            </div>


            <form
              className="admin-form"
              onSubmit={crearCategoria}
            >

              <div className="admin-field">
                <label htmlFor="nombreCategoria">
                  Nombre *
                </label>

                <input
                  id="nombreCategoria"
                  type="text"
                  value={nombreCategoria}
                  onChange={(e) =>
                    setNombreCategoria(e.target.value)
                  }
                  required
                  placeholder="Ej. Convocatorias"
                />
              </div>


              <div className="admin-field">
                <label htmlFor="descripcionCategoria">
                  Descripción
                </label>

                <textarea
                  id="descripcionCategoria"
                  rows={4}
                  value={descripcionCategoria}
                  onChange={(e) =>
                    setDescripcionCategoria(
                      e.target.value
                    )
                  }
                  placeholder="Descripción opcional..."
                />
              </div>


              <button
                type="submit"
                className="admin-primary"
              >
                + Agregar categoría
              </button>

            </form>

          </section>


          <section className="admin-card admin-list-card">

            <div className="admin-list-header">
              <div>
                <h2>Categorías registradas</h2>
                <p>
                  Administra la organización documental.
                </p>
              </div>

              <span>{categorias.length}</span>
            </div>


            {categorias.length === 0 ? (
              <div className="admin-empty">
                <span>▤</span>
                <strong>No hay categorías registradas</strong>
                <p>Agrega la primera desde el formulario.</p>
              </div>
            ) : (
              <div className="admin-items">

                {categorias.map((categoria) => (
                  <article
                    key={categoria.id_categoria}
                    className={
                      categoria.activo
                        ? 'admin-item'
                        : 'admin-item inactive'
                    }
                  >

                    <div className="admin-item-info">

                      <div className="admin-item-name">
                        <strong>{categoria.nombre}</strong>

                        <span
                          className={
                            categoria.activo
                              ? 'admin-state active'
                              : 'admin-state'
                          }
                        >
                          {categoria.activo
                            ? 'Activa'
                            : 'Inactiva'}
                        </span>
                      </div>

                      {categoria.descripcion && (
                        <p>{categoria.descripcion}</p>
                      )}

                    </div>


                    <div className="admin-actions">

                      <button
                        type="button"
                        className="admin-edit"
                        onClick={() =>
                          editarCategoria(categoria)
                        }
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className={
                          categoria.activo
                            ? 'admin-toggle off'
                            : 'admin-toggle on'
                        }
                        onClick={() =>
                          cambiarEstadoCategoria(
                            categoria.id_categoria,
                            categoria.activo
                          )
                        }
                      >
                        {categoria.activo
                          ? 'Desactivar'
                          : 'Activar'}
                      </button>

                    </div>

                  </article>
                ))}

              </div>
            )}

          </section>

        </div>
      )}


      <style>{`

        .admin-page {
          width: 100%;
          max-width: 1160px;
          margin: 0 auto;
          padding: 8px 0 40px;
          box-sizing: border-box;
        }

        .admin-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 25px;
        }

        .admin-header h1 {
          margin: 14px 0 8px;
          color: var(--text);
          font-size: clamp(28px, 4vw, 38px);
          line-height: 1.1;
          letter-spacing: -0.8px;
        }

        .admin-header p {
          max-width: 700px;
          margin: 0;
          color: var(--text-soft);
          font-size: 15px;
          line-height: 1.6;
        }

        .admin-back {
          padding: 0;
          border: none;
          background: transparent;
          color: var(--primary);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .admin-badge {
          display: flex;
          min-width: 205px;
          align-items: center;
          gap: 11px;
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .admin-badge > span {
          display: flex;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 19px;
        }

        .admin-badge > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .admin-badge strong {
          color: var(--text);
          font-size: 12px;
        }

        .admin-badge small {
          color: var(--text-soft);
          font-size: 10px;
        }

        .admin-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }

        .admin-stats article {
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 15px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .admin-stats article > span {
          display: block;
          margin-bottom: 8px;
          color: var(--text-soft);
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        .admin-stats strong {
          display: block;
          margin-bottom: 4px;
          color: var(--text);
          font-size: 25px;
        }

        .admin-stats small {
          color: var(--primary);
          font-size: 9px;
          font-weight: 700;
        }

        .admin-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 19px;
          padding: 7px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .admin-tab {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 9px;
          padding: 10px 12px;
          border: 1px solid transparent;
          border-radius: 11px;
          background: transparent;
          color: var(--text-soft);
          text-align: left;
          cursor: pointer;
        }

        .admin-tab:hover,
        .admin-tab.active {
          background: var(--surface-soft);
        }

        .admin-tab.active {
          border-color: var(--border);
          color: var(--primary);
        }

        .admin-tab-icon {
          display: flex;
          width: 30px;
          height: 30px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 8px;
          background: var(--bg);
          color: var(--primary);
          font-weight: 800;
        }

        .admin-tab > span:last-child {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 2px;
        }

        .admin-tab strong {
          color: inherit;
          font-size: 10px;
        }

        .admin-tab small {
          color: var(--text-soft);
          font-size: 8px;
        }

        .admin-grid {
          display: grid;
          grid-template-columns:
            minmax(290px, .75fr)
            minmax(0, 1.35fr);
          align-items: start;
          gap: 16px;
        }

        .admin-card {
          padding: 22px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .admin-section-title {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 19px;
        }

        .admin-section-title > span {
          display: flex;
          width: 33px;
          height: 33px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 10px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 16px;
          font-weight: 800;
        }

        .admin-section-title h2,
        .admin-list-header h2 {
          margin: 0 0 4px;
          color: var(--text);
          font-size: 15px;
        }

        .admin-section-title p,
        .admin-list-header p {
          margin: 0;
          color: var(--text-soft);
          font-size: 10px;
          line-height: 1.45;
        }

        .admin-form {
          display: grid;
          gap: 13px;
        }

        .admin-field label {
          display: block;
          margin-bottom: 6px;
          color: var(--text);
          font-size: 10px;
          font-weight: 700;
        }

        .admin-field input,
        .admin-field textarea {
          width: 100%;
          box-sizing: border-box;
        }

        .admin-field textarea {
          min-height: 85px;
          resize: vertical;
        }

        .admin-primary {
          min-height: 41px;
          border: 1px solid var(--primary);
          border-radius: 9px;
          background: var(--primary);
          color: white;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .admin-primary:hover {
          opacity: .9;
        }

        .admin-note {
          display: flex;
          gap: 8px;
          padding: 10px;
          border-radius: 9px;
          background: var(--surface-soft);
        }

        .admin-note span {
          color: var(--primary);
          font-size: 10px;
        }

        .admin-note p {
          margin: 0;
          color: var(--text-soft);
          font-size: 9px;
          line-height: 1.4;
        }

        .admin-list-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .admin-list-header > span {
          display: flex;
          min-width: 27px;
          height: 27px;
          align-items: center;
          justify-content: center;
          padding: 0 6px;
          border-radius: 999px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 9px;
          font-weight: 800;
        }

        .admin-items {
          display: grid;
          gap: 8px;
          max-height: 610px;
          padding-right: 3px;
          overflow-y: auto;
        }

        .admin-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 13px;
          padding: 13px;
          border: 1px solid var(--border);
          border-radius: 11px;
          background: var(--bg);
        }

        .admin-item.inactive {
          opacity: .58;
        }

        .admin-item-info {
          min-width: 0;
          flex: 1;
        }

        .admin-item-name {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .admin-item-name strong {
          color: var(--text);
          font-size: 10px;
        }

        .admin-state,
        .admin-tag {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          font-size: 8px;
          font-weight: 800;
        }

        .admin-state {
          padding: 3px 6px;
          background: var(--surface-soft);
          color: var(--text-soft);
        }

        .admin-state.active {
          color: #2f9e62;
        }

        .admin-tag {
          margin-top: 6px;
          padding: 4px 7px;
          background: var(--surface-soft);
          color: var(--primary);
        }

        .admin-item-info > p {
          margin: 6px 0 0;
          color: var(--text-soft);
          font-size: 9px;
          line-height: 1.4;
        }

        .admin-actions {
          display: flex;
          flex-shrink: 0;
          gap: 5px;
        }

        .admin-edit,
        .admin-toggle {
          padding: 6px 8px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: transparent;
          font-size: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        .admin-edit {
          color: var(--text);
        }

        .admin-toggle.off {
          color: var(--danger);
        }

        .admin-toggle.on {
          color: #2f9e62;
        }

        .admin-message {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 11px;
          background: var(--surface);
        }

        .admin-message-icon {
          display: flex;
          width: 26px;
          height: 26px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          font-size: 9px;
          font-weight: 900;
        }

        .admin-message.error .admin-message-icon {
          background: var(--danger);
          color: white;
        }

        .admin-message.success .admin-message-icon {
          background: #2f9e62;
          color: white;
        }

        .admin-message strong {
          display: block;
          margin-bottom: 2px;
          color: var(--text);
          font-size: 10px;
        }

        .admin-message p {
          margin: 0;
          color: var(--text-soft);
          font-size: 9px;
        }

        .admin-loader {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: admin-spin .8s linear infinite;
        }

        @keyframes admin-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .admin-empty {
          display: flex;
          min-height: 210px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          text-align: center;
        }

        .admin-empty > span {
          display: flex;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          margin-bottom: 9px;
          border-radius: 13px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 17px;
        }

        .admin-empty strong {
          color: var(--text);
          font-size: 11px;
        }

        .admin-empty p {
          margin: 4px 0 0;
          color: var(--text-soft);
          font-size: 9px;
        }

        @media (max-width: 900px) {
          .admin-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .admin-badge {
            display: none;
          }

          .admin-grid {
            grid-template-columns: 1fr;
          }

          .admin-items {
            max-height: none;
          }
        }

        @media (max-width: 650px) {
          .admin-stats,
          .admin-tabs {
            grid-template-columns: 1fr;
          }

          .admin-tab small {
            display: none;
          }

          .admin-card {
            padding: 18px;
          }

          .admin-item {
            align-items: flex-start;
            flex-direction: column;
          }

          .admin-actions {
            width: 100%;
          }

          .admin-edit,
          .admin-toggle {
            flex: 1;
          }
        }

      `}</style>

    </div>
  )
}


export default Administracion
