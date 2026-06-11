import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'

// ── Phase 1 Pages ──────────────────────────────────────────────────────────────
import LoginPage               from './pages/LoginPage'
import RegisterPage            from './pages/RegisterPage'
import DashboardPage           from './pages/DashboardPage'
import DoctorsPage             from './pages/DoctorsPage'
import DoctorDetailPage        from './pages/DoctorDetailPage'
import AppointmentsPage        from './pages/AppointmentsPage'
import AppointmentDetailPage   from './pages/AppointmentDetailPage'
import BookAppointmentPage     from './pages/BookAppointmentPage'
import MedicalRecordsPage      from './pages/MedicalRecordsPage'
import PrescriptionsPage       from './pages/PrescriptionsPage'
import WritePrescriptionPage   from './pages/WritePrescriptionPage'
import LabTestsPage            from './pages/LabTestsPage'
import BillingPage             from './pages/BillingPage'
import InsurancePage           from './pages/InsurancePage'
import NotificationsPage       from './pages/NotificationsPage'
import ProfilePage             from './pages/ProfilePage'
import AIChatPage              from './pages/AIChatPage'
import AdminDashboardPage      from './pages/AdminDashboardPage'
import DepartmentsPage         from './pages/DepartmentsPage'
import EmergencyContactsPage   from './pages/EmergencyContactsPage'
import SchedulePage            from './pages/SchedulePage'
import AuditLogsPage           from './pages/AuditLogsPage'
import ReportsPage             from './pages/ReportsPage'
import ConsultationPage        from './pages/ConsultationPage'
import ConsultationsListPage   from './pages/ConsultationsListPage'
import MyPatientsPage          from './pages/MyPatientsPage'
import PatientManagementPage   from './pages/PatientManagementPage'
import DoctorManagementPage    from './pages/DoctorManagementPage'
import NotFoundPage            from './pages/NotFoundPage'

// ── Phase 2 Pages ──────────────────────────────────────────────────────────────
import TelemedicinePage        from './pages/TelemedicinePage'
import HealthTrackerPage       from './pages/HealthTrackerPage'
import MedicineReminderPage    from './pages/MedicineReminderPage'
import BedManagementPage       from './pages/BedManagementPage'
import AdmissionsPage          from './pages/AdmissionsPage'
import EmergencyRequestsPage   from './pages/EmergencyRequestsPage'
import FeedbackPage            from './pages/FeedbackPage'
import AdvancedAnalyticsPage   from './pages/AdvancedAnalyticsPage'
import DoctorSlotsPage         from './pages/DoctorSlotsPage'

import Layout from './components/layout/Layout'

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles?: string[]
}) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && user && !allowedRoles.includes(user.role))
    return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) fetchMe()
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{ duration: 3500, style: { fontSize: '14px' } }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login"    element={!isAuthenticated ? <LoginPage />    : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} />
        <Route path="/"         element={<Navigate to="/dashboard" />} />

        {/* Protected — all roles */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>

          {/* Common */}
          <Route path="/dashboard"          element={<DashboardPage />} />
          <Route path="/profile"            element={<ProfilePage />} />
          <Route path="/notifications"      element={<NotificationsPage />} />
          <Route path="/reports"            element={<ReportsPage />} />
          <Route path="/departments"        element={<DepartmentsPage />} />

          {/* Doctors listing (all roles) */}
          <Route path="/doctors"            element={<DoctorsPage />} />
          <Route path="/doctors/:id"        element={<DoctorDetailPage />} />

          {/* Appointments */}
          <Route path="/appointments"       element={<AppointmentsPage />} />
          <Route path="/appointments/book"  element={<BookAppointmentPage />} />
          <Route path="/appointments/:id"   element={<AppointmentDetailPage />} />

          {/* Consultations */}
          <Route path="/consultations"      element={<ConsultationsListPage />} />
          <Route path="/consultation/new"   element={
            <ProtectedRoute allowedRoles={['DOCTOR']}>
              <ConsultationPage />
            </ProtectedRoute>
          } />

          {/* Shared patient + doctor */}
          <Route path="/prescriptions"      element={<PrescriptionsPage />} />
          <Route path="/lab-tests"          element={<LabTestsPage />} />
          <Route path="/billing"            element={<BillingPage />} />

          {/* Patient-specific */}
          <Route path="/medical-records"    element={<MedicalRecordsPage />} />
          <Route path="/insurance"          element={<InsurancePage />} />
          <Route path="/emergency-contacts" element={<EmergencyContactsPage />} />

          {/* Phase 2 — Patient */}
          <Route path="/health-tracker"     element={<HealthTrackerPage />} />
          <Route path="/reminders"          element={<MedicineReminderPage />} />
          <Route path="/telemedicine"       element={<TelemedicinePage />} />
          <Route path="/feedback"           element={<FeedbackPage />} />
          <Route path="/emergency-requests" element={<EmergencyRequestsPage />} />
          <Route path="/admissions"         element={<AdmissionsPage />} />

          {/* Doctor-specific */}
          <Route path="/prescriptions/write" element={
            <ProtectedRoute allowedRoles={['DOCTOR']}>
              <WritePrescriptionPage />
            </ProtectedRoute>
          } />
          <Route path="/schedule"            element={
            <ProtectedRoute allowedRoles={['DOCTOR']}>
              <SchedulePage />
            </ProtectedRoute>
          } />
          <Route path="/slots"               element={
            <ProtectedRoute allowedRoles={['DOCTOR']}>
              <DoctorSlotsPage />
            </ProtectedRoute>
          } />
          <Route path="/my-patients"         element={
            <ProtectedRoute allowedRoles={['DOCTOR']}>
              <MyPatientsPage />
            </ProtectedRoute>
          } />
          <Route path="/ai-assistant"        element={<AIChatPage />} />

          {/* Admin-specific */}
          <Route path="/admin"               element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/analytics"     element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdvancedAnalyticsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/patients"      element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <PatientManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/doctors"       element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DoctorManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/beds"          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <BedManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/audit-logs"          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AuditLogsPage />
            </ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
