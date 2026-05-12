import { Link } from 'react-router-dom'

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0f1e]/80 backdrop-blur-md border-b border-white/10">
      <Link
        to="/"
        className="text-lg font-bold tracking-tight text-white hover:text-[#4361ee] transition-colors"
      >
        AI Resources
      </Link>
      <Link
        to="/submit"
        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-[#4361ee] to-[#7b2ff7] hover:opacity-90 transition-opacity"
      >
        Submit a Resource
      </Link>
    </nav>
  )
}
