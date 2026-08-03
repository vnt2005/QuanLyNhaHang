export const RESTAURANT_TIME_ZONE = 'Asia/Ho_Chi_Minh'
const VIETNAM_OFFSET = '+07:00'

export function parseApiDateTime(value: string | Date) {
  if (value instanceof Date) return value
  const normalized = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value.trim())
    ? value
    : `${value}Z`
  return new Date(normalized)
}

export function formatRestaurantDateTime(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'short',
    timeStyle: 'short',
  },
) {
  return new Intl.DateTimeFormat('vi-VN', {
    ...options,
    timeZone: RESTAURANT_TIME_ZONE,
  }).format(parseApiDateTime(value))
}

export function formatRestaurantTime(value: string | Date) {
  return formatRestaurantDateTime(value, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function toRestaurantDateInput(value: Date) {
  const parts = getRestaurantParts(value)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function toRestaurantDateTimeInput(value: string | Date) {
  const parts = getRestaurantParts(parseApiDateTime(value))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function restaurantDateTimeInputToIso(value: string) {
  if (!value) return ''
  return new Date(`${value}:00${VIETNAM_OFFSET}`).toISOString()
}

function getRestaurantParts(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: RESTAURANT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(item => item.type === type)?.value ?? ''

  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
  }
}
