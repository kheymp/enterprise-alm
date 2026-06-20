# Enterprise Asset & License Manager (ALM) 🚧

> **Note:** This project is currently under active development.

An enterprise-grade, full-stack application designed to streamline the management of company assets and software licenses. This system features hardware tracking, role-based access control (RBAC), and comprehensive audit trails.

## 🚀 Tech Stack

### Frontend
- **Framework:** React
- **Language:** TypeScript
- **Styling:** Material-UI (MUI)
- **Tooling:** Vite, pnpm

### Backend
- **Framework:** .NET (ASP.NET Core Web API)
- **Language:** C#
- **Architecture:** (e.g., Clean Architecture / N-Tier)

## ✨ Features (Current & Planned)
- 💻 **Hardware Tracking:** Manage the lifecycle of physical assets from procurement to retirement.
- 🔑 **License Management:** Track software licenses, allocations, and expiration dates.
- 🛡️ **Role-Based Access Control:** Secure user permissions and access levels.
- 📜 **Audit Trails:** Comprehensive logging of all asset transfers and modifications.

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) & [pnpm](https://pnpm.io/)
- [.NET SDK](https://dotnet.microsoft.com/download)
- (Add your database here, e.g., PostgreSQL, SQL Server, Docker)

### Running Locally

**1. Start the Backend API**
```bash
cd apps/backend
dotnet run --project Enterprise.ALM.Api
```

**2. Start the Frontend Application**
```bash
cd apps/frontend
pnpm install
pnpm dev
```

## 👨‍💻 About The Author
Created by Kheymp. This project was built to demonstrate full-stack engineering capabilities, emphasizing robust backend design and modern frontend development.
