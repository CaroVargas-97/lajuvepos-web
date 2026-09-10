export function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
}

export function formatDateTime(value: string): string {
  const normalizado = value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
  return new Date(normalizado).toLocaleString('es-AR')
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
