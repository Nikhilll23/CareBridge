# Hospital Information System (HIS) - Master Technical Documentation

This document provides a comprehensive, deep-dive explanation of the entire project, from architectural decisions to specific code implementations.

---

## 1. Architectural Philosophy & Stack Decisions

### Core Framework: Next.js 15 (App Router)
*   **Why:** We chose the App Router (`/app` directory) over the legacy Pages router (`/pages`) to leverage **React Server Components (RSC)**.
*   **Benefit:** 
    *   **Zero-Bundle-Size Data Fetching:** We fetch patient data directly on the server (in `page.tsx` or `actions/`), reducing the JavaScript sent to the browser.
    *   **Security:** Database credentials and logic (Server Actions) never leak to the client.
    *   **SEO:** Critical for the landing page and public portals.

### Database & Backend: Supabase (PostgreSQL)
*   **Why:** Traditional SQL databases require manual API layers (Express/NestJS). Supabase gives us a real-time Postgres DB with auto-generated APIs.
*   **Key Implementation:**
    *   **Row Level Security (RLS):** We implemented policies so that even if an API key is exposed, a logged-in user can ONLY read their own corresponding rows in `appointments` or `medical_records`.
    *   **Triggers:** Used for updating `updated_at` timestamps automatically.

### Authentication: Clerk
*   **Why:** Building secure auth (2FA, Session Management, Password Reset) from scratch is error-prone.
*   **Integration:** We use Clerk Middleware (`middleware.ts`) to intercept every request.
    *   **Sync Logic:** When a user logs in via Clerk, our `src/actions/auth.ts -> syncUser()` function runs. It checks if the user exists in our Supabase `users` table. If not, it creates them. This keeps our relational data (appointments) linked to Clerk's auth identities.

### UI/UX Library: Shadcn/UI + Tailwind CSS
*   **Why:** We needed a professional medical aesthetic without writing 10,000 lines of CSS.
*   **Implementation:** All components (`Card`, `Button`, `Sheet`, `Select`) are reusable copies of Radix UI primitives. This ensures **Accessibility (A11y)** compliance (screen readers support) out of the box, which is legally required for medical software.

---

## 2. Feature-by-Feature Deep Dive

### A. The "Smart" Authentication System
*   **File:** `src/actions/auth.ts`
*   **Logic:**
    1.  User signs in.
    2.  System checks their email against a **Hardcoded Whitelist** (`omarhashmi494@...`, `aayush...`).
    3.  If matched, it forces the database role to `ADMIN`.
    4.  If the email starts with `dr.`, it assigns `DOCTOR`.
    5.  Default is `PATIENT`.
*   **Audit Logging:** Every login triggers `logAuditAction`, saving the timestamp and IP (implicit) to the `audit_logs` table for compliance.

### B. Patient Portal & Appointment Booking
*   **Files:** `src/app/dashboard/patient/page.tsx`, `src/components/modules/patient/QuickBook.tsx`
*   **The Problem:** Preventing double-bookings and invalid data.
*   **The Solution:**
    *   **Validation:** We use **Zod** schemas (`z.object({ reason: z.string().min(10) })`) to validate inputs *before* they even reach the server.
    *   **Data Flow:** 
        Client Form -> `actions/appointments.ts` -> `supabase.insert()` -> `revalidatePath()`
    *   **Revalidation:** Instead of reloading the page, we use Next.js `revalidatePath`. This instantly refreshes the "Upcoming Appointments" list without a full browser refresh.

### C. The Emergency Response Map (Technical Highlight)
*   **Files:** `src/components/shared/PatientMap.tsx`, `src/components/modules/map/AmbulanceManager.tsx`
*   **Challenge:** "Hydration Mismatch" (Server generates HTML, Client has different HTML due to Window object).
*   **Solution:** 
    *   We implemented a `useMounted` hook pattern. Map components return `null` during Server-Side Rendering (SSR) and only render after `useEffect` (Mount) runs on the client.
    *   **Leaflet.js** requires the `window` object, so it is strictly client-side.
*   **Geolocation Logic:**
    1.  Browser asks permission: `navigator.geolocation.getCurrentPosition`.
    2.  Coordinates (Lat/Lng) are captured.
    3.  **Distance Calculation:** We (conceptually) calculate the Euclidean distance to the nearest available ambulance marker.
    4.  **Routing:** A `Polyline` is drawn between the User and the Ambulance to visualize the path.

### D. Context-Aware AI Assistant
*   **Files:** `src/components/modules/ai/AIChat.tsx`, `src/actions/ai.ts`
*   **The "Brain":** We use **Groq** (Llama-3 model) for sub-second inference speeds.
*   **The Context Engine:**
    *   Standard chatbots are "dumb" (they don't know who the patient is).
    *   **Our Innovation:** A "Context Injector".
    *   **Bulk Loading:** When Admin selects "Full Database", `getBulkPatientContext()` runs a SQL query grabbing a snapshot of 50 patients (demographics only).
    *   **Deep Dive:** When Admin selects "Amit Patel", `getPatientAIContext()` fetches:
        *   Recent 20 Appointments.
        *   Recent 20 Radiology Reports.
        *   Current Medications.
    *   **Prompt Engineering:** We wrap this data in a hidden "System Message" (`role: 'system'`) that instructs the AI: *"You are a medical expert. Use the following data to answer the user..."*.
*   **Chat History:** We pass the entire `messages` array back to the server on every turn, so the AI remembers previous questions in the session.

### E. Admin Dashboard & Analytics
*   **Files:** `src/app/dashboard/admin/page.tsx`
*   **Data Aggregation:** 
    *   We run SQL `count` queries to get `total_patients`, `total_doctors`.
    *   We sum the `invoices` table for `total_revenue`.
*   **Visuals:** We use **Recharts** to render the data into Bar and Line charts. These are responsive and animate on load.

---

## 3. Database Schema Overview (Key Tables)

| Table Name | Purpose | Key Columns |
| :--- | :--- | :--- |
| `users` | Core identity & Role | `id` (PK), `role` (ENUM), `email` |
| `patients` | Medical Profiles | `id`, `medical_history`, `blood_group` |
| `appointments` | Scheduling | `doctor_id` (FK), `patient_id` (FK), `status`, `date` |
| `audit_logs` | Security Tracking | `action_type`, `performed_by`, `target_resource` |
| `ambulances` | Fleet Management | `status` (BUSY/AVAIL), `current_lat`, `current_lng` |

---

## 4. Why This Project Stands Out?
1.  **Safety First:** It handles hydration errors and prevents crashes in critical emergency views.
2.  **AI That Actually Works:** It doesn't just chat; it *reads* the database for you.
3.  **Real-World Ready:** Audit logs, RBAC (Role Based Access), and Email Integration (Nodemailer for notifications) make it deployment-ready.
