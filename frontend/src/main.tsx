import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './theme/ThemeProvider.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'

// Links and images are natively draggable, so a click that drifts while the
// mouse is held down (e.g. on the header's Profile link) starts a browser
// drag instead of a click - and Chrome can leave that drag stuck, with the
// cursor frozen and every later click ignored. Nothing on this site uses
// drag-and-drop, so cancel those drags site-wide. Dragging selected text
// (e.g. inside an input) is untouched - its dragstart target isn't one of these.
document.addEventListener('dragstart', (e) => {
  if (e.target instanceof Element && e.target.closest('a, img, button')) {
    e.preventDefault()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
            <App />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
