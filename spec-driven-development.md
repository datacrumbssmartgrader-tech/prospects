# Prospects — Technical Specification

## Project Overview

Prospects is a lightweight internal web application built for managing and editing prospect data stored inside Google Sheets.

The application will:

- Authenticate users using fixed credentials stored in environment variables
- Fetch data from multiple sheets/tabs inside a single Google Sheets file
- Normalize data using column header names
- Display unified data inside a searchable and filterable table
- Allow inline editing of rows
- Sync edits back to Google Sheets in real-time

This application is intended for internal operational use only.

---

# Tech Stack

## Frontend
- Next.js 15
- TypeScript
- TailwindCSS
- shadcn/ui

## Table Management
- TanStack Table

## Backend
- Next.js Route Handlers

## Deployment
- Vercel

## Data Source
- Google Sheets API
- Google Service Account

---

# Core Functional Requirements

## Authentication

### Requirements

- Login page
- Username/password authentication
- Credentials stored in `.env`
- Protected routes via middleware
- Session cookie authentication
- Logout functionality

### Environment Variables

```env
APP_USERNAME=admin
APP_PASSWORD=supersecurepassword
SESSION_SECRET=your_secret
```

---

# Google Sheets Integration

## Requirements

The application must:

- Connect to a single Google Sheets document
- Read data from multiple sheets/tabs
- Fetch only required columns
- Normalize rows by column header names
- Support varying column order across sheets

---

# Required Columns

The following columns must exist in each sheet:

| Column Name |
|---|
| Prospect Name |
| Phone Number |
| Stage |

Column positions may vary between sheets.

The system must map values using header names rather than column indexes.

---

# Data Normalization Rules

The application must normalize all sheet rows into a unified structure:

```ts
type Prospect = {
  id: string
  prospectName: string
  phoneNumber: string
  stage: string

  sourceSheet: string
  rowIndex: number
}
```

---

# Important Requirements

Each row must preserve:

- source sheet name
- original row index

This is required so updates can be written back correctly to Google Sheets.

Example:

```ts
{
  id: "Leads-12",
  prospectName: "John Doe",
  phoneNumber: "+923001234567",
  stage: "Interested",

  sourceSheet: "Leads",
  rowIndex: 12
}
```

---

# Data Fetching Flow

On every page load:

1. Fetch all target sheets
2. Read headers
3. Identify required columns
4. Normalize rows
5. Merge rows into a single dataset
6. Return unified data to frontend

The app should always fetch fresh data from Google Sheets.

No local database is required.

---

# Table Requirements

## Features

### Required

- Search bar
- Stage filter dropdown
- Pagination
- 12 rows per page
- Sortable columns
- Inline editing
- Loading state
- Empty state

---

# Search Requirements

Global search must search across:

- Prospect Name
- Phone Number

Search should be debounced by 300ms.

---

# Filter Requirements

Filtering should work using:

- Stage

Recommended UI:
- Dropdown select

---

# Pagination Requirements

- 12 rows per page
- Next/Previous controls
- Current page indicator

---

# Inline Editing Requirements

Users must be able to edit:

- Prospect Name
- Phone Number
- Stage

## Editing Flow

1. User edits a cell
2. Save triggered on Enter or blur
3. Frontend calls update API
4. Google Sheet updates
5. UI refreshes local state

---

# API Specification

## Fetch Prospects

### Endpoint

```http
GET /api/prospects
```

### Response

```json
[
  {
    "id": "Leads-12",
    "prospectName": "John Doe",
    "phoneNumber": "+923001234567",
    "stage": "Interested",
    "sourceSheet": "Leads",
    "rowIndex": 12
  }
]
```

---

## Update Prospect

### Endpoint

```http
PATCH /api/prospects/:id
```

### Request Body

```json
{
  "prospectName": "Updated Name",
  "phoneNumber": "+923001111111",
  "stage": "Closed"
}
```

---

# Google Sheets Configuration

## Authentication Method

Use Google Service Account authentication.

The Google Sheet must be shared with the service account email.

---

# Required Environment Variables

```env
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
```

---

# Google Private Key Formatting

For Vercel deployment:

```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXX\n-----END PRIVATE KEY-----\n"
```

---

# Suggested Folder Structure

```txt
/app
  /(auth)
    /login

  /(dashboard)
    /prospects

/api
  /prospects

/components
  /table
  /filters
  /ui

/lib
  /google
  /auth
  /utils
  /types

/middleware.ts
```

---

# UI Layout

```txt
--------------------------------
Top Navigation
  - App Name
  - Logout Button
--------------------------------

Search Bar
Stage Filter

--------------------------------
Prospects Table
--------------------------------

Pagination Controls
--------------------------------
```

---

# Security Requirements

Since the application is internal-only:

- Simple username/password auth is acceptable
- Use HttpOnly cookies
- Protect routes using middleware

No OAuth or database auth required.

---

# Recommended Libraries

```bash
npm install googleapis
npm install @tanstack/react-table
npm install zod
npm install lucide-react
npm install sonner
```

---

# Error Handling Requirements

Handle the following cases:

- Invalid login credentials
- Missing Google credentials
- Google API errors
- Missing required sheet headers
- Empty sheets
- Failed updates
- Network failures

---

# UX Requirements

## Loading States

Display loading indicators while:
- fetching data
- updating rows

## Toast Notifications

Show success/error toasts for:
- row updates
- failed saves

---

# MVP Scope

## Included

- Authentication
- Google Sheets integration
- Unified data table
- Search
- Stage filter
- Pagination
- Inline editing
- Google Sheets sync

---

# Future Improvements (Optional)

- CSV export
- Bulk editing
- Audit logs
- Row history
- Advanced filters
- Multi-user auth
- Realtime updates
- Activity tracking

---

# Key Architectural Requirement

The most important part of the system is the header-based normalization layer.

The application must NEVER rely on fixed column indexes.

All mapping must happen using column header names.

Example:

```ts
normalizeSheetRow(headers, row)
```

This ensures the system remains stable even if sheet column positions change.

---

# Deployment

## Hosting Platform

- Vercel

## Requirements

- Environment variables configured in Vercel
- Google Service Account credentials added securely
- Production build must work without additional backend services

---

# Success Criteria

The project is considered complete when:

- User can login successfully
- Data loads from all specified sheets
- Search works for Prospect Name and Phone Number
- Stage filtering works
- Pagination works with 12 rows per page
- Inline edits update Google Sheets successfully
- Data refreshes correctly on reload
- Deployment works on Vercel