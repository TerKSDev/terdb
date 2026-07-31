<h1 align="center">TerDB</h1>

<p align="center">
  <strong>A lightweight, interactive TUI database client for the modern terminal.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/@terks.dev/terdb" alt="NPM Version" />
  <img src="https://img.shields.io/badge/Node-%3E%3D22.0.0-blue" alt="Node Version" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

**TerDB** is a fully interactive, beautifully designed Terminal User Interface (TUI) for managing your databases. Forget about remembering complex SQL commands or downloading heavy GUI applications. TerDB brings the power of an intuitive database editor right into your terminal.

## ✨ Features

- 🚀 **Zero Install Needed**: Run it instantly with `npx @terks.dev/terdb`.
- 🔌 **Universal Database Support**: Natively supports **PostgreSQL**, **MySQL**, and **SQLite**.
- 🛠 **Table Builder Wizard**: A step-by-step visual ERD-like builder to create tables effortlessly (Supports `AutoInc`, `Nullable`, `Timestamps`, and more).
- 📝 **Interactive CRUD Editor**: Add, edit, and delete data with a smart step-by-step interface. Auto-detects Primary Keys and types!
- ⚡ **Expert Mode**: Load and execute `.sql` or `.md` files directly.
- 📦 **Smart Pagination**: View thousands of rows safely without lagging your terminal.

## 🚀 Quick Start

You don't even need to install it. Just run:

```bash
npx @terks.dev/terdb
```

TerDB will automatically scan your directory for a `.env` file containing database credentials (`DATABASE_URL`, `DB_URL`, etc.) or `.sqlite`/`.db` files, and connect instantly!

## ⚙️ Manual Setup

If you prefer to set up the connection manually:

1. Run `npx @terks.dev/terdb`
2. Select **"Setup Database Connection"**
3. Choose your database type (SQLite, Postgres, or MySQL)
4. Enter your connection string (e.g., `postgresql://user:password@localhost:5432/mydb`)
5. TerDB will save it securely to your local `.env` file for future use.

## 🕹️ Usage

Once connected, use your **Arrow Keys** and **Enter** to navigate the stunning UI.

### Database Editor
Select any table to view its contents in a perfectly aligned, beautifully bordered ASCII table. Press `Enter` to access the Data Operations menu:
- **Add Data**: Interactive prompts for every column (auto-skips Auto-Increment Primary Keys!).
- **Edit Data**: Select the record and column to surgically update values.
- **Delete Data**: Safely delete records by providing their ID.

### Table Builder
Need a new table? Use the **Wizard (Beginner)** mode.
It will ask you for column names, types (Integer, Text, Boolean, Decimal, DateTime), and constraints. It even generates the exact `CREATE TABLE` syntax tailored to your specific database dialect!

## 📜 License

MIT License. Crafted with ❤️ by TerKSDev.
