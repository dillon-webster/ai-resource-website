import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Nav() {
  const [visible, setVisible] = useState(true)
  const [lastY, setLastY] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setVisible(y < lastY || y < 10)
      setLastY(y)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [lastY])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a1520]/80 backdrop-blur-md border-b border-white/10 transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
      <Link
        to="/"
        className="text-lg font-bold tracking-tight text-white hover:text-[#4F76F6] transition-colors"
      >
        AI Resources
      </Link>
      <Link
        to="/submit"
        className="px-4 py-2 rounded-lg text-sm font-medium text-[#1F2B37] bg-[#77F2A1] hover:opacity-90 transition-opacity"
      >
        Submit a Resource
      </Link>
    </nav>
  )
}
