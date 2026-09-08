import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (pin.length === 4 && !loading) {
      intentarLogin(pin)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  async function intentarLogin(valor: string) {
    setLoading(true)
    setError(null)
    const res = await login(valor)
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'PIN incorrecto')
      setPin('')
    }
  }

  function presionar(digito: string) {
    if (loading) return
    setError(null)
    setPin((prev) => (prev.length < 4 ? prev + digito : prev))
  }

  function borrar() {
    if (loading) return
    setPin((prev) => prev.slice(0, -1))
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/logo.jpeg" alt="LaJuvePOS" className="login-logo" />
        <h1>LaJuvePOS</h1>
        <p className="subtitle">Ingresá tu PIN de 4 dígitos</p>

        <div className="pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="pin-pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} type="button" onClick={() => presionar(d)}>
              {d}
            </button>
          ))}
          <button type="button" className="pin-borrar" onClick={borrar}>
            ⌫
          </button>
          <button type="button" onClick={() => presionar('0')}>
            0
          </button>
          <span />
        </div>
      </div>
    </div>
  )
}
