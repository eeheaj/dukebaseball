"""Apply supabase/migrations/*.sql (in order) and supabase/seed.sql to the hosted database.

Needs SUPABASE_DB_URL in the root .env: Supabase dashboard -> Connect -> "Session pooler"
connection string, e.g. postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres

    uv run python scripts/apply_sql.py              # migrations + seed
    uv run python scripts/apply_sql.py --dev-anon   # also apply supabase/dev/dev_anon_policies.sql
    uv run python scripts/apply_sql.py --status     # show what's applied

Each file is recorded in public._applied_sql, so re-running only applies new files.
"""

import argparse
import os
import sys
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parents[2]
SUPABASE = ROOT / "supabase"


def load_db_url() -> str:
    if url := os.environ.get("SUPABASE_DB_URL"):
        return url
    for env_file in (ROOT / ".env", ROOT / "backend" / ".env"):
        if not env_file.is_file():
            continue
        for line in env_file.read_text(encoding="utf-8").splitlines():
            key, sep, value = line.partition("=")
            if sep and key.strip() == "SUPABASE_DB_URL" and value.strip():
                return value.strip().strip('"').strip("'")
    sys.exit(
        "SUPABASE_DB_URL is not set.\n"
        "Add it to the root .env: Supabase dashboard -> Connect -> Session pooler connection string\n"
        "(replace [YOUR-PASSWORD] with your database password)."
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dev-anon", action="store_true", help="also apply dev-only anon policies")
    parser.add_argument("--status", action="store_true", help="list applied files and exit")
    args = parser.parse_args()

    files = sorted((SUPABASE / "migrations").glob("*.sql")) + [SUPABASE / "seed.sql"]
    if args.dev_anon:
        files.append(SUPABASE / "dev" / "dev_anon_policies.sql")

    with psycopg.connect(load_db_url(), autocommit=False) as conn:
        conn.execute(
            "create table if not exists public._applied_sql ("
            " name text primary key, applied_at timestamptz not null default now())"
        )
        # RLS on with no policies: hidden from the public API, still visible to this script.
        conn.execute("alter table public._applied_sql enable row level security")
        conn.commit()
        applied = {r[0] for r in conn.execute("select name from public._applied_sql")}

        if args.status:
            for f in files:
                name = f.relative_to(SUPABASE).as_posix()
                print(("applied  " if name in applied else "pending  ") + name)
            return

        for f in files:
            name = f.relative_to(SUPABASE).as_posix()
            if name in applied:
                print(f"skip     {name} (already applied)")
                continue
            try:
                conn.execute(f.read_text(encoding="utf-8"))
                conn.execute("insert into public._applied_sql (name) values (%s)", (name,))
                conn.commit()
                print(f"applied  {name}")
            except psycopg.Error as exc:
                conn.rollback()
                sys.exit(f"FAILED   {name}: {exc}\nNothing from this file was applied.")


if __name__ == "__main__":
    main()
