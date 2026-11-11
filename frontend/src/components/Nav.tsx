import { NavLink } from "react-router";

const LINKS = [
  { to: "/", label: "Overview", end: true },
  { to: "/partnerships", label: "Partnerships", end: false },
  { to: "/receipts", label: "Receipts", end: false },
];

// Top bar on every screen size. Only three links, so they stay visible on phones too
// instead of hiding behind a menu button.
export default function Nav() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="brand" aria-label="Duke Baseball Hub home">
          <img className="logo" src="/duke-logo.png" alt="" />
          <span className="wordmark">Baseball <span>Hub</span></span>
        </NavLink>
        <nav>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "active" : "")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
