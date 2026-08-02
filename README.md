# 🌟 Drix - The Ultimate Zero-Dependency Database CLI & TUI

**Drix** is a lightning-fast, zero-dependency Database Manager designed entirely for your terminal. It supports **SQLite**, **PostgreSQL**, and **MySQL**.

Say goodbye to heavy GUI tools like DBeaver or TablePlus. Drix allows you to instantly view, edit, query, backup, and visually diagram your databases right from your CLI!

## ✨ Features

- **📱 Interactive TUI**: A beautiful, mouse-free Terminal User Interface.
- **⚡ Zero Dependencies**: Blazing fast, runs instantly via `npx`.
- **🛠️ Multi-Database Support**: Connects seamlessly to SQLite, PostgreSQL, and MySQL.
- **📦 Smart Data Importer & Exporter**: Import CSV/JSON safely, or export your tables in seconds.
- **🌱 Intelligent Data Seeder**: Automatically generates realistic fake data (emails, phones, dates) to populate your tables for testing.
- **🗺️ ER Diagram Generator**: Scans your database and generates a Mermaid ER diagram that can be instantly imported into Draw.io or viewed on GitHub!
- **🧩 TypeScript Types Generator**: Instantly generate TypeScript interfaces (`.d.ts`) directly from your database schema!

## 🚀 Quick Start

You don't need to install anything. Just run:

```bash
npx @terks.dev/drix
```
Drix will automatically scan your project for a `.env` file containing a `DATABASE_URL` (e.g., `DATABASE_URL=postgres://user:pass@localhost:5432/mydb`). If it doesn't find one, it will launch a setup wizard to help you connect!

You can also pass a connection string directly:
```bash
npx @terks.dev/drix "mysql://user:pass@localhost:3306/mydb"
```

---

## 🛠️ Powerful Subcommands

Drix is not just a TUI; it comes with powerful quick-commands for your CI/CD pipelines or rapid local development.

### 🔌 1. Initialize a Local Database
Don't have a database yet? Drix can create one for you!
```bash
npx @terks.dev/drix init sqlite
npx @terks.dev/drix init postgres
npx @terks.dev/drix init mysql
```
*(For Postgres and MySQL, it connects to your local server and runs `CREATE DATABASE`, then automatically drops a configured `.env` file in your workspace!)*

### 🔍 2. Quick Query
Run SQL instantly and get a beautifully formatted ASCII table result.
```bash
npx @terks.dev/drix query "SELECT * FROM users WHERE age > 18"
```

### 📥 3. Import Data
Import massive CSV or JSON files safely. Drix uses smart chunking to prevent memory overload.
```bash
npx @terks.dev/drix import data.csv --table users
```

### 📤 4. Export Data
Export your tables to CSV or JSON.
```bash
npx @terks.dev/drix export users --format csv
npx @terks.dev/drix export * --format json --schema-only
```

### 🌱 5. Generate Fake Data (Seed)
Need 500 fake users for testing? Easy. Drix intelligently analyzes your column names and types to generate realistic data.
```bash
npx @terks.dev/drix seed users 500
```

### 🗺️ 6. Generate ER Diagram
Automatically generates a `drix_schema.md` containing a Mermaid.js diagram of your database.
```bash
npx @terks.dev/drix diagram
```
*Tip: Paste the output into Draw.io (Arrange > Insert > Advanced > Mermaid) for a stunning visual layout!*

### 🧩 7. Generate TypeScript Interfaces
Tired of manually writing types? Auto-generate them from your schema!
```bash
npx @terks.dev/drix generate-types
```
*(Outputs `drix-types.d.ts` with all your table interfaces)*

### 📜 8. Execute SQL Script
Run entire `.sql` files instantly. Perfect for database migrations.
```bash
npx @terks.dev/drix exec ./migrations/init.sql
```

### 📦 9. Database Backup
Backup your entire database. For SQLite, it performs a secure binary copy. For Postgres/MySQL, it dumps schema and data into JSON.
```bash
npx @terks.dev/drix backup
```

## ❓ Help
To view all commands and options:
```bash
npx @terks.dev/drix --help
```

---

**Built with ❤️ for Developers who love the Terminal.**
