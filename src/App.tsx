import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import { supabase } from './lib/supabase'

import NuevaAtencion from './components/NuevaAtención'
import BuscarRegistros from './components/BuscarRegistros'
import Estadisticas from './components/Estadisticas'
import Documentos from './components/Documentos'
import Historial from './components/Historial'
import Administracion from './components/Administracion'
import UsuariosAdmin from './components/UsuariosAdmin'
import AppLayout, {
  type Vista,
} from './components/AppLayout'


type Perfil = {
  id_usuario: string
  nombre: string
  rol:
    | 'administrador'
    | 'servicio_social'
  activo: boolean
}


function App() {
  const [
    correo,
    setCorreo,
  ] = useState('')

  const [
    password,
    setPassword,
  ] = useState('')

  const [
    recuperandoPassword,
    setRecuperandoPassword,
  ] = useState(false)

  const [
    configurandoPassword,
    setConfigurandoPassword,
  ] = useState(false)

  const [
    nuevaPassword,
    setNuevaPassword,
  ] = useState('')

  const [
    confirmarPassword,
    setConfirmarPassword,
  ] = useState('')

  const [
    guardandoPassword,
    setGuardandoPassword,
  ] = useState(false)

  const [
    mensaje,
    setMensaje,
  ] = useState('')

  const [
    cargando,
    setCargando,
  ] = useState(false)

  const [
    perfil,
    setPerfil,
  ] = useState<Perfil | null>(null)

  const [
    vista,
    setVista,
  ] = useState<Vista>(
    'inicio'
  )


  // ==========================================================
  // CARGAR PERFIL
  // ==========================================================

  async function cargarPerfil(
    idUsuario: string
  ) {
    const {
      data,
      error,
    } = await supabase
      .from('usuarios')
      .select(`
        id_usuario,
        nombre,
        rol,
        activo
      `)
      .eq(
        'id_usuario',
        idUsuario
      )
      .single()

    if (error) {
      console.error(
        'Error al obtener perfil:',
        error
      )

      await supabase.auth.signOut()

      setPerfil(null)

      setMensaje(
        'No se pudo obtener el perfil del usuario.'
      )

      return
    }

    const perfilUsuario =
      data as Perfil


    // ----------------------------------------------------------
    // CUENTA DESACTIVADA
    // ----------------------------------------------------------

    if (!perfilUsuario.activo) {
      await supabase.auth.signOut()

      setPerfil(null)

      setPassword('')

      setMensaje(
        'Esta cuenta se encuentra desactivada. Contacta al administrador.'
      )

      return
    }


    setPerfil(
      perfilUsuario
    )
  }


  // ==========================================================
  // RECUPERAR CONTRASEÑA
  // ==========================================================

  async function enviarRecuperacion(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setMensaje('')

    const email =
      correo
        .trim()
        .toLowerCase()

    if (!email) {
      setMensaje(
        'Escribe tu correo electrónico.'
      )
      return
    }

    setCargando(true)

    const {
      error,
    } =
      await supabase.auth
        .resetPasswordForEmail(
          email,
          {
            redirectTo:
              window.location.origin,
          }
        )

    if (error) {
      console.error(error)

      setMensaje(
        'No se pudo enviar el correo de recuperación.'
      )

      setCargando(false)
      return
    }

    setMensaje(
      'Te enviamos un correo para crear una nueva contraseña. Ábrelo desde esta computadora.'
    )

    setCargando(false)
  }


  // ==========================================================
  // INICIAR SESIÓN
  // ==========================================================

  async function iniciarSesion(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setCargando(true)

    setMensaje('')


    const {
      data,
      error,
    } =
      await supabase.auth
        .signInWithPassword({
          email: correo,
          password,
        })


    if (error) {
      console.error(error)

      setMensaje(
        'Correo o contraseña incorrectos.'
      )

      setCargando(false)

      return
    }


    await cargarPerfil(
      data.user.id
    )

    setCargando(false)
  }


  // ==========================================================
  // CONFIGURAR CONTRASEÑA DE UNA INVITACIÓN
  // ==========================================================

  async function guardarNuevaPassword(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setMensaje('')

    if (nuevaPassword.length < 8) {
      setMensaje(
        'La contraseña debe tener al menos 8 caracteres.'
      )
      return
    }

    if (
      nuevaPassword !==
      confirmarPassword
    ) {
      setMensaje(
        'Las contraseñas no coinciden.'
      )
      return
    }

    setGuardandoPassword(true)

    const {
      data,
      error,
    } =
      await supabase.auth
        .updateUser({
          password:
            nuevaPassword,
        })

    if (error) {
      console.error(error)

      setMensaje(
        'No se pudo guardar la contraseña. Intenta abrir nuevamente la invitación.'
      )

      setGuardandoPassword(false)
      return
    }

    setNuevaPassword('')
    setConfirmarPassword('')
    setConfigurandoPassword(false)

    if (data.user) {
      await cargarPerfil(
        data.user.id
      )
    }

    setGuardandoPassword(false)
  }


  // ==========================================================
  // CERRAR SESIÓN
  // ==========================================================

  async function cerrarSesion() {
    await supabase.auth.signOut()

    setPerfil(null)

    setCorreo('')

    setPassword('')

    setMensaje('')

    setVista('inicio')
  }


  // ==========================================================
  // RECUPERAR SESIÓN / DETECTAR INVITACIÓN
  // ==========================================================

  useEffect(() => {
    let activo = true

    async function comprobarSesion() {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth
          .getSession()

      if (
        activo &&
        session
      ) {
        await cargarPerfil(
          session.user.id
        )
      }
    }

    comprobarSesion()

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          async (
            event,
            session
          ) => {
            if (!activo) {
              return
            }

            if (
              event ===
              'PASSWORD_RECOVERY'
            ) {
              setConfigurandoPassword(
                true
              )
              setPerfil(null)
              setMensaje('')
              return
            }

            if (
              event ===
                'SIGNED_IN' &&
              session
            ) {
              const parametros =
                new URLSearchParams(
                  window.location.search
                )

              const hash =
                new URLSearchParams(
                  window.location.hash
                    .replace(
                      /^#/,
                      ''
                    )
                )

              const vieneDeInvitacion =
                parametros.get(
                  'type'
                ) === 'invite' ||
                hash.get(
                  'type'
                ) === 'invite'

              if (
                vieneDeInvitacion
              ) {
                setConfigurandoPassword(
                  true
                )
                setPerfil(null)
                setMensaje('')
                return
              }

              await cargarPerfil(
                session.user.id
              )
            }
          }
        )

    return () => {
      activo = false
      subscription.unsubscribe()
    }
  }, [])


  // ==========================================================
  // LOGIN
  // ==========================================================

  if (
    configurandoPassword
  ) {
    return (
      <div
        className="auth-page"
      >
        <div
          className="page-card auth-card"
        >
          <div
            className="auth-brand"
          >
            <div
              className="auth-icon"
            >
              🔐
            </div>

            <h1>
              Configura tu contraseña
            </h1>

            <p>
              Tu invitación fue aceptada.
              Crea una contraseña para
              terminar de configurar tu cuenta.
            </p>
          </div>

          <form
            onSubmit={
              guardarNuevaPassword
            }
          >
            <div
              className="auth-field"
            >
              <label>
                Nueva contraseña
              </label>

              <input
                type="password"
                value={
                  nuevaPassword
                }
                onChange={(e) =>
                  setNuevaPassword(
                    e.target.value
                  )
                }
                minLength={8}
                autoComplete="new-password"
                required
              />

              <small>
                Usa al menos 8 caracteres.
              </small>
            </div>

            <div
              className="auth-field"
            >
              <label>
                Confirmar contraseña
              </label>

              <input
                type="password"
                value={
                  confirmarPassword
                }
                onChange={(e) =>
                  setConfirmarPassword(
                    e.target.value
                  )
                }
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-primary"
              disabled={
                guardandoPassword
              }
            >
              {guardandoPassword
                ? 'Guardando...'
                : 'Guardar contraseña'}
            </button>
          </form>

          {mensaje && (
            <div
              className="auth-message"
            >
              {mensaje}
            </div>
          )}
        </div>

        <style>{`
          .auth-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
          }

          .auth-card {
            width: 100%;
            max-width: 430px;
          }

          .auth-brand {
            margin-bottom: 26px;
            text-align: center;
          }

          .auth-icon {
            display: flex;
            width: 54px;
            height: 54px;
            align-items: center;
            justify-content: center;
            margin: 0 auto 14px;
            border-radius: 16px;
            background: var(--surface-soft);
            font-size: 23px;
          }

          .auth-brand h1 {
            margin: 0 0 9px;
            color: var(--text);
            font-size: 25px;
          }

          .auth-brand p {
            margin: 0;
            color: var(--text-soft);
            font-size: 13px;
            line-height: 1.6;
          }

          .auth-field {
            margin-bottom: 16px;
          }

          .auth-field label {
            display: block;
            margin-bottom: 7px;
            color: var(--text);
            font-size: 12px;
            font-weight: 700;
          }

          .auth-field input {
            width: 100%;
            box-sizing: border-box;
          }

          .auth-field small {
            display: block;
            margin-top: 6px;
            color: var(--text-soft);
            font-size: 10px;
          }

          .auth-primary {
            width: 100%;
            padding: 12px;
            border-color: var(--primary);
            background: var(--primary);
            color: white;
            font-weight: 700;
          }

          .auth-message {
            margin-top: 16px;
            padding: 12px;
            border-radius: 10px;
            background: var(--primary-soft);
            color: var(--text);
            font-size: 12px;
          }
        `}</style>
      </div>
    )
  }


  if (
    recuperandoPassword &&
    !configurandoPassword
  ) {
    return (
      <div className="auth-page">
        <div className="page-card auth-card">
          <div className="auth-brand">
            <div className="auth-icon">
              ✉️
            </div>

            <h1>
              Recuperar contraseña
            </h1>

            <p>
              Escribe el correo de tu cuenta.
              Te enviaremos un enlace para crear
              una contraseña nueva.
            </p>
          </div>

          <form
            onSubmit={
              enviarRecuperacion
            }
          >
            <div className="auth-field">
              <label>
                Correo electrónico
              </label>

              <input
                type="email"
                value={correo}
                onChange={(e) =>
                  setCorreo(
                    e.target.value
                  )
                }
                autoComplete="email"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-primary"
              disabled={cargando}
            >
              {cargando
                ? 'Enviando...'
                : 'Enviar enlace'}
            </button>
          </form>

          <button
            type="button"
            className="auth-link-button"
            onClick={() => {
              setRecuperandoPassword(
                false
              )
              setMensaje('')
            }}
          >
            ← Volver a iniciar sesión
          </button>

          {mensaje && (
            <div className="auth-message">
              {mensaje}
            </div>
          )}
        </div>

        <style>{`
          .auth-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
          }

          .auth-card {
            width: 100%;
            max-width: 430px;
          }

          .auth-brand {
            margin-bottom: 26px;
            text-align: center;
          }

          .auth-icon {
            display: flex;
            width: 54px;
            height: 54px;
            align-items: center;
            justify-content: center;
            margin: 0 auto 14px;
            border-radius: 16px;
            background: var(--surface-soft);
            font-size: 23px;
          }

          .auth-brand h1 {
            margin: 0 0 9px;
            color: var(--text);
            font-size: 25px;
          }

          .auth-brand p {
            margin: 0;
            color: var(--text-soft);
            font-size: 13px;
            line-height: 1.6;
          }

          .auth-field {
            margin-bottom: 16px;
          }

          .auth-field label {
            display: block;
            margin-bottom: 7px;
            color: var(--text);
            font-size: 12px;
            font-weight: 700;
          }

          .auth-field input {
            width: 100%;
            box-sizing: border-box;
          }

          .auth-primary {
            width: 100%;
            padding: 12px;
            border-color: var(--primary);
            background: var(--primary);
            color: white;
            font-weight: 700;
          }

          .auth-link-button {
            width: 100%;
            margin-top: 12px;
            border: none;
            background: transparent;
            color: var(--primary);
            font-weight: 700;
            cursor: pointer;
          }

          .auth-message {
            margin-top: 16px;
            padding: 12px;
            border-radius: 10px;
            background: var(--primary-soft);
            color: var(--text);
            font-size: 12px;
          }
        `}</style>
      </div>
    )
  }


  if (!perfil) {
    return (
      <div
        style={{
          minHeight:
            '100vh',

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',

          padding:
            '20px',
        }}
      >
        <div
          className="page-card"
          style={{
            width:
              '100%',

            maxWidth:
              '420px',
          }}
        >
          <div
            style={{
              textAlign:
                'center',

              marginBottom:
                '30px',
            }}
          >
            <div
              style={{
                fontSize:
                  '42px',

                marginBottom:
                  '10px',
              }}
            >
              🌸
            </div>

            <h1
              style={{
                margin:
                  '0 0 8px',

                fontSize:
                  '30px',

                lineHeight:
                  '1.15',
              }}
            >
              Vero Verito
              <br />
              y sus Pupilos
            </h1>

            <p
              style={{
                margin:
                  0,

                color:
                  'var(--text-soft)',
              }}
            >
              Sistema de Atenciones
            </p>
          </div>


          <h2>
            Iniciar sesión
          </h2>


          <form
            onSubmit={
              iniciarSesion
            }
          >
            <div
              style={{
                marginBottom:
                  '18px',
              }}
            >
              <label>
                Correo
              </label>

              <input
                type="email"
                value={
                  correo
                }
                onChange={(e) =>
                  setCorreo(
                    e.target.value
                  )
                }
                required
                style={{
                  width:
                    '100%',

                  marginTop:
                    '7px',
                }}
              />
            </div>


            <div
              style={{
                marginBottom:
                  '20px',
              }}
            >
              <label>
                Contraseña
              </label>

              <input
                type="password"
                value={
                  password
                }
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                required
                style={{
                  width:
                    '100%',

                  marginTop:
                    '7px',
                }}
              />
            </div>


            <button
              type="button"
              onClick={() => {
                setRecuperandoPassword(
                  true
                )
                setMensaje('')
              }}
              style={{
                display: 'block',
                width: 'fit-content',
                margin:
                  '-4px 0 16px auto',
                padding: 0,
                border: 'none',
                background:
                  'transparent',
                color:
                  'var(--primary)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>


            <button
              type="submit"
              disabled={
                cargando
              }
              style={{
                width:
                  '100%',

                background:
                  'var(--primary)',

                color:
                  'white',

                borderColor:
                  'var(--primary)',

                fontWeight:
                  700,

                padding:
                  '12px',
              }}
            >
              {cargando
                ? 'Ingresando...'
                : 'Iniciar sesión'}
            </button>
          </form>


          {mensaje && (
            <div
              style={{
                marginTop:
                  '18px',

                padding:
                  '12px',

                borderRadius:
                  '10px',

                background:
                  'var(--primary-soft)',

                color:
                  'var(--text)',
              }}
            >
              {mensaje}
            </div>
          )}
        </div>
      </div>
    )
  }


  // ==========================================================
  // CONTENIDO DE LA APLICACIÓN
  // ==========================================================

  let contenido;


  // ----------------------------------------------------------
  // INICIO
  // ----------------------------------------------------------

  if (
    vista ===
    'inicio'
  ) {
    contenido = (
      <>
        <div className="page-header">
          <h1>
            Buenos días,
            <br />
            {perfil.nombre} 👋
          </h1>

          <p>
            Bienvenid@ al Sistema
            de Atenciones.
          </p>
        </div>


        <div
          className="page-card"
          style={{
            marginBottom:
              '20px',
          }}
        >
          <h2
            style={{
              marginTop:
                0,
            }}
          >
            ¿Qué deseas hacer?
          </h2>

          <p
            style={{
              color:
                'var(--text-soft)',
            }}
          >
            Selecciona una opción
            del menú para comenzar.
          </p>
        </div>


        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',

            gap:
              '16px',
          }}
        >
          <button
            type="button"
            className="page-card"
            onClick={() =>
              setVista(
                'nueva_atencion'
              )
            }
            style={{
              textAlign:
                'left',

              cursor:
                'pointer',
            }}
          >
            <div
              style={{
                fontSize:
                  '30px',

                marginBottom:
                  '12px',
              }}
            >
              ➕
            </div>

            <strong>
              Nueva atención
            </strong>

            <p
              style={{
                color:
                  'var(--text-soft)',

                marginBottom:
                  0,
              }}
            >
              Registrar una nueva
              atención.
            </p>
          </button>


          <button
            type="button"
            className="page-card"
            onClick={() =>
              setVista(
                'buscar_registros'
              )
            }
            style={{
              textAlign:
                'left',

              cursor:
                'pointer',
            }}
          >
            <div
              style={{
                fontSize:
                  '30px',

                marginBottom:
                  '12px',
              }}
            >
              🔎
            </div>

            <strong>
              Buscar registros
            </strong>

            <p
              style={{
                color:
                  'var(--text-soft)',

                marginBottom:
                  0,
              }}
            >
              Consultar y modificar
              registros.
            </p>
          </button>


          <button
            type="button"
            className="page-card"
            onClick={() =>
              setVista(
                'documentos'
              )
            }
            style={{
              textAlign:
                'left',

              cursor:
                'pointer',
            }}
          >
            <div
              style={{
                fontSize:
                  '30px',

                marginBottom:
                  '12px',
              }}
            >
              📁
            </div>

            <strong>
              Documentos
            </strong>

            <p
              style={{
                color:
                  'var(--text-soft)',

                marginBottom:
                  0,
              }}
            >
              Consultar y gestionar
              documentos.
            </p>
          </button>


          {perfil.rol ===
            'administrador' && (
            <button
              type="button"
              className="page-card"
              onClick={() =>
                setVista(
                  'estadisticas'
                )
              }
              style={{
                textAlign:
                  'left',

                cursor:
                  'pointer',
              }}
            >
              <div
                style={{
                  fontSize:
                    '30px',

                  marginBottom:
                    '12px',
                }}
              >
                📊
              </div>

              <strong>
                Estadísticas
              </strong>

              <p
                style={{
                  color:
                    'var(--text-soft)',

                  marginBottom:
                    0,
                }}
              >
                Consultar resultados
                y reportes.
              </p>
            </button>
          )}
        </div>
      </>
    )
  }


  // ----------------------------------------------------------
  // NUEVA ATENCIÓN
  // ----------------------------------------------------------

  else if (
    vista ===
    'nueva_atencion'
  ) {
    contenido = (
      <NuevaAtencion
        onVolver={() =>
          setVista(
            'inicio'
          )
        }
      />
    )
  }


  // ----------------------------------------------------------
  // REGISTROS
  // ----------------------------------------------------------

  else if (
    vista ===
    'buscar_registros'
  ) {
    contenido = (
      <BuscarRegistros
        onVolver={() =>
          setVista(
            'inicio'
          )
        }
        rol={
          perfil.rol
        }
      />
    )
  }


  // ----------------------------------------------------------
  // DOCUMENTOS
  // ----------------------------------------------------------

  else if (
    vista ===
    'documentos'
  ) {
    contenido = (
      <Documentos
        onVolver={() =>
          setVista(
            'inicio'
          )
        }
        rol={
          perfil.rol
        }
      />
    )
  }


  // ----------------------------------------------------------
  // ESTADÍSTICAS
  // ----------------------------------------------------------

  else if (
    vista ===
      'estadisticas' &&
    perfil.rol ===
      'administrador'
  ) {
    contenido = (
      <Estadisticas
        onVolver={() =>
          setVista(
            'inicio'
          )
        }
      />
    )
  }


  // ----------------------------------------------------------
  // HISTORIAL
  // ----------------------------------------------------------

  else if (
    vista ===
      'historial' &&
    perfil.rol ===
      'administrador'
  ) {
    contenido = (
      <Historial
        onVolver={() =>
          setVista(
            'inicio'
          )
        }
      />
    )
  }


  // ----------------------------------------------------------
  // ADMINISTRACIÓN
  // ----------------------------------------------------------

  else if (
    vista ===
      'administracion' &&
    perfil.rol ===
      'administrador'
  ) {
    contenido = (
      <Administracion
        onVolver={() =>
          setVista(
            'inicio'
          )
        }
      />
    )
  }


  // ----------------------------------------------------------
  // USUARIOS
  // ----------------------------------------------------------

  else if (
    vista ===
      'usuarios' &&
    perfil.rol ===
      'administrador'
  ) {
    contenido = (
      <UsuariosAdmin
        onVolver={() =>
          setVista(
            'inicio'
          )
        }
      />
    )
  }


  // ==========================================================
  // RENDER FINAL
  // ==========================================================

  return (
    <AppLayout
      nombre={
        perfil.nombre
      }
      rol={
        perfil.rol
      }
      vista={
        vista
      }
      onCambiarVista={
        setVista
      }
      onCerrarSesion={
        cerrarSesion
      }
    >
      {contenido}
    </AppLayout>
  )
}


export default App