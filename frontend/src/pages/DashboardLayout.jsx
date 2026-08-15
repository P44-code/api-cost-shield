import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar"; // ⚠️ path apne Sidebar file location ke hisaab se check kar lo

function DashboardLayout() {
    return (
        <>
            {/* Sidebar khud fixed/overlay hai — yeh sirf menu button ki jagah
                decide karta hai. Chaho toh isse ek proper Navbar mein daal sakte ho. */}
            <div className="fixed top-0 left-0 z-30 p-3">
                <Sidebar />
            </div>

            {/* Yahan har dashboard sub-page render hoga */}
            <Outlet />
        </>
    );
}

export default DashboardLayout;
