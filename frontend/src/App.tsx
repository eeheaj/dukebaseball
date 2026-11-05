import CaptureReceipt from "./pages/CaptureReceipt";

export default function App() {
  return (
    <main className="container">
      <header>
        <h1>Duke Baseball Hub</h1>
        <p className="muted">Add a receipt</p>
      </header>
      <CaptureReceipt />
    </main>
  );
}
