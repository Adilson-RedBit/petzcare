import { BrowserRouter as Router, Routes, Route } from "react-router";
import LandingPage from "@/react-app/pages/Landing";
import HomePage from "@/react-app/pages/Home";
import ProfessionalPage from "@/react-app/pages/Professional";
import ResetPasswordPage from "@/react-app/pages/ResetPassword";
import SignupPage from "@/react-app/pages/Signup";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/agendar" element={<HomePage />} />
        <Route path="/professional" element={<ProfessionalPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </Router>
  );
}
