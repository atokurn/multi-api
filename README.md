# 🎬 All-In-One Drama APIs Monorepo

Welcome to the central repository for various short drama streaming API providers. This project is structured as an **NPM Monorepo (Workspaces)**, allowing you to manage multiple isolated API services from a single root directory during local development, while maintaining their independence for separate deployments (e.g., to Vercel, Heroku, or a VPS).

## 🚀 Features & Architecture

*   **Single `node_modules`:** Run `npm install` once in the root folder to install dependencies for **all** API providers simultaneously. No need to duplicate `axios` or `express` across multiple folders.
*   **Independent Deployment:** Each API directory (e.g., `dramanova/dramanova-api`, `netshort/netshort-api`) maintains its own `package.json`. When deployed to platforms like Vercel, they are treated as completely standalone projects.
*   **Concurrent Execution:** Run one, several, or all API providers simultaneously with color-coded console outputs.
*   **Structured Modularity:** Each provider has its own root folder containing the API service and a local `temp` folder for testing and research scripts.

## 📂 Project Structure

```text
/ (Root)
├── package.json         <-- Defines workspaces and root run scripts
├── README.md
├── temp/                <-- Global Temp Folder (for shared research/tools)
│
├── dramabox/
│   ├── dramabox-api/    <-- API Server
│   └── temp/            <-- Local tests & scripts for DramaBox
│
├── dramanova/
│   ├── dramanova-api/   <-- API Server
│   └── temp/            <-- Local tests & scripts for DramaNova
│
├── netshort/
│   ├── netshort-api/    <-- API Server
│   └── temp/            <-- Local tests & scripts for NetShort
│
└── dramawave/, flickreels/, freereels/, shortmax/, melolo/ ...
```

---

## 🛠 Setup Instructions

1.  **Clone the repository.**
2.  **Navigate to the root directory.**
3.  **Install all dependencies:**
    ```bash
    npm install
    ```
    *(This will read all `package.json` files in the workspaces and link them to the root `node_modules`.)*

---

## 💻 How to Run the APIs

You can run individual APIs or start them all together using the predefined npm scripts. We provide both `start` (standard execution) and `dev` (watch mode for development) scripts.

### 🏃‍♂️ Running All Providers at Once
To start the top active providers (DramaBox, DramaNova, and NetShort) simultaneously using `concurrently`:

```bash
# Standard mode
npm run start:all

# Development mode (auto-restarts on file changes)
npm run dev:all
```

### 🏃‍♂️ Running a Single Provider
If you only want to work on or test a specific API, use the individual run scripts:

**DramaBox API:**
```bash
npm run start:dramabox
npm run dev:dramabox
```

**DramaNova API:**
```bash
npm run start:dramanova
npm run dev:dramanova
```

**NetShort API:**
```bash
npm run start:netshort
npm run dev:netshort
```

*(Note: Ensure that each provider uses a different local port (e.g., 3000, 3001, 3002) in their respective `server.js` or `index.js` files if you plan to run them simultaneously with `start:all`)*

---

## ☁️ Deployment Guide

Because this project uses NPM Workspaces, each API folder remains an independent Node.js project.

**Deploying to Vercel/VPS:**
1.  Point your deployment platform to the specific API subdirectory (e.g., `Root Directory: dramanova/dramanova-api`).
2.  The platform will detect the `package.json` inside that specific folder.
3.  The platform will automatically run `npm install` just for that specific provider and deploy it cleanly.

---

## 🔧 Adding a New Provider
If you want to add a new API provider to this monorepo:
1.  Create a new folder structure for the provider (e.g., `new-drama/new-drama-api` and `new-drama/temp`).
2.  Run `npm init -y` inside the `new-drama-api` folder to generate a `package.json`.
3.  Add the folder path (`"new-drama/new-drama-api"`) to the `"workspaces"` array in the **root** `package.json`.
4.  Run `npm install` in the root folder.
