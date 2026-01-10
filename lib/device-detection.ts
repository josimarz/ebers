export function isIpadDevice(userAgent: string): boolean {
  return /iPad/.test(userAgent)
}

export function getDeviceType(userAgent: string): 'ipad' | 'desktop' {
  return isIpadDevice(userAgent) ? 'ipad' : 'desktop'
}