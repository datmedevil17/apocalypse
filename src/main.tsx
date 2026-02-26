import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { WalletContextProvider } from './components/WalletContextProvider'
import { SocketProvider } from './hooks/useSocket'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WalletContextProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </WalletContextProvider>
    </BrowserRouter>
  </StrictMode>,
)
