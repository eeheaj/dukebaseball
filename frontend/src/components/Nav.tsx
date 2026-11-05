import { NavLink } from "react-router";

const LINKS = [
  { to: "/", label: "Overview", end: true },
  { to: "/partnerships", label: "Partnerships", end: false },
  { to: "/receipts", label: "Receipts", end: false },
];

export default function Nav() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="logo" aria-label="Duke Baseball Hub home"><img src="/duke-logo.png" alt="" /></NavLink>
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
