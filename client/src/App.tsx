import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Home from './pages/Home'
import Submit from './pages/Submit'

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a1520] text-white">
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/submit" element={<Submit />} />
      </Routes>
    </div>
  )
}
