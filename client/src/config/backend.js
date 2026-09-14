const configuredBackendBaseUrl = import.meta.env.VITE_BACKEND_BASE_URL || '/backend'

export const BACKEND_BASE_URL = configuredBackendBaseUrl.replace(/\/+$/, '') || '/backend'
