# College ERP Mobile App - Screen Data Map

This document outlines exactly what **data** is displayed on each screen of the mobile app and what **actions** a user can take. This format makes it easy to build the UI and know exactly what data needs to be fetched or hardcoded for the frontend.

---

## 🔐 1. Authentication

### **Login Page**
*   **Data Displayed**:
    *   App Logo / College Name
*   **User Input (Forms)**:
    *   Email
    *   Password
    *   "Remember Me" checkbox state
*   **Actions**:
    *   Click "Sign In"
    *   Click "Forgot Password"
    *   Click "Create Account"

### **Registration Page**
*   **Data Displayed**:
    *   List of Departments (for dropdown)
*   **User Input (Forms)**:
    *   Full Name
    *   Email
    *   Password & Confirm Password
    *   Role Selection (Student, Faculty, Staff)
    *   Department Selection
*   **Actions**:
    *   Click "Create Account"

---

## 🏠 2. Dashboard 

### **Dashboard Page (Student View)**
*   **Data Displayed**:
    *   User's First Name ("Good morning, John")
    *   **Stat Cards**: Total number of Enrolled Courses, Overall Attendance Percentage (%)
    *   **Upcoming Sessions List**: Next 3 classes (Course Name, Date, Time, Room Number, Faculty Name)
    *   **Recent Activity List**: Last 3-5 notifications/actions (e.g., "Attendance marked for Math 101")
*   **Actions**:
    *   Click on an upcoming session to view details

### **Dashboard Page (Faculty View)**
*   **Data Displayed**:
    *   User's First Name
    *   **Stat Cards**: Total Sessions Today, Number of Classes Pending Attendance Marking
    *   **Today's Schedule**: List of classes to teach today (Course Name, Time, Room, action button to "Mark Attendance")
*   **Actions**:
    *   Click "Mark Attendance" for a specific session

### **Dashboard Page (Admin View)**
*   **Data Displayed**:
    *   User's First Name
    *   **Stat Cards**: Total Students count, Total Faculty count, Total Departments count, Active Courses count
    *   **Pending Approvals List**: Brief list of 3 newly registered users waiting for account approval (Name, Role)

---

## 🏢 3. Departments

### **Department List Page**
*   **Data Displayed**:
    *   List of all Departments. For each:
        *   Department Name (e.g., "Computer Science")
        *   Department Code (e.g., "CS")
        *   Total Number of Faculty in this dept
        *   Total Number of Students in this dept
*   **User Input**:
    *   Search text (to filter by name/code)

### **Department Detail Page**
*   **Data Displayed**:
    *   Department Name & Code
    *   **Faculty List**: Names and Designations of faculty related to this dept
    *   **Course List**: Names of courses offered by this dept
    *   Total Student Count

---

## 📚 4. Courses

### **Course List Page**
*   **Data Displayed**:
    *   List of Courses. For each:
        *   Course Name
        *   Course Code
        *   Department it belongs to
        *   Number of Credits (e.g., 3)
        *   Course Level (Beginner, Intermediate, Advanced)

### **Course Detail Page**
*   **Data Displayed**:
    *   Course Name, Code, Credits, Level, Elective Status
    *   Full Description paragraph
    *   **Prerequisites List**: Names of courses that must be taken first
    *   **Current Offerings**: List of terms this course is currently active in, and who is teaching it.

---

## 👨‍🎓 5. Students

### **Student List Page**
*   **Data Displayed**:
    *   List of Students. For each:
        *   Student Name
        *   Roll Number
        *   Department Name
        *   Batch (e.g., "2024")
        *   Current Semester Number

### **Student Profile Page**
*   **Data Displayed**:
    *   Student Name, Email, Roll Number
    *   Department, Batch, Semester
    *   **Enrolled Courses List**: Courses they are taking this term
    *   **Overall Attendance**: A percentage number (e.g., "82%")

---

## 👨‍🏫 6. Faculty

### **Faculty List Page**
*   **Data Displayed**:
    *   List of Faculty members. For each:
        *   Name, Email
        *   Department
        *   Designation (e.g., "Professor", "Assistant Professor")

### **Faculty Profile Page**
*   **Data Displayed**:
    *   Name, Email, Department, Designation
    *   Specialization text
    *   **Teaching Load**: List of courses they are teaching in the current term

---

## 🗓️ 7. Schedule / Sessions

### **Sessions List Page**
*   **Data Displayed**:
    *   List of specific class instances (Sessions). For each:
        *   Date and Time (Start & End)
        *   Course Name
        *   Faculty Name
        *   Room / Location
        *   Status (Upcoming, Completed, Ongoing)

---

## ✅ 8. Attendance

### **Mark Attendance Page (For Faculty)**
*   **Data Displayed**:
    *   Session Info (Course Name, Date, Time)
    *   **List of Enrolled Students**: For each student:
        *   Name
        *   Roll Number
*   **User Input / Actions**:
    *   For each student, select status: [Present] [Absent] [Late] [Excused]
    *   Optional text input for "Remarks" per student
    *   Click "Save Attendance"

### **My Attendance Page (For Student)**
*   **Data Displayed**:
    *   **Overall Attendance Score**: e.g., 85%
    *   **List of Enrolled Courses**. For each course:
        *   Course Name
        *   Specific Attendance Percentage for that course (e.g., 90%)
        *   Fraction of classes attended (e.g., "18 / 20 classes")

---

## 👤 9. Profile & Settings

### **My Profile Page**
*   **Data Displayed**:
    *   User's Name
    *   User's Email
    *   User's Role (Badge)
    *   User's Status (e.g., "Active")
*   **Actions**:
    *   Click "Change Password"
    *   Click "Log Out"

---

## 💡 LLM Prompt to Use This Document

```
Build the frontend UI of a mobile app using [React Native / Flutter]. 
Use the following "Screen Data Map" to understand exactly what data needs to be displayed on each screen. 

Requirements:
- Create separate screens/components based on the headings.
- Create mock JSON data objects to populate these screens based on the "Data Displayed" lists. For example, for the Student List Page, create an array of mock student objects containing Name, Roll Number, Department, Batch, and Semester.
- Lay out the UI elements to clearly show this data.
- Build the basic navigation between these pages.

[PASTE THIS ENTIRE DOCUMENT]
```
