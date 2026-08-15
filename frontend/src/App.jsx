import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import TeamSetup from "./pages/TeamSetup";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import DashboardLayout from "./pages/DashboardLayout";
import MemberUsage from "./pages/MemberUsage";
import ActivityLog from "./pages/ActivityLog";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<TeamSetup />} />
        <Route path="/home" element={<Home />} />

        {/* ✅ Nested dashboard routes — Sidebar (via DashboardLayout) wraps all of these */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="usage" element={<MemberUsage />} />
          <Route path="history" element={<ActivityLog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;