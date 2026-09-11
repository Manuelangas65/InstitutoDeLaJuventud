import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import { supabase } from '../lib/supabase'

type UsuariosAdminProps = {
  onVolver: () => void
}

type Rol =
  | 'administrador'
  | 'servicio_social'

type Usuario = {
  id_usuario: string
  nombre: string
  rol: Rol
  activo: boolean
  fecha_creacion: string
}

function UsuariosAdmin({
  onVolver,
}: UsuariosAdminProps) {
  const [
    usuarios,
    setUsuarios,
  ] = useState<Usuario[]>([])

  const [
    usuarioActual,
    setUsuarioActual,
  ] = useState('')

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    mensaje,
    setMensaje,
  ] = useState('')

  const [
    errorMensaje,
    setErrorMensaje,
  ] = useState('')

  const [
    mostrarCrearUsuario,
    setMostrarCrearUsuario,
  ] = useState(false)

  const [
    nuevoNombre,
    setNuevoNombre,
  ] = useState('')

  const [
    nuevoEmail,
    setNuevoEmail,
  ] = useState('')

  const [
    nuevoRol,
    setNuevoRol,
  ] = useState<Rol>(
    'servicio_social'
  )

  const [
    enviandoInvitacion,
    setEnviandoInvitacion,
  ] = useState(false)


  async function invitarUsuario(
    e: FormEvent
  ) {
    e.preventDefault()

    setMensaje('')
    setErrorMensaje('')

    const nombre =
      nuevoNombre.trim()

    const email =
      nuevoEmail
        .trim()
        .toLowerCase()

    if (!nombre || !email) {
      setErrorMensaje(
        'Nombre y correo son obligatorios.'
      )
      return
    }

    setEnviandoInvitacion(true)

    try {
      const {
        data,
        error,
      } =
        await supabase
          .functions
          .invoke(
            'invitar-usuario',
            {
              body: {
                nombre,
                email,
                rol:
                  nuevoRol,
              },
            }
          )

      if (error) {
        console.error(error)

        let detalle =
          'No se pudo enviar la invitación.'

        try {
          const contexto =
            (error as {
              context?: Response
            }).context

          if (contexto) {
            const respuesta =
              await contexto
                .clone()
                .json()

            if (
              respuesta?.error
            ) {
              detalle =
                respuesta.error
            }
          }
        } catch {
          // Conservamos el mensaje general.
        }

        setErrorMensaje(
          detalle
        )
        return
      }

      if (data?.error) {
        setErrorMensaje(
          data.error
        )
        return
      }

      setMensaje(
        `✅ Invitación enviada a ${email}.`
      )

      setNuevoNombre('')
      setNuevoEmail('')
      setNuevoRol(
        'servicio_social'
      )
      setMostrarCrearUsuario(
        false
      )

      await cargarUsuarios()
    } catch (error) {
      console.error(error)

      setErrorMensaje(
        'Ocurrió un error al enviar la invitación.'
      )
    } finally {
      setEnviandoInvitacion(
        false
      )
    }
  }


  async function cargarUsuarios() {
    setCargando(true)
    setErrorMensaje('')

    const {
      data: authData,
    } =
      await supabase.auth.getUser()

    if (authData.user) {
      setUsuarioActual(
        authData.user.id
      )
    }

    const {
      data,
      error,
    } =
      await supabase
        .from('usuarios')
        .select(`
          id_usuario,
          nombre,
          rol,
          activo,
          fecha_creacion
        `)
        .order(
          'nombre',
          {
            ascending: true,
          }
        )

    if (error) {
      console.error(error)

      setErrorMensaje(
        'No se pudieron cargar los usuarios.'
      )

      setCargando(false)
      return
    }

    setUsuarios(
      (data ?? []) as Usuario[]
    )

    setCargando(false)
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  async function cambiarRol(
    usuario: Usuario,
    nuevoRol: Rol
  ) {
    setMensaje('')
    setErrorMensaje('')

    if (
      usuario.id_usuario ===
      usuarioActual
    ) {
      setErrorMensaje(
        'No puedes cambiar el rol de la cuenta con la que estás trabajando.'
      )
      return
    }

    if (
      usuario.rol === nuevoRol
    ) {
      return
    }

    const confirmado =
      window.confirm(
        `¿Cambiar a ${usuario.nombre} al rol "${nuevoRol === 'administrador'
          ? 'Administrador'
          : 'Servicio social'
        }"?`
      )

    if (!confirmado) {
      return
    }

    const {
      error,
    } =
      await supabase
        .from('usuarios')
        .update({
          rol: nuevoRol,
        })
        .eq(
          'id_usuario',
          usuario.id_usuario
        )

    if (error) {
      console.error(error)

      setErrorMensaje(
        'No se pudo cambiar el rol.'
      )
      return
    }

    setMensaje(
      `✅ Rol de ${usuario.nombre} actualizado.`
    )

    await cargarUsuarios()
  }

  async function cambiarEstado(
    usuario: Usuario
  ) {
    setMensaje('')
    setErrorMensaje('')

    if (
      usuario.id_usuario ===
      usuarioActual
    ) {
      setErrorMensaje(
        'No puedes desactivar tu propia cuenta mientras estás usando el sistema.'
      )
      return
    }

    const nuevoEstado =
      !usuario.activo

    const confirmado =
      window.confirm(
        nuevoEstado
          ? `¿Reactivar la cuenta de ${usuario.nombre}?`
          : `¿Desactivar la cuenta de ${usuario.nombre}?`
      )

    if (!confirmado) {
      return
    }

    const {
      error,
    } =
      await supabase
        .from('usuarios')
        .update({
          activo:
            nuevoEstado,
        })
        .eq(
          'id_usuario',
          usuario.id_usuario
        )

    if (error) {
      console.error(error)

      setErrorMensaje(
        nuevoEstado
          ? 'No se pudo reactivar la cuenta.'
          : 'No se pudo desactivar la cuenta.'
      )

      return
    }

    setMensaje(
      nuevoEstado
        ? `✅ ${usuario.nombre} fue reactivado.`
        : `✅ ${usuario.nombre} fue desactivado.`
    )

    await cargarUsuarios()
  }

  function fechaLegible(
    fecha: string
  ) {
    return new Date(
      fecha
    ).toLocaleDateString(
      'es-MX',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    )
  }


  const usuariosActivos =
    usuarios.filter(
      (usuario) => usuario.activo
    ).length


  const administradores =
    usuarios.filter(
      (usuario) =>
        usuario.rol ===
        'administrador'
    ).length


  const servicioSocial =
    usuarios.filter(
      (usuario) =>
        usuario.rol ===
        'servicio_social'
    ).length


  return (
    <div className="ua-page">

      <header className="ua-header">

        <div>
          <button
            type="button"
            className="ua-back"
            onClick={onVolver}
          >
            ← Volver al inicio
          </button>

          <h1>Usuarios</h1>

          <p>
            Administra quién puede entrar al sistema,
            qué rol tiene y si su cuenta se encuentra activa.
          </p>
        </div>


        <div className="ua-header-actions">

          <button
            type="button"
            className="ua-create-button"
            onClick={() =>
              setMostrarCrearUsuario(
                (actual) => !actual
              )
            }
          >
            {mostrarCrearUsuario
              ? '× Cerrar formulario'
              : '+ Crear usuario'}
          </button>

          <div className="ua-header-badge">
          <span>👥</span>

          <div>
            <strong>Control de acceso</strong>
            <small>Gestión de usuarios</small>
          </div>
        </div>

        </div>

      </header>


      <section className="ua-summary-grid">

        <article className="ua-summary-card">
          <span>Total de usuarios</span>
          <strong>{usuarios.length}</strong>
          <small>{usuariosActivos} activos</small>
        </article>

        <article className="ua-summary-card">
          <span>Administradores</span>
          <strong>{administradores}</strong>
          <small>Acceso completo</small>
        </article>

        <article className="ua-summary-card">
          <span>Servicio social</span>
          <strong>{servicioSocial}</strong>
          <small>Acceso limitado</small>
        </article>

      </section>


      {mostrarCrearUsuario && (
        <section className="ua-create-card">

          <div className="ua-create-heading">
            <div className="ua-create-icon">
              +
            </div>

            <div>
              <h2>
                Invitar nuevo usuario
              </h2>

              <p>
                La persona recibirá una invitación por correo
                para configurar el acceso a su cuenta.
              </p>
            </div>
          </div>


          <form
            className="ua-create-form"
            onSubmit={invitarUsuario}
          >

            <div className="ua-create-field">
              <label htmlFor="nuevoNombre">
                Nombre completo *
              </label>

              <input
                id="nuevoNombre"
                type="text"
                value={nuevoNombre}
                onChange={(e) =>
                  setNuevoNombre(
                    e.target.value
                  )
                }
                placeholder="Ej. María López"
                autoComplete="name"
                disabled={
                  enviandoInvitacion
                }
                required
              />
            </div>


            <div className="ua-create-field">
              <label htmlFor="nuevoEmail">
                Correo electrónico *
              </label>

              <input
                id="nuevoEmail"
                type="email"
                value={nuevoEmail}
                onChange={(e) =>
                  setNuevoEmail(
                    e.target.value
                  )
                }
                placeholder="nombre@correo.com"
                autoComplete="email"
                disabled={
                  enviandoInvitacion
                }
                required
              />
            </div>


            <div className="ua-create-field">
              <label htmlFor="nuevoRol">
                Rol *
              </label>

              <select
                id="nuevoRol"
                value={nuevoRol}
                onChange={(e) =>
                  setNuevoRol(
                    e.target
                      .value as Rol
                  )
                }
                disabled={
                  enviandoInvitacion
                }
              >
                <option
                  value="servicio_social"
                >
                  Servicio social
                </option>

                <option
                  value="administrador"
                >
                  Administrador
                </option>
              </select>
            </div>


            <div className="ua-create-actions">

              <button
                type="button"
                className="ua-cancel-button"
                disabled={
                  enviandoInvitacion
                }
                onClick={() => {
                  setMostrarCrearUsuario(
                    false
                  )
                  setNuevoNombre('')
                  setNuevoEmail('')
                  setNuevoRol(
                    'servicio_social'
                  )
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="ua-send-button"
                disabled={
                  enviandoInvitacion
                }
              >
                {enviandoInvitacion
                  ? 'Enviando invitación...'
                  : 'Enviar invitación'}
              </button>

            </div>

          </form>

        </section>
      )}


      <section className="ua-info-card">

        <div className="ua-info-icon">
          i
        </div>

        <div>
          <strong>
            Sobre las cuentas nuevas
          </strong>

          <p>
            Las cuentas nuevas se crean mediante una
            función segura de Supabase. La clave administrativa
            permanece fuera del navegador y solo una cuenta
            administradora activa puede solicitar invitaciones.
          </p>
        </div>

      </section>


      {mensaje && (
        <div className="ua-alert ua-success">
          <span>✓</span>

          <div>
            <strong>Cambio guardado</strong>
            <p>
              {mensaje.replace(
                '✅ ',
                ''
              )}
            </p>
          </div>
        </div>
      )}


      {errorMensaje && (
        <div className="ua-alert ua-error">
          <span>!</span>

          <div>
            <strong>
              No se pudo completar la acción
            </strong>

            <p>{errorMensaje}</p>
          </div>
        </div>
      )}


      {cargando ? (

        <div className="ua-loading">
          <span className="ua-loader" />

          <div>
            <strong>
              Cargando usuarios...
            </strong>

            <p>
              Obteniendo las cuentas registradas.
            </p>
          </div>
        </div>

      ) : usuarios.length === 0 ? (

        <div className="ua-empty">
          <span>👥</span>
          <strong>No hay usuarios registrados</strong>
          <p>
            Cuando existan cuentas aparecerán aquí.
          </p>
        </div>

      ) : (

        <section className="ua-card">

          <div className="ua-card-header">

            <div>
              <h2>
                Usuarios registrados
              </h2>

              <p>
                Cambia roles o activa y desactiva cuentas.
              </p>
            </div>

            <span className="ua-count">
              {usuarios.length}
            </span>

          </div>


          <div className="ua-users">

            {usuarios.map(
              (usuario) => {

                const esActual =
                  usuario.id_usuario ===
                  usuarioActual

                return (
                  <article
                    key={
                      usuario.id_usuario
                    }
                    className={
                      usuario.activo
                        ? 'ua-user'
                        : 'ua-user ua-user-inactive'
                    }
                  >

                    <div className="ua-user-main">

                      <div className="ua-avatar">
                        {usuario.nombre
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>


                      <div className="ua-user-info">

                        <div className="ua-user-title">

                          <strong>
                            {usuario.nombre}
                          </strong>

                          {esActual && (
                            <span className="ua-current">
                              Tu cuenta
                            </span>
                          )}

                        </div>


                        <div className="ua-meta">

                          <span
                            className={
                              usuario.activo
                                ? 'ua-state ua-state-active'
                                : 'ua-state ua-state-inactive'
                            }
                          >
                            {usuario.activo
                              ? 'Activo'
                              : 'Inactivo'}
                          </span>

                          <span>
                            Creada el{' '}
                            {fechaLegible(
                              usuario.fecha_creacion
                            )}
                          </span>

                        </div>


                        {esActual && (
                          <p className="ua-self-note">
                            Esta es la cuenta con la que
                            estás usando el sistema.
                          </p>
                        )}

                      </div>

                    </div>


                    <div className="ua-controls">

                      <div className="ua-role-control">

                        <label
                          htmlFor={
                            `rol-${usuario.id_usuario}`
                          }
                        >
                          Rol
                        </label>

                        <select
                          id={
                            `rol-${usuario.id_usuario}`
                          }
                          value={
                            usuario.rol
                          }
                          disabled={
                            esActual
                          }
                          onChange={(e) =>
                            cambiarRol(
                              usuario,
                              e.target
                                .value as Rol
                            )
                          }
                        >
                          <option
                            value="administrador"
                          >
                            Administrador
                          </option>

                          <option
                            value="servicio_social"
                          >
                            Servicio social
                          </option>
                        </select>

                      </div>


                      {!esActual && (
                        <button
                          type="button"
                          className={
                            usuario.activo
                              ? 'ua-toggle ua-toggle-off'
                              : 'ua-toggle ua-toggle-on'
                          }
                          onClick={() =>
                            cambiarEstado(
                              usuario
                            )
                          }
                        >
                          {usuario.activo
                            ? 'Desactivar cuenta'
                            : 'Reactivar cuenta'}
                        </button>
                      )}

                    </div>

                  </article>
                )
              }
            )}

          </div>

        </section>

      )}


      <style>{`

        .ua-page {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 8px 0 40px;
          box-sizing: border-box;
        }

        .ua-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 25px;
        }

        .ua-header h1 {
          margin: 14px 0 8px;
          color: var(--text);
          font-size: clamp(28px, 4vw, 38px);
          line-height: 1.1;
          letter-spacing: -0.8px;
        }

        .ua-header p {
          max-width: 700px;
          margin: 0;
          color: var(--text-soft);
          font-size: 15px;
          line-height: 1.6;
        }

        .ua-back {
          padding: 0;
          border: none;
          background: transparent;
          color: var(--primary);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .ua-back:hover {
          opacity: .75;
        }

        .ua-header-badge {
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

        .ua-header-badge > span {
          display: flex;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 12px;
          background: var(--surface-soft);
          font-size: 18px;
        }

        .ua-header-badge > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .ua-header-badge strong {
          color: var(--text);
          font-size: 12px;
        }

        .ua-header-badge small {
          color: var(--text-soft);
          font-size: 10px;
        }

        .ua-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .ua-create-button {
          min-height: 42px;
          padding: 0 15px;
          border: 1px solid var(--primary);
          border-radius: 11px;
          background: var(--primary);
          color: white;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .ua-create-button:hover {
          opacity: .9;
        }

        .ua-create-card {
          margin-bottom: 18px;
          padding: 20px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .ua-create-heading {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 17px;
        }

        .ua-create-icon {
          display: flex;
          width: 34px;
          height: 34px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 10px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 17px;
          font-weight: 900;
        }

        .ua-create-heading h2 {
          margin: 0 0 4px;
          color: var(--text);
          font-size: 14px;
        }

        .ua-create-heading p {
          margin: 0;
          color: var(--text-soft);
          font-size: 9px;
          line-height: 1.5;
        }

        .ua-create-form {
          display: grid;
          grid-template-columns: 1fr 1fr .75fr;
          align-items: end;
          gap: 11px;
        }

        .ua-create-field {
          min-width: 0;
        }

        .ua-create-field label {
          display: block;
          margin-bottom: 6px;
          color: var(--text);
          font-size: 9px;
          font-weight: 700;
        }

        .ua-create-field input,
        .ua-create-field select {
          width: 100%;
          min-height: 39px;
          box-sizing: border-box;
          font-size: 9px;
        }

        .ua-create-actions {
          display: flex;
          grid-column: 1 / -1;
          justify-content: flex-end;
          gap: 7px;
          margin-top: 3px;
        }

        .ua-cancel-button,
        .ua-send-button {
          min-height: 37px;
          padding: 0 13px;
          border-radius: 9px;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .ua-cancel-button {
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text);
        }

        .ua-send-button {
          border: 1px solid var(--primary);
          background: var(--primary);
          color: white;
        }

        .ua-cancel-button:disabled,
        .ua-send-button:disabled {
          cursor: not-allowed;
          opacity: .55;
        }

        .ua-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }

        .ua-summary-card {
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 15px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .ua-summary-card > span {
          display: block;
          margin-bottom: 8px;
          color: var(--text-soft);
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .45px;
        }

        .ua-summary-card strong {
          display: block;
          margin-bottom: 4px;
          color: var(--text);
          font-size: 25px;
        }

        .ua-summary-card small {
          color: var(--primary);
          font-size: 9px;
          font-weight: 700;
        }

        .ua-info-card,
        .ua-alert,
        .ua-loading {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin-bottom: 17px;
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: var(--surface);
        }

        .ua-info-icon,
        .ua-alert > span {
          display: flex;
          width: 28px;
          height: 28px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          font-size: 10px;
          font-weight: 900;
        }

        .ua-info-icon {
          background: var(--surface-soft);
          color: var(--primary);
        }

        .ua-info-card strong,
        .ua-alert strong,
        .ua-loading strong {
          display: block;
          margin-bottom: 3px;
          color: var(--text);
          font-size: 10px;
        }

        .ua-info-card p,
        .ua-alert p,
        .ua-loading p {
          margin: 0;
          color: var(--text-soft);
          font-size: 9px;
          line-height: 1.5;
        }

        .ua-success > span {
          background: #2f9e62;
          color: white;
        }

        .ua-error > span {
          background: var(--danger);
          color: white;
        }

        .ua-card {
          padding: 22px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .ua-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .ua-card-header h2 {
          margin: 0 0 4px;
          color: var(--text);
          font-size: 15px;
        }

        .ua-card-header p {
          margin: 0;
          color: var(--text-soft);
          font-size: 10px;
        }

        .ua-count {
          display: flex;
          min-width: 28px;
          height: 28px;
          align-items: center;
          justify-content: center;
          padding: 0 7px;
          border-radius: 999px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 9px;
          font-weight: 800;
        }

        .ua-users {
          display: grid;
          gap: 9px;
        }

        .ua-user {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 15px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg);
        }

        .ua-user-inactive {
          opacity: .58;
        }

        .ua-user-main {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 11px;
          flex: 1;
        }

        .ua-avatar {
          display: flex;
          width: 39px;
          height: 39px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 12px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 14px;
          font-weight: 800;
        }

        .ua-user-info {
          min-width: 0;
        }

        .ua-user-title {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 5px;
        }

        .ua-user-title strong {
          color: var(--text);
          font-size: 11px;
        }

        .ua-current {
          padding: 3px 6px;
          border-radius: 999px;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 7px;
          font-weight: 800;
        }

        .ua-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          color: var(--text-soft);
          font-size: 8px;
        }

        .ua-state {
          display: inline-flex;
          padding: 3px 6px;
          border-radius: 999px;
          background: var(--surface-soft);
          color: var(--text-soft);
          font-weight: 800;
        }

        .ua-state-active {
          color: #2f9e62;
        }

        .ua-state-inactive {
          color: var(--danger);
        }

        .ua-self-note {
          margin: 6px 0 0;
          color: var(--primary);
          font-size: 8px;
          font-weight: 700;
        }

        .ua-controls {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          flex-shrink: 0;
        }

        .ua-role-control {
          display: grid;
          gap: 5px;
        }

        .ua-role-control label {
          color: var(--text-soft);
          font-size: 8px;
          font-weight: 700;
        }

        .ua-role-control select {
          min-width: 145px;
          padding: 7px 9px;
          font-size: 9px;
        }

        .ua-role-control select:disabled {
          cursor: not-allowed;
          opacity: .65;
        }

        .ua-toggle {
          min-height: 33px;
          padding: 7px 10px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: transparent;
          font-size: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        .ua-toggle-off {
          color: var(--danger);
        }

        .ua-toggle-on {
          color: #2f9e62;
        }

        .ua-loader {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: ua-spin .8s linear infinite;
        }

        @keyframes ua-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .ua-empty {
          display: flex;
          min-height: 220px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 25px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--surface);
          text-align: center;
        }

        .ua-empty > span {
          display: flex;
          width: 46px;
          height: 46px;
          align-items: center;
          justify-content: center;
          margin-bottom: 9px;
          border-radius: 13px;
          background: var(--surface-soft);
          font-size: 17px;
        }

        .ua-empty strong {
          color: var(--text);
          font-size: 11px;
        }

        .ua-empty p {
          margin: 4px 0 0;
          color: var(--text-soft);
          font-size: 9px;
        }

        @media (max-width: 850px) {
          .ua-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .ua-header-actions {
            width: 100%;
          }

          .ua-create-button {
            width: 100%;
          }

          .ua-header-badge {
            display: none;
          }

          .ua-create-form {
            grid-template-columns: 1fr 1fr;
          }

          .ua-create-field:last-of-type {
            grid-column: 1 / -1;
          }

          .ua-user {
            align-items: flex-start;
            flex-direction: column;
          }

          .ua-controls {
            width: 100%;
          }

          .ua-role-control {
            flex: 1;
          }

          .ua-role-control select {
            width: 100%;
          }
        }

        @media (max-width: 620px) {
          .ua-summary-grid {
            grid-template-columns: 1fr;
          }

          .ua-create-form {
            grid-template-columns: 1fr;
          }

          .ua-create-field:last-of-type {
            grid-column: auto;
          }

          .ua-create-actions {
            flex-direction: column-reverse;
          }

          .ua-cancel-button,
          .ua-send-button {
            width: 100%;
          }

          .ua-card {
            padding: 18px;
          }

          .ua-controls {
            align-items: stretch;
            flex-direction: column;
          }

          .ua-toggle {
            width: 100%;
          }
        }

      `}</style>

    </div>
  )
}

export default UsuariosAdmin
