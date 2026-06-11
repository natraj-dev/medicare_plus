import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, FileText, Pill, TestTube,
  CreditCard, Shield, Bell, Bot, AlertCircle, Clock,
  LogOut, Menu, Heart, Building2, ClipboardList, Activity,
  Stethoscope, BarChart2, UserCheck, Download, Video,
  BedDouble, ClipboardCheck, Siren, MessageSquare, TrendingUp,
  CalendarClock,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import api from '../../utils/api'

// ── Nav definitions ────────────────────────────────────────────────────────────
const patientNav = [
  { path: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard'       },
  { path: '/appointments',       icon: Calendar,        label: 'Appointments'    },
  { path: '/doctors',            icon: Users,           label: 'Find Doctors'    },
  { path: '/telemedicine',       icon: Video,           label: 'Video Consult'   },
  { path: '/medical-records',    icon: FileText,        label: 'Records'         },
  { path: '/prescriptions',      icon: Pill,            label: 'Prescriptions'   },
  { path: '/lab-tests',          icon: TestTube,        label: 'Lab Tests'       },
  { path: '/health-tracker',     icon: Activity,        label: 'Health Tracker'  },
  { path: '/reminders',          icon: Bell,            label: 'Med Reminders'   },
  { path: '/billing',            icon: CreditCard,      label: 'Billing'         },
  { path: '/insurance',          icon: Shield,          label: 'Insurance'       },
  { path: '/admissions',         icon: BedDouble,       label: 'Admissions'      },
  { path: '/emergency-requests', icon: Siren,           label: 'Emergency'       },
  { path: '/emergency-contacts', icon: AlertCircle,     label: 'SOS Contacts'    },
  { path: '/feedback',           icon: MessageSquare,   label: 'Feedback'        },
  { path: '/reports',            icon: Download,        label: 'Reports'         },
  { path: '/notifications',      icon: Bell,            label: 'Notifications'   },
  { path: '/ai-assistant',       icon: Bot,             label: 'AI Assistant'    },
]

const doctorNav = [
  { path: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard'       },
  { path: '/appointments',       icon: Calendar,        label: 'Appointments'    },
  { path: '/consultations',      icon: Stethoscope,     label: 'Consultations'   },
  { path: '/telemedicine',       icon: Video,           label: 'Video Consult'   },
  { path: '/my-patients',        icon: UserCheck,       label: 'My Patients'     },
  { path: '/prescriptions',      icon: Pill,            label: 'Prescriptions'   },
  { path: '/lab-tests',          icon: TestTube,        label: 'Lab Tests'       },
  { path: '/slots',              icon: CalendarClock,   label: 'Slot Manager'    },
  { path: '/schedule',           icon: Clock,           label: 'Weekly Schedule' },
  { path: '/admissions',         icon: BedDouble,       label: 'Admissions'      },
  { path: '/reports',            icon: Download,        label: 'Reports'         },
  { path: '/notifications',      icon: Bell,            label: 'Notifications'   },
  { path: '/ai-assistant',       icon: Bot,             label: 'AI Assistant'    },
]

const adminNav = [
  { path: '/admin',              icon: LayoutDashboard, label: 'Dashboard'       },
  { path: '/admin/analytics',    icon: BarChart2,       label: 'Analytics'       },
  { path: '/admin/patients',     icon: Users,           label: 'Patients'        },
  { path: '/admin/doctors',      icon: UserCheck,       label: 'Doctors'         },
  { path: '/departments',        icon: Building2,       label: 'Departments'     },
  { path: '/appointments',       icon: Calendar,        label: 'Appointments'    },
  { path: '/telemedicine',       icon: Video,           label: 'Telemedicine'    },
  { path: '/admin/beds',         icon: BedDouble,       label: 'Bed Management'  },
  { path: '/admissions',         icon: ClipboardCheck,  label: 'Admissions'      },
  { path: '/emergency-requests', icon: Siren,           label: 'Emergencies'     },
  { path: '/billing',            icon: CreditCard,      label: 'Billing'         },
  { path: '/feedback',           icon: MessageSquare,   label: 'Feedback'        },
  { path: '/reports',            icon: TrendingUp,      label: 'Reports'         },
  { path: '/notifications',      icon: Bell,            label: 'Notifications'   },
  { path: '/audit-logs',         icon: ClipboardList,   label: 'Audit Logs'      },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate  = useNavigate()

  const navItems =
    user?.role === 'ADMIN'  ? adminNav  :
    user?.role === 'DOCTOR' ? doctorNav :
    patientNav

  useEffect(() => {
    api.get('/notifications/unread-count')
      .then(r => setUnreadCount(r.data.unread_count))
      .catch(() => {})
  }, [location.pathname])

  const handleLogout = () => { logout(); navigate('/login') }

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    if (path === '/admin')     return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  function NavLink({ item }: { item: (typeof patientNav)[0] }) {
    const active = isActive(item.path)
    return (
      <Link to={item.path} onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
          active
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}>
        <item.icon size={16} className="shrink-0" />
        <span className="truncate">{item.label}</span>
        {item.path === '/notifications' && unreadCount > 0 && (
          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    )
  }

  function SidebarContent() {
    return (
      <div className="flex flex-col h-full bg-white border-r border-gray-100">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100 shrink-0">
          <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <Heart size={16} className="text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-gray-900 text-sm leading-tight">MediCare Plus</div>
            <div className="text-[10px] text-gray-400">Hospital Platform</div>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-4 py-2 shrink-0">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            user?.role === 'ADMIN'  ? 'bg-red-100 text-red-700'   :
            user?.role === 'DOCTOR' ? 'bg-blue-100 text-blue-700' :
                                      'bg-green-100 text-green-700'
          }`}>
            {user?.role}
          </span>
        </div>

        {/* Nav — scrollable */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {navItems.map(item => <NavLink key={item.path} item={item} />)}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-gray-100 shrink-0 space-y-1">
          <Link to="/profile" onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
              {user?.profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.profile?.full_name || 'Profile'}
              </div>
              <div className="text-[11px] text-gray-400 truncate">{user?.email}</div>
            </div>
          </Link>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors w-full text-sm">
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-56 lg:shrink-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <Menu size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <Heart size={14} className="text-white" />
            </div>
            <span className="font-display font-bold text-gray-900 text-sm">MediCare Plus</span>
          </div>
          <Link to="/notifications" className="relative p-2">
            <Bell size={20} className="text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
