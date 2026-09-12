import type { Router } from 'express'

const METODOS = ['get', 'post', 'put', 'delete', 'patch'] as const

// Express 4 no atrapa automáticamente los rechazos de promesas dentro de handlers
// async: si un controller tira una excepción sin su propio try/catch, la petición
// queda colgada y, peor, puede terminar matando el proceso Node entero (afectando
// a todas las cajas conectadas a la vez). Esto envuelve cada ruta para que cualquier
// error caiga siempre en el middleware de error global de index.ts, nunca al aire.
export function wrapRouter(router: Router): Router {
  for (const metodo of METODOS) {
    const original = (router as any)[metodo].bind(router)
    ;(router as any)[metodo] = (path: string, ...handlers: any[]) => {
      const envueltos = handlers.map((h) =>
        typeof h === 'function'
          ? (req: any, res: any, next: any) => Promise.resolve(h(req, res, next)).catch(next)
          : h
      )
      return original(path, ...envueltos)
    }
  }
  return router
}
