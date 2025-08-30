const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'AI Email Automation',
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
}

export default ENV
