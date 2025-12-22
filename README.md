# 🏥 Healthcare Queue Intelligence Wait Time Forecasting System

A **production-style backend system** for managing **hospital patient queues** and predicting **expected wait times**.  
The platform tracks real-time queue states, handles concurrent patient arrivals, calculates estimated waiting times, and exposes **human-readable queue status** through APIs.

This project is designed with **real-world hospital operations** in mind and follows an **end-to-end backend engineering pipeline**, not just API experimentation.

---

## 🌍 Real-World Problems Addressed

* Patients do not know how long they will wait
* No visibility into queue position
* Staff manually manage queues → inefficient
* Overcrowding and patient frustration

### Examples

* Multiple patients checking in simultaneously
* Emergency cases overriding normal queues
* Variable consultation times causing unexpected delays
* High patient load during peak hours

---

## 🎯 Project Goals

* Efficient patient queue management
* Real-time queue state tracking
* Wait-time estimation per patient
* Concurrency-safe handling of simultaneous arrivals
* Department-wise queue tracking (FIFO / priority)
* Expose patient queue status via APIs
* Maintain audit-ready queue and service logs

---

## 🧠 High-Level System Flow

```
Patient Check-In
        ↓
Queue Assignment
        ↓
Queue State Management
        ↓
Wait-Time Estimation
        ↓
Patient Status API
```

---

## 🔍 Core Features

### ✅ Patient Intake API

* Register new patients
* Assign department
* Record arrival timestamp
* Add to department queue

### ✅ Queue State Management

* Track queue position and status (waiting / in-service / completed)
* Handle multiple patient arrivals concurrently
* Support FIFO and priority-based queues

### ✅ Wait-Time Estimation Engine

* Calculate estimated wait time:
  - Number of patients ahead × Average service time
  - Adjust for multiple doctors, breaks, and emergency overrides

### ✅ Real-Time Status API

* Get patient queue position
* Get estimated wait time
* Get current status

### ✅ Persistence & Logging

* Store patient records
* Maintain queue history
* Log service start and end times

---

## 🛠️ Tech Stack

| Layer           | Technology            |
| --------------- | -------------------- |
| Backend         | Python (FastAPI)      |
| Database        | PostgreSQL            |
| API Style       | REST                  |
| Concurrency     | Database transactions |
| Deployment      | Docker                |

---

## 📁 Project Structure

```
app/
├── main.py # Application entry point
├── routers/ # API routes (patient intake, status)
├── schemas/ # Request/response validation
├── database/ # Database connection & session
├── core/ # Configuration

```
---

## 🚀 Getting Started
### 1️⃣ Clone the Repository

```bash
git clone https://github.com/<your-username>/queuecare.git
cd queuecare

### 2️⃣ Create Virtual Environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

### 3️⃣ Install Dependencies
pip install -r requirements.txt

### 4️⃣ Run the Backend
uvicorn app.main:app --reload

---
## 📊 Sample API Output

```json
{
  "patient_id": "P12345",
  "department": "Cardiology",
  "queue_position": 3,
  "estimated_wait_time": "00:25:00",
  "status": "waiting"
}
---

## 🧪 Use Cases

* Hospital queue management
* Real-time patient wait-time tracking
* Resource allocation for doctors and staff
* Analytics on peak hours and department load
* Emergency queue handling
---

⭐ If you find this project useful, consider starring the repository!

