import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './desktop'
import './styles.css'
import { applyUserConfigToStores } from './applyUserConfig'
import { loadUserConfig } from './data/userConfig'

const isMac = navigator.userAgent.includes('Mac')
document.documentElement.dataset.platform = isMac ? 'mac' : 'other'

async function bootstrap(): Promise<void> {
  const config = await loadUserConfig()
  try {
    applyUserConfigToStores(config)
  } catch (error) {
    // A malformed config must never prevent the app from starting.
    console.error('应用用户配置失败', error)
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

void bootstrap()
