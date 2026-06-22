import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const navLinkBase =
  'relative font-medium transition-colors py-1 ' +
  "after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:rounded-full " +
  'after:bg-gradient-to-r after:from-brand-500 after:to-brand-600 after:transition-all after:duration-300 ' +
  'after:w-0 hover:after:w-full';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${navLinkBase} ${isActive ? 'text-brand-600 after:w-full' : 'text-slate-600 hover:text-brand-600'}`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2.5 rounded-lg font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-600'
  }`;

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" aria-label="Online Quran Academy Home">
              <img src="/logo.jpg" alt="Online Quran Academy" className="h-10" />
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-7">
            <NavLink to="/" end className={navLinkClass}>Home</NavLink>
            <NavLink to="/about" className={navLinkClass}>About</NavLink>
            <NavLink to="/faq" className={navLinkClass}>FAQ</NavLink>
            <Link
              to="/lms"
              className="flex items-center gap-1.5 text-white bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 rounded-full font-semibold shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Login
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-600">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-100 animate-in slide-in-from-top duration-200">
          <div className="px-4 pt-2 pb-6 space-y-1">
            <NavLink to="/" end onClick={() => setIsOpen(false)} className={mobileLinkClass}>Home</NavLink>
            <NavLink to="/about" onClick={() => setIsOpen(false)} className={mobileLinkClass}>About</NavLink>
            <NavLink to="/faq" onClick={() => setIsOpen(false)} className={mobileLinkClass}>FAQ</NavLink>
            <Link to="/lms" onClick={() => setIsOpen(false)} className="block px-3 py-3 text-white bg-gradient-to-r from-brand-500 to-brand-600 rounded-full font-semibold text-center shadow-md shadow-brand-500/25">
              Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
