/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Rol = 'administrador' | 'servicio_social'

type DocumentosProps = {
  onVolver: () => void
  rol: Rol
}

type Categoria = {
  id_categoria: number
  nombre: string
}

type Documento = {
  id_documento: number
  id_categoria: number
  nombre: string
  ruta_storage: string | null
  fecha_documento: string | null
  fecha_subida: string
  observaciones: string | null
  activo: boolean
  fuente: 'supabase' | 'google_drive' | string | null
  url_externa: string | null
  google_drive_id: string | null
}

type DriveFile = {
  id: string
  name: string
  mimeType?: string
  createdTime?: string
  modifiedTime?: string
  webViewLink?: string
  description?: string
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: {
              access_token?: string
              error?: string
              error_description?: string
            }) => void
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void
          }
        }
      }
    }
  }
}

const DOCUMENTOS_POR_PAGINA = 15
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.metadata.readonly'
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const GOOGLE_DRIVE_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID as string | undefined

function cargarGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve()
  }

  const existente = document.querySelector<HTMLScriptElement>(
    'script[data-google-identity-services="true"]'
  )

  if (existente) {
    return new Promise((resolve, reject) => {
      const comprobar = () => {
        if (window.google?.accounts?.oauth2) {
          resolve()
        } else {
          reject(new Error('Google Identity Services no pudo cargarse.'))
        }
      }

      existente.addEventListener('load', comprobar, { once: true })
      existente.addEventListener(
        'error',
        () => reject(new Error('No se pudo cargar Google Identity Services.')),
        { once: true }
      )
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentityServices = 'true'

    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve()
      } else {
        reject(new Error('Google Identity Services se cargó, pero no está disponible.'))
      }
    }

    script.onerror = () => {
      reject(new Error('No se pudo cargar Google Identity Services.'))
    }

    document.head.appendChild(script)
  })
}

async function obtenerTokenGoogle(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      'Falta VITE_GOOGLE_CLIENT_ID en .env.local.'
    )
  }

  await cargarGoogleIdentityServices()

  const oauth2 = window.google?.accounts?.oauth2

  if (!oauth2) {
    throw new Error('Google Identity Services no está disponible.')
  }

  return new Promise((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                'Google no autorizó el acceso a Drive.'
            )
          )
          return
        }

        resolve(response.access_token)
      },
    })

    tokenClient.requestAccessToken({ prompt: '' })
  })
}

function normalizarNombre(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function fechaDriveAFechaDocumento(fecha?: string) {
  if (!fecha) return null
  const fechaObj = new Date(fecha)
  if (Number.isNaN(fechaObj.getTime())) return null
  return fechaObj.toISOString().slice(0, 10)
}

function tipoDrivePermitido(mimeType?: string, nombre = '') {
  const mime = (mimeType || '').toLowerCase()
  const archivo = nombre.toLowerCase()

  return (
    mime === 'application/pdf' ||
    mime.startsWith('image/') ||
    archivo.endsWith('.pdf') ||
    archivo.endsWith('.jpg') ||
    archivo.endsWith('.jpeg') ||
    archivo.endsWith('.png') ||
    archivo.endsWith('.webp')
  )
}

function escaparQueryDrive(valor: string) {
  return valor.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function formatearError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error

  try {
    return JSON.stringify(error)
  } catch {
    return 'Ocurrió un error inesperado.'
  }
}

function Documentos({ onVolver, rol }: DocumentosProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const [idCategoria, setIdCategoria] = useState('')
  const [fechaDocumento, setFechaDocumento] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [observaciones, setObservaciones] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroAnio, setFiltroAnio] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activos')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [pagina, setPagina] = useState(1)
  const [totalDocumentos, setTotalDocumentos] = useState(0)

  const [sincronizandoDrive, setSincronizandoDrive] = useState(false)
  const [driveConectado, setDriveConectado] = useState(false)

  async function cargarCategorias() {
    const { data, error } = await supabase
      .from('categorias_documento')
      .select('id_categoria, nombre')
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.error('Error al cargar categorías:', error)
      setMensaje('No se pudieron cargar las categorías.')
      return
    }

    setCategorias((data ?? []) as Categoria[])
  }

  async function cargarDocumentos(numeroPagina = pagina) {
    setCargando(true)

    const desde = (numeroPagina - 1) * DOCUMENTOS_POR_PAGINA
    const hasta = desde + DOCUMENTOS_POR_PAGINA - 1

    let query = supabase
      .from('documentos')
      .select(
        `
          id_documento,
          id_categoria,
          nombre,
          ruta_storage,
          fecha_documento,
          fecha_subida,
          observaciones,
          activo,
          fuente,
          url_externa,
          google_drive_id
        `,
        { count: 'exact' }
      )

    if (filtroEstado === 'activos') query = query.eq('activo', true)
    if (filtroEstado === 'inactivos') query = query.eq('activo', false)

    if (filtroCategoria) {
      query = query.eq('id_categoria', Number(filtroCategoria))
    }

    const texto = busqueda.trim()
    if (texto) {
      const textoSeguro = texto
        .replace(/[%_]/g, ' ')
        .replace(/,/g, ' ')

      query = query.or(
        `nombre.ilike.%${textoSeguro}%,observaciones.ilike.%${textoSeguro}%`
      )
    }

    if (fechaDesde) query = query.gte('fecha_documento', fechaDesde)
    if (fechaHasta) query = query.lte('fecha_documento', fechaHasta)

    if (filtroAnio) {
      const inicio = `${filtroAnio}-01-01`
      const fin = `${Number(filtroAnio) + 1}-01-01`
      query = query.gte('fecha_documento', inicio).lt('fecha_documento', fin)
    }

    const { data, error, count } = await query
      .order('fecha_documento', { ascending: false, nullsFirst: false })
      .order('fecha_subida', { ascending: false })
      .range(desde, hasta)

    if (error) {
      console.error('Error al cargar documentos:', error)
      setMensaje('No se pudieron cargar los documentos.')
      setDocumentos([])
      setTotalDocumentos(0)
      setCargando(false)
      return
    }

    setDocumentos((data ?? []) as Documento[])
    setTotalDocumentos(count ?? 0)
    setCargando(false)
  }

  useEffect(() => {
    void cargarCategorias()
  }, [])

  useEffect(() => {
    void cargarDocumentos(pagina)
  }, [
    pagina,
    busqueda,
    filtroCategoria,
    filtroAnio,
    filtroTipo,
    filtroEstado,
    fechaDesde,
    fechaHasta,
  ])

  const documentosFiltrados = useMemo(() => {
    if (!filtroTipo) return documentos

    return documentos.filter((documento) => {
      const nombre = documento.nombre.toLowerCase()

      if (filtroTipo === 'pdf') return nombre.endsWith('.pdf')

      if (filtroTipo === 'imagen') {
        return (
          nombre.endsWith('.jpg') ||
          nombre.endsWith('.jpeg') ||
          nombre.endsWith('.png') ||
          nombre.endsWith('.webp')
        )
      }

      return true
    })
  }, [documentos, filtroTipo])

  const anios = useMemo(() => {
    const actual = new Date().getFullYear()
    return Array.from({ length: actual - 2019 }, (_, indice) => actual - indice)
  }, [])

  function obtenerNombreCategoria(id: number) {
    return (
      categorias.find((categoria) => categoria.id_categoria === id)?.nombre ??
      'Sin categoría'
    )
  }

  function obtenerTipoArchivo(nombre: string) {
    const extension = nombre.split('.').pop()?.toLowerCase()

    if (extension === 'pdf') return 'PDF'
    if (extension === 'jpg' || extension === 'jpeg') return 'JPG'
    if (extension === 'png') return 'PNG'
    if (extension === 'webp') return 'WEBP'

    return extension?.toUpperCase() ?? 'ARCHIVO'
  }

  function formatearFecha(fecha: string | null) {
    if (!fecha) return 'Sin fecha'

    const partes = fecha.split('-')
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`
    }

    return fecha
  }

  async function subirDocumento(e: FormEvent) {
    e.preventDefault()
    setMensaje('')

    if (!idCategoria) {
      setMensaje('Selecciona una categoría.')
      return
    }

    if (!archivo) {
      setMensaje('Selecciona un archivo.')
      return
    }

    const DIEZ_MB = 10 * 1024 * 1024
    if (archivo.size > DIEZ_MB) {
      setMensaje('El archivo no puede superar los 10 MB.')
      return
    }

    const extension = archivo.name.split('.').pop()?.toLowerCase()
    const extensionesPermitidas = ['pdf', 'jpg', 'jpeg', 'png', 'webp']

    if (!extension || !extensionesPermitidas.includes(extension)) {
      setMensaje('Solo se permiten archivos PDF e imágenes.')
      return
    }

    setSubiendo(true)

    try {
      const { data: usuarioData, error: usuarioError } = await supabase.auth.getUser()

      if (usuarioError || !usuarioData.user) {
        throw new Error('No se pudo identificar al usuario.')
      }

      const nombreSeguro = archivo.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')

      const identificador =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : String(Date.now())

      const ruta = `categoria-${idCategoria}/${Date.now()}-${identificador}-${nombreSeguro}`

      const { error: storageError } = await supabase.storage
        .from('documentos')
        .upload(ruta, archivo, { cacheControl: '3600', upsert: false })

      if (storageError) {
        throw storageError
      }

      const { data: documentoGuardado, error: insertError } = await supabase
        .from('documentos')
        .insert({
          id_categoria: Number(idCategoria),
          subido_por: usuarioData.user.id,
          nombre: archivo.name,
          ruta_storage: ruta,
          fecha_documento: fechaDocumento || null,
          observaciones: observaciones.trim() || null,
          activo: true,
          fuente: 'supabase',
        })
        .select(
          `
            id_documento,
            id_categoria,
            nombre,
            ruta_storage,
            fecha_documento,
            fecha_subida,
            observaciones,
            activo,
            fuente,
            url_externa,
            google_drive_id
          `
        )
        .single()

      if (insertError) {
        console.error('Error al guardar metadatos:', insertError)

        // Si el archivo sí subió pero falló el INSERT, intentamos limpiar el archivo.
        await supabase.storage.from('documentos').remove([ruta])

        throw insertError
      }

      if (documentoGuardado) {
        setDocumentos((actuales) => [documentoGuardado as Documento, ...actuales].slice(0, DOCUMENTOS_POR_PAGINA))
      }

      setMensaje('Documento subido correctamente.')
      setIdCategoria('')
      setFechaDocumento('')
      setArchivo(null)
      setObservaciones('')
      setPagina(1)

      const input = document.getElementById('archivo-documento') as HTMLInputElement | null
      if (input) input.value = ''

      await cargarDocumentos(1)
    } catch (error) {
      console.error('Error al subir documento:', error)
      setMensaje(`No se pudo subir el documento: ${formatearError(error)}`)
    } finally {
      setSubiendo(false)
    }
  }

  async function verDocumento(documento: Documento) {
    setMensaje('')

    if (documento.fuente === 'google_drive') {
      if (!documento.url_externa) {
        setMensaje('Este documento de Google Drive no tiene una liga disponible.')
        return
      }

      window.open(documento.url_externa, '_blank', 'noopener,noreferrer')
      return
    }

    if (!documento.ruta_storage) {
      setMensaje('Este documento no tiene una ruta de almacenamiento.')
      return
    }

    const { data, error } = await supabase.storage
      .from('documentos')
      .createSignedUrl(documento.ruta_storage, 60)

    if (error) {
      console.error('Error al generar URL:', error)
      setMensaje('No se pudo abrir el documento.')
      return
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function obtenerCategoriaSinClasificar() {
    const encontrada = categorias.find(
      (categoria) => normalizarNombre(categoria.nombre) === 'sin clasificar'
    )

    if (encontrada) return encontrada.id_categoria

    const { data, error } = await supabase
      .from('categorias_documento')
      .select('id_categoria, nombre')
      .eq('activo', true)
      .ilike('nombre', 'Sin clasificar')
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('No existe la categoría "Sin clasificar".')

    return data.id_categoria
  }

  async function listarArchivosDrive(accessToken: string) {
    if (!GOOGLE_DRIVE_FOLDER_ID) {
      throw new Error('Falta VITE_GOOGLE_DRIVE_FOLDER_ID en .env.local.')
    }

    const archivos: DriveFile[] = []
    let pageToken = ''

    do {
      const parametros = new URLSearchParams({
        pageSize: '1000',
        q: `'${escaparQueryDrive(GOOGLE_DRIVE_FOLDER_ID)}' in parents and trashed = false`,
        fields:
          'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,webViewLink,description)',
        orderBy: 'modifiedTime desc',
      })

      if (pageToken) parametros.set('pageToken', pageToken)

      const response = await fetch(`${DRIVE_API}?${parametros.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const resultado = (await response.json()) as {
        files?: DriveFile[]
        nextPageToken?: string
        error?: { message?: string }
      }

      if (!response.ok) {
        throw new Error(resultado.error?.message || 'Google Drive rechazó la consulta.')
      }

      archivos.push(...(resultado.files ?? []))
      pageToken = resultado.nextPageToken || ''
    } while (pageToken)

    return archivos.filter((archivo) => tipoDrivePermitido(archivo.mimeType, archivo.name))
  }

  async function sincronizarGoogleDrive() {
    setMensaje('')

    if (!GOOGLE_CLIENT_ID || !GOOGLE_DRIVE_FOLDER_ID) {
      setMensaje(
        'Falta configurar Google Drive. Agrega VITE_GOOGLE_CLIENT_ID y VITE_GOOGLE_DRIVE_FOLDER_ID en .env.local y reinicia Vite.'
      )
      return
    }

    setSincronizandoDrive(true)

    try {
      const { data: usuarioData, error: usuarioError } = await supabase.auth.getUser()
      if (usuarioError || !usuarioData.user) {
        throw new Error('No se pudo identificar al usuario.')
      }

      const accessToken = await obtenerTokenGoogle()
      const archivos = await listarArchivosDrive(accessToken)
      const idSinClasificar = await obtenerCategoriaSinClasificar()

      const idsDrive = archivos.map((archivo) => archivo.id)
      let idsExistentes = new Set<string>()

      if (idsDrive.length > 0) {
        const { data: existentes, error: existentesError } = await supabase
          .from('documentos')
          .select('google_drive_id')
          .in('google_drive_id', idsDrive)

        if (existentesError) throw existentesError

        idsExistentes = new Set(
          (existentes ?? [])
            .map((fila) => fila.google_drive_id)
            .filter((id): id is string => Boolean(id))
        )
      }

      const nuevos = archivos.filter((archivo) => !idsExistentes.has(archivo.id))

      if (nuevos.length > 0) {
        const registros = nuevos.map((archivo) => ({
          id_categoria: idSinClasificar,
          subido_por: usuarioData.user.id,
          nombre: archivo.name,
          ruta_storage: null,
          fecha_documento: fechaDriveAFechaDocumento(
            archivo.modifiedTime || archivo.createdTime
          ),
          observaciones: archivo.description || null,
          activo: true,
          fuente: 'google_drive',
          url_externa: archivo.webViewLink || `https://drive.google.com/open?id=${archivo.id}`,
          google_drive_id: archivo.id,
        }))

        const { error: insertError } = await supabase
          .from('documentos')
          .insert(registros)

        if (insertError) throw insertError
      }

      setDriveConectado(true)
      setMensaje(
        nuevos.length === 0
          ? `Google Drive está actualizado. Se encontraron ${archivos.length} archivos y ninguno era nuevo.`
          : `Google Drive sincronizado. Se importaron ${nuevos.length} documento${nuevos.length === 1 ? '' : 's'} nuevo${nuevos.length === 1 ? '' : 's'}.`
      )

      setPagina(1)
      await cargarDocumentos(1)
    } catch (error) {
      console.error('Error al sincronizar Google Drive:', error)
      setMensaje(`No se pudo sincronizar Google Drive: ${formatearError(error)}`)
    } finally {
      setSincronizandoDrive(false)
    }
  }

  async function inactivarDocumento(id: number) {
    if (rol !== 'administrador') return

    const confirmar = window.confirm(
      '¿Quieres ocultar este documento de la lista de activos?'
    )
    if (!confirmar) return

    const { error } = await supabase
      .from('documentos')
      .update({ activo: false })
      .eq('id_documento', id)

    if (error) {
      console.error('Error al inactivar:', error)
      setMensaje('No se pudo inactivar el documento.')
      return
    }

    setMensaje('Documento inactivado.')
    await cargarDocumentos(pagina)
  }

  async function reactivarDocumento(id: number) {
    if (rol !== 'administrador') return

    const { error } = await supabase
      .from('documentos')
      .update({ activo: true })
      .eq('id_documento', id)

    if (error) {
      console.error('Error al reactivar:', error)
      setMensaje('No se pudo reactivar el documento.')
      return
    }

    setMensaje('Documento reactivado.')
    await cargarDocumentos(pagina)
  }

  function limpiarFiltros() {
    setBusqueda('')
    setFiltroCategoria('')
    setFiltroAnio('')
    setFiltroTipo('')
    setFiltroEstado('activos')
    setFechaDesde('')
    setFechaHasta('')
    setPagina(1)
  }

  const totalPaginas = Math.max(
    1,
    Math.ceil(totalDocumentos / DOCUMENTOS_POR_PAGINA)
  )

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '15px',
          flexWrap: 'wrap',
          marginBottom: '25px',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 5px' }}>📁 Documentos</h1>
          <p style={{ margin: 0, color: 'var(--text-soft)' }}>
            Busca, consulta y administra los documentos.
          </p>
        </div>

        <button type="button" onClick={onVolver}>
          ← Volver
        </button>
      </div>

      {mensaje && (
        <div
          style={{
            padding: '12px 15px',
            borderRadius: '10px',
            background: 'var(--primary-soft)',
            marginBottom: '20px',
          }}
        >
          {mensaje}
        </div>
      )}

      <div
        className="page-card"
        style={{
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)',
          gap: '20px',
        }}
      >
        <div>
          <h2 style={{ marginTop: 0 }}>➕ Subir documento</h2>

          <form onSubmit={subirDocumento}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '15px',
              }}
            >
              <div>
                <label>Categoría *</label>
                <select
                  value={idCategoria}
                  onChange={(e) => setIdCategoria(e.target.value)}
                  required
                  style={{ width: '100%', marginTop: '7px' }}
                >
                  <option value="">Selecciona una categoría</option>
                  {categorias.map((categoria) => (
                    <option
                      key={categoria.id_categoria}
                      value={categoria.id_categoria}
                    >
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Fecha del documento</label>
                <input
                  type="date"
                  value={fechaDocumento}
                  onChange={(e) => setFechaDocumento(e.target.value)}
                  style={{ width: '100%', marginTop: '7px' }}
                />
              </div>

              <div>
                <label>Archivo *</label>
                <input
                  id="archivo-documento"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                  required
                  style={{ width: '100%', marginTop: '7px' }}
                />
                <small style={{ color: 'var(--text-soft)' }}>
                  PDF o imagen · máximo 10 MB
                </small>
              </div>
            </div>

            <div style={{ marginTop: '15px' }}>
              <label>Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Descripción o información adicional..."
                style={{ width: '100%', marginTop: '7px' }}
              />
            </div>

            <button type="submit" disabled={subiendo} style={{ marginTop: '15px' }}>
              {subiendo ? 'Subiendo...' : 'Subir documento'}
            </button>
          </form>
        </div>

        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '18px',
            alignSelf: 'start',
          }}
        >
          <h2 style={{ marginTop: 0 }}>☁️ Google Drive</h2>
          <p style={{ color: 'var(--text-soft)', marginTop: 0 }}>
            Consulta la carpeta <strong>Documentos Instituto</strong> e importa al sistema los archivos nuevos.
          </p>

          <div style={{ marginBottom: '12px', fontSize: '14px' }}>
            <strong>Estado:</strong>{' '}
            {driveConectado ? '🟢 Conectado' : '⚪ Sin sincronizar'}
          </div>

          <button
            type="button"
            onClick={() => void sincronizarGoogleDrive()}
            disabled={sincronizandoDrive}
            style={{ width: '100%' }}
          >
            {sincronizandoDrive ? 'Sincronizando...' : '🔄 Sincronizar Google Drive'}
          </button>

          <small
            style={{
              display: 'block',
              marginTop: '10px',
              color: 'var(--text-soft)',
            }}
          >
            Los documentos de Drive entran inicialmente como “Sin clasificar”.
          </small>
        </div>
      </div>

      <div className="page-card" style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: '0 0 5px' }}>🔎 Buscar documentos</h2>
            <p style={{ margin: 0, color: 'var(--text-soft)' }}>
              Combina varios filtros para encontrar exactamente lo que necesitas.
            </p>
          </div>

          <button type="button" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '15px',
            marginTop: '20px',
          }}
        >
          <div style={{ gridColumn: 'span 2' }}>
            <label>Buscar</label>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPagina(1)
              }}
              placeholder="Nombre u observaciones..."
              style={{ width: '100%', marginTop: '7px' }}
            />
          </div>

          <div>
            <label>Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => {
                setFiltroCategoria(e.target.value)
                setPagina(1)
              }}
              style={{ width: '100%', marginTop: '7px' }}
            >
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option
                  key={categoria.id_categoria}
                  value={categoria.id_categoria}
                >
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Año</label>
            <select
              value={filtroAnio}
              onChange={(e) => {
                setFiltroAnio(e.target.value)
                setPagina(1)
              }}
              style={{ width: '100%', marginTop: '7px' }}
            >
              <option value="">Todos</option>
              {anios.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Tipo de archivo</label>
            <select
              value={filtroTipo}
              onChange={(e) => {
                setFiltroTipo(e.target.value)
                setPagina(1)
              }}
              style={{ width: '100%', marginTop: '7px' }}
            >
              <option value="">Todos</option>
              <option value="pdf">PDF</option>
              <option value="imagen">Imágenes</option>
            </select>
          </div>

          <div>
            <label>Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value)
                setPagina(1)
              }}
              style={{ width: '100%', marginTop: '7px' }}
            >
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
              <option value="todos">Todos</option>
            </select>
          </div>

          <div>
            <label>Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value)
                setPagina(1)
              }}
              style={{ width: '100%', marginTop: '7px' }}
            />
          </div>

          <div>
            <label>Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value)
                setPagina(1)
              }}
              style={{ width: '100%', marginTop: '7px' }}
            />
          </div>
        </div>
      </div>

      <div className="page-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '15px',
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>📄 Documentos encontrados</h2>
            <p style={{ margin: '5px 0 0', color: 'var(--text-soft)' }}>
              {totalDocumentos} documento{totalDocumentos === 1 ? '' : 's'}
            </p>
          </div>

          {cargando && <span>Cargando...</span>}
        </div>

        {documentosFiltrados.length === 0 ? (
          <div
            style={{
              padding: '35px 15px',
              textAlign: 'center',
              color: 'var(--text-soft)',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
            No encontramos documentos con esos filtros.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {documentosFiltrados.map((documento) => (
              <div
                key={documento.id_documento}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '15px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '15px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0, flex: '1 1 350px' }}>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '16px',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {documento.fuente === 'google_drive' ? '☁️' : '📄'}{' '}
                    {documento.nombre}
                  </strong>

                  <div
                    style={{
                      marginTop: '7px',
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      color: 'var(--text-soft)',
                      fontSize: '14px',
                    }}
                  >
                    <span>🗂️ {obtenerNombreCategoria(documento.id_categoria)}</span>
                    <span>·</span>
                    <span>📄 {obtenerTipoArchivo(documento.nombre)}</span>
                    <span>·</span>
                    <span>📅 {formatearFecha(documento.fecha_documento)}</span>
                    {documento.fuente === 'google_drive' && (
                      <>
                        <span>·</span>
                        <span>☁️ Google Drive</span>
                      </>
                    )}
                  </div>

                  {documento.observaciones && (
                    <p style={{ margin: '8px 0 0', color: 'var(--text-soft)' }}>
                      {documento.observaciones}
                    </p>
                  )}

                  {!documento.activo && (
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      INACTIVO
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => void verDocumento(documento)}>
                    👁️ Ver
                  </button>

                  {rol === 'administrador' && documento.activo && (
                    <button
                      type="button"
                      onClick={() => void inactivarDocumento(documento.id_documento)}
                    >
                      Ocultar
                    </button>
                  )}

                  {rol === 'administrador' && !documento.activo && (
                    <button
                      type="button"
                      onClick={() => void reactivarDocumento(documento.id_documento)}
                    >
                      Reactivar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalDocumentos > DOCUMENTOS_POR_PAGINA && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '15px',
              marginTop: '20px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
              disabled={pagina <= 1}
            >
              ← Anterior
            </button>

            <span>
              Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
            </span>

            <button
              type="button"
              onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}
              disabled={pagina >= totalPaginas}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Documentos
