import { useState } from "react";
import { Route, Routes, useLocation } from "react-router";
import Nav from "./components/Nav";
import SetupBanner from "./components/SetupBanner";
import CaptureReceipt from "./pages/CaptureReceipt";
import NewPartnership from "./pages/NewPartnership";
import Overview from "./pages/Overview";
import PartnershipDetail from "./pages/PartnershipDetail";
import Partnerships from "./pages/Partnerships";
import Receipts from "./pages/Receipts";
import "./dashboard.css";

export default function App() {
  // The capture page shows its own setup banner (it reloads its data when setup is fixed).
  const onCapture = useLocation().pathname === "/receipts/new";
  // Bumped when the backend comes back, which remounts the page so it loads its data again.
  const [reloads, setReloads] = useState(0);
  return (
    <>
      <Nav />
      <main className={onCapture ? "container" : "page"}>
        {onCapture ? <h1 className="capture-title">Add a receipt</h1> : <SetupBanner onRecover={() => setReloads((n) => n + 1)} />}
        <Routes key={reloads}>
          <Route path="/" element={<Overview />} />
          <Route path="/partnerships" element={<Partnerships />} />
          <Route path="/partnerships/new" element={<NewPartnership />} />
          <Route path="/partnerships/:id" element={<PartnershipDetail />} />
          <Route path="/receipts" element={<Receipts />} />
          <Route path="/receipts/new" element={<CaptureReceipt />} />
          <Route path="*" element={<p className="empty">Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
