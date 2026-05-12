import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import LandingPage from "@/routes/Landing";
import LoginPage from "@/routes/Login";
import PublicBookingPage from "@/routes/booking/PublicBooking";
import BookingConfirmation from "@/routes/booking/Confirmation";
import ManageBookingPage from "@/routes/booking/ManageBooking";
import CustomerLayout from "@/routes/customer/Layout";
import CustomerBookings from "@/routes/customer/Bookings";
import CustomerDiscover from "@/routes/customer/Discover";
import CustomerMessages from "@/routes/customer/Messages";
import CustomerSaved from "@/routes/customer/Saved";
import CustomerProfile from "@/routes/customer/Profile";
import StaffLayout from "@/routes/staff/Layout";
import StaffCalendar from "@/routes/staff/Calendar";
import StaffHours from "@/routes/staff/Hours";
import StaffServices from "@/routes/staff/Services";
import AdminLayout from "@/routes/admin/Layout";
import AdminDashboard from "@/routes/admin/Dashboard";
import AdminCalendar from "@/routes/admin/Calendar";
import AdminServices from "@/routes/admin/Services";
import AdminStaff from "@/routes/admin/Staff";
import AdminLocations from "@/routes/admin/Locations";
import AdminBranding from "@/routes/admin/Branding";
import AdminReports from "@/routes/admin/Reports";
import AdminPolicy from "@/routes/admin/Policy";
import AdminAi from "@/routes/admin/AiAssistant";
import AdminBilling from "@/routes/admin/Billing";
import AdminMessages from "@/routes/admin/Messages";
import AdminSmsLog from "@/routes/admin/SmsLog";
import PlatformPage from "@/routes/platform/Platform";
import OnboardBusinessPage from "@/routes/onboarding/Onboarding";
import NotFoundPage from "@/routes/NotFound";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Tutorial } from "@/components/tutorial/Tutorial";
import { useAuth } from "@/lib/auth";

function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  const { user } = useAuth();
  return (
    <>
      <ScrollToTopOnRouteChange />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />

        <Route path="/b/:slug" element={<PublicBookingPage />} />
        <Route path="/b/:slug/confirmed/:bookingId" element={<BookingConfirmation />} />
        <Route path="/b/:slug/manage/:bookingId" element={<ManageBookingPage />} />

        <Route element={<ProtectedRoute roles={["customer", "staff", "admin", "superadmin"]} />}>
          <Route path="/me" element={<CustomerLayout />}>
            <Route index element={<Navigate to="bookings" replace />} />
            <Route path="bookings" element={<CustomerBookings />} />
            <Route path="discover" element={<CustomerDiscover />} />
            <Route path="messages" element={<CustomerMessages />} />
            <Route path="saved" element={<CustomerSaved />} />
            <Route path="profile" element={<CustomerProfile />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={["staff", "admin"]} />}>
          <Route path="/staff/:bizSlug" element={<StaffLayout />}>
            <Route index element={<Navigate to="calendar" replace />} />
            <Route path="calendar" element={<StaffCalendar />} />
            <Route path="hours" element={<StaffHours />} />
            <Route path="services" element={<StaffServices />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={["admin", "superadmin"]} />}>
          <Route path="/admin/:bizSlug" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="locations" element={<AdminLocations />} />
            <Route path="branding" element={<AdminBranding />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="policy" element={<AdminPolicy />} />
            <Route path="ai" element={<AdminAi />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="sms-log" element={<AdminSmsLog />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={["superadmin"]} />}>
          <Route path="/platform" element={<PlatformPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={["customer", "staff", "admin", "superadmin"]} />}>
          <Route path="/onboarding/business" element={<OnboardBusinessPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {user && <Tutorial />}
    </>
  );
}
