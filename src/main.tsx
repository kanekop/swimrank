import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { migrate } from './storage/storage'
import './styles/global.css'

// 旧スキーマからの移行（v1 では no-op）。App マウント前に1度だけ実行
migrate()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
