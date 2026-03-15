/**
 * Detects if the user agent belongs to a mobile device
 * (phones, tablets — iPad, Samsung, Android, etc.)
 */
export function isMobileDevice(userAgent: string): boolean {
  return /iPad|iPhone|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Samsung|SM-T|SM-P|Kindle|Silk/i.test(userAgent)
}

/**
 * @deprecated Use isMobileDevice instead — kept for backward compatibility
 */
export function isIpadDevice(userAgent: string): boolean {
  return isMobileDevice(userAgent)
}

export type DeviceType = 'mobile' | 'desktop'

export function getDeviceType(userAgent: string): DeviceType {
  return isMobileDevice(userAgent) ? 'mobile' : 'desktop'
}
