import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from './config/database';
import {
  User,
  Student,
  Faculty,
  Department,
  Course,
  Term,
  CourseOffering,
  OfferingFaculty,
  Session,
  Enrollment,
  AttendanceRecord,
  UserStatus,
  TermStatus,
  SessionStatus,
  EnrollmentStatus,
  AttendanceStatus
} from './models';
import { UserRole } from './models/User';
import { FacultyRole } from './models/OfferingFaculty';

// Configuration
const CLEAR_BEFORE_SEED = process.env.CLEAR_BEFORE_SEED !== 'false';
const SEED_PASSWORD = 'Seed123456!';
const SALT_ROUNDS = 10;

// Sample data
const departments = [
  { name: 'Computer Science & Engineering', code: 'CSE' },
  { name: 'Electronics & Communication', code: 'ECE' },
  { name: 'Mechanical Engineering', code: 'ME' },
  { name: 'Civil Engineering', code: 'CE' },
  { name: 'Electrical Engineering', code: 'EE' },
  { name: 'Information Technology', code: 'IT' },
  { name: 'Mathematics & Computing', code: 'MNC' },
  { name: 'Physics', code: 'PHY' },
  { name: 'Chemistry', code: 'CHEM' },
  { name: 'Business Administration', code: 'BA' }
];

const termsData = [
  {
    name: 'Fall 2024',
    startDate: new Date('2024-08-15'),
    endDate: new Date('2024-12-20'),
    status: TermStatus.COMPLETED
  },
  {
    name: 'Spring 2025',
    startDate: new Date('2025-01-15'),
    endDate: new Date('2025-05-20'),
    status: TermStatus.COMPLETED
  },
  {
    name: 'Fall 2025',
    startDate: new Date('2025-08-15'),
    endDate: new Date('2025-12-20'),
    status: TermStatus.ACTIVE
  },
  {
    name: 'Spring 2026',
    startDate: new Date('2026-01-15'),
    endDate: new Date('2026-05-20'),
    status: TermStatus.UPCOMING
  }
];

const courseData = [
  { code: 'CS101', name: 'Introduction to Programming', credits: 4, level: 'beginner', elective: false },
  { code: 'CS102', name: 'Data Structures', credits: 4, level: 'beginner', elective: false },
  { code: 'CS201', name: 'Algorithms', credits: 4, level: 'intermediate', elective: false },
  { code: 'CS202', name: 'Database Systems', credits: 3, level: 'intermediate', elective: false },
  { code: 'CS203', name: 'Operating Systems', credits: 4, level: 'intermediate', elective: false },
  { code: 'CS204', name: 'Computer Networks', credits: 3, level: 'intermediate', elective: false },
  { code: 'CS301', name: 'Machine Learning', credits: 3, level: 'advanced', elective: true },
  { code: 'CS302', name: 'Distributed Systems', credits: 3, level: 'advanced', elective: true },
  { code: 'CS303', name: 'Computer Security', credits: 3, level: 'advanced', elective: true },
  { code: 'CS304', name: 'Software Engineering', credits: 3, level: 'intermediate', elective: false },
  { code: 'ECE101', name: 'Digital Electronics', credits: 4, level: 'beginner', elective: false },
  { code: 'ECE201', name: 'Microprocessors', credits: 4, level: 'intermediate', elective: false },
  { code: 'ECE301', name: 'VLSI Design', credits: 3, level: 'advanced', elective: true },
  { code: 'ME101', name: 'Engineering Mechanics', credits: 4, level: 'beginner', elective: false },
  { code: 'ME201', name: 'Thermodynamics', credits: 3, level: 'intermediate', elective: false },
  { code: 'ME301', name: 'Fluid Mechanics', credits: 3, level: 'advanced', elective: true },
  { code: 'CE101', name: 'Engineering Drawing', credits: 3, level: 'beginner', elective: false },
  { code: 'CE201', name: 'Structural Analysis', credits: 4, level: 'intermediate', elective: false },
  { code: 'EE101', name: 'Circuit Analysis', credits: 4, level: 'beginner', elective: false },
  { code: 'EE201', name: 'Power Systems', credits: 3, level: 'intermediate', elective: false },
  { code: 'IT101', name: 'Web Technologies', credits: 3, level: 'beginner', elective: true },
  { code: 'IT201', name: 'Cloud Computing', credits: 3, level: 'intermediate', elective: true },
  { code: 'MNC101', name: 'Calculus', credits: 4, level: 'beginner', elective: false },
  { code: 'MNC201', name: 'Linear Algebra', credits: 3, level: 'intermediate', elective: false },
  { code: 'BA101', name: 'Principles of Management', credits: 3, level: 'beginner', elective: true }
];

const users = [
  // Super Admin
  { name: 'Super Admin', email: 'superadmin@erp.edu', role: UserRole.SUPER_ADMIN },

  // Admins
  { name: 'John Admin', email: 'john.admin@erp.edu', role: UserRole.ADMIN },
  { name: 'Sarah Admin', email: 'sarah.admin@erp.edu', role: UserRole.ADMIN },

  // Department Heads
  { name: 'Dr. Robert Chen', email: 'robert.chen@erp.edu', role: UserRole.DEPT_HEAD, deptCode: 'CSE' },
  { name: 'Dr. Emily Watson', email: 'emily.watson@erp.edu', role: UserRole.DEPT_HEAD, deptCode: 'ECE' },
  { name: 'Dr. Michael Brown', email: 'michael.brown@erp.edu', role: UserRole.DEPT_HEAD, deptCode: 'ME' },

  // Faculty - CSE
  { name: 'Prof. Alice Johnson', email: 'alice.johnson@erp.edu', role: UserRole.FACULTY, deptCode: 'CSE', designation: 'Professor', specialization: 'Algorithms & Theory' },
  { name: 'Prof. David Lee', email: 'david.lee@erp.edu', role: UserRole.FACULTY, deptCode: 'CSE', designation: 'Associate Professor', specialization: 'Machine Learning' },
  { name: 'Dr. Lisa Wang', email: 'lisa.wang@erp.edu', role: UserRole.FACULTY, deptCode: 'CSE', designation: 'Assistant Professor', specialization: 'Database Systems' },
  { name: 'Dr. James Wilson', email: 'james.wilson@erp.edu', role: UserRole.FACULTY, deptCode: 'CSE', designation: 'Assistant Professor', specialization: 'Software Engineering' },
  { name: 'Prof. Karen Martinez', email: 'karen.martinez@erp.edu', role: UserRole.FACULTY, deptCode: 'CSE', designation: 'Professor', specialization: 'Computer Networks' },

  // Faculty - ECE
  { name: 'Prof. Thomas Anderson', email: 'thomas.anderson@erp.edu', role: UserRole.FACULTY, deptCode: 'ECE', designation: 'Professor', specialization: 'VLSI Design' },
  { name: 'Dr. Nancy Taylor', email: 'nancy.taylor@erp.edu', role: UserRole.FACULTY, deptCode: 'ECE', designation: 'Associate Professor', specialization: 'Digital Electronics' },

  // Faculty - ME
  { name: 'Prof. Richard Moore', email: 'richard.moore@erp.edu', role: UserRole.FACULTY, deptCode: 'ME', designation: 'Professor', specialization: 'Thermodynamics' },
  { name: 'Dr. Patricia White', email: 'patricia.white@erp.edu', role: UserRole.FACULTY, deptCode: 'ME', designation: 'Assistant Professor', specialization: 'Fluid Mechanics' },

  // Faculty - Other departments
  { name: 'Prof. Christopher Harris', email: 'christopher.harris@erp.edu', role: UserRole.FACULTY, deptCode: 'CE', designation: 'Associate Professor', specialization: 'Structural Engineering' },
  { name: 'Dr. Susan Clark', email: 'susan.clark@erp.edu', role: UserRole.FACULTY, deptCode: 'EE', designation: 'Professor', specialization: 'Power Systems' },
  { name: 'Prof. Daniel Lewis', email: 'daniel.lewis@erp.edu', role: UserRole.FACULTY, deptCode: 'IT', designation: 'Associate Professor', specialization: 'Cloud Computing' },
  { name: 'Dr. Elizabeth Walker', email: 'elizabeth.walker@erp.edu', role: UserRole.FACULTY, deptCode: 'MNC', designation: 'Professor', specialization: 'Applied Mathematics' },
  { name: 'Prof. Matthew Hall', email: 'matthew.hall@erp.edu', role: UserRole.FACULTY, deptCode: 'BA', designation: 'Associate Professor', specialization: 'Organizational Behavior' },

  // Staff
  { name: 'Jennifer Allen', email: 'jennifer.allen@erp.edu', role: UserRole.STAFF },
  { name: 'Steven Young', email: 'steven.young@erp.edu', role: UserRole.STAFF },
  { name: 'Maria Hernandez', email: 'maria.hernandez@erp.edu', role: UserRole.STAFF },

  // Students - CSE
  { name: 'Amit Kumar', email: 'amit.kumar@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Priya Sharma', email: 'priya.sharma@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Rahul Singh', email: 'rahul.singh@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Sneha Patel', email: 'sneha.patel@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Vikram Reddy', email: 'vikram.reddy@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Anjali Mehta', email: 'anjali.mehta@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Karan Joshi', email: 'karan.joshi@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Ishita Gupta', email: 'ishita.gupta@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Rohit Nair', email: 'rohit.nair@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Pooja Verma', email: 'pooja.verma@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Arjun Kapoor', email: 'arjun.kapoor@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Diya Malhotra', email: 'diya.malhotra@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Aditya Khanna', email: 'aditya.khanna@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Siddharth Sharma', email: 'siddharth.sharma@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Kavya Nair', email: 'kavya.nair@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Rohan Das', email: 'rohan.das@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Ishani Sen', email: 'ishani.sen@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Arvind Patel', email: 'arvind.patel@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Preeti Mukherjee', email: 'preeti.mukherjee@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },
  { name: 'Kabir Khan', email: 'kabir.khan@erp.edu', role: UserRole.STUDENT, deptCode: 'CSE' },

  // Students - ECE
  { name: 'Neha Das', email: 'neha.das@erp.edu', role: UserRole.STUDENT, deptCode: 'ECE' },
  { name: 'Sourav Ganguly', email: 'sourav.ganguly@erp.edu', role: UserRole.STUDENT, deptCode: 'ECE' },
  { name: 'Priyanka Chakraborty', email: 'priyanka.chakraborty@erp.edu', role: UserRole.STUDENT, deptCode: 'ECE' },
  { name: 'Rajesh Banerjee', email: 'rajesh.banerjee@erp.edu', role: UserRole.STUDENT, deptCode: 'ECE' },

  // Students - ME
  { name: 'Deepak Yadav', email: 'deepak.yadav@erp.edu', role: UserRole.STUDENT, deptCode: 'ME' },
  { name: 'Sunita Rao', email: 'sunita.rao@erp.edu', role: UserRole.STUDENT, deptCode: 'ME' },
  { name: 'Mohan Krishna', email: 'mohan.krishna@erp.edu', role: UserRole.STUDENT, deptCode: 'ME' },

  // Students - Other Departments
  { name: 'Kavita Iyer', email: 'kavita.iyer@erp.edu', role: UserRole.STUDENT, deptCode: 'CE' },
  { name: 'Ramesh Kumar', email: 'ramesh.kumar@erp.edu', role: UserRole.STUDENT, deptCode: 'EE' },
  { name: 'Swati Naidu', email: 'swati.naidu@erp.edu', role: UserRole.STUDENT, deptCode: 'IT' },
  { name: 'Vikram Sarabhai', email: 'vikram.sarabhai@erp.edu', role: UserRole.STUDENT, deptCode: 'MNC' },
  { name: 'Meera Srinivasan', email: 'meera.srinivasan@erp.edu', role: UserRole.STUDENT, deptCode: 'BA' }
];

// Students by department
const studentData = [
  // CSE Students - Batch 2023 (Semester 5)
  { name: 'Amit Kumar', email: 'amit.kumar@erp.edu', rollNumber: 'CSE2023001', deptCode: 'CSE', batch: '2023', semester: 5 },
  { name: 'Priya Sharma', email: 'priya.sharma@erp.edu', rollNumber: 'CSE2023002', deptCode: 'CSE', batch: '2023', semester: 5 },
  { name: 'Rahul Singh', email: 'rahul.singh@erp.edu', rollNumber: 'CSE2023003', deptCode: 'CSE', batch: '2023', semester: 5 },
  { name: 'Sneha Patel', email: 'sneha.patel@erp.edu', rollNumber: 'CSE2023004', deptCode: 'CSE', batch: '2023', semester: 5 },
  { name: 'Vikram Reddy', email: 'vikram.reddy@erp.edu', rollNumber: 'CSE2023005', deptCode: 'CSE', batch: '2023', semester: 5 },

  // CSE Students - Batch 2024 (Semester 3)
  { name: 'Anjali Mehta', email: 'anjali.mehta@erp.edu', rollNumber: 'CSE2024001', deptCode: 'CSE', batch: '2024', semester: 3 },
  { name: 'Karan Joshi', email: 'karan.joshi@erp.edu', rollNumber: 'CSE2024002', deptCode: 'CSE', batch: '2024', semester: 3 },
  { name: 'Ishita Gupta', email: 'ishita.gupta@erp.edu', rollNumber: 'CSE2024003', deptCode: 'CSE', batch: '2024', semester: 3 },
  { name: 'Rohit Nair', email: 'rohit.nair@erp.edu', rollNumber: 'CSE2024004', deptCode: 'CSE', batch: '2024', semester: 3 },
  { name: 'Pooja Verma', email: 'pooja.verma@erp.edu', rollNumber: 'CSE2024005', deptCode: 'CSE', batch: '2024', semester: 3 },

  // CSE Students - Batch 2025 (Semester 1)
  { name: 'Arjun Kapoor', email: 'arjun.kapoor@erp.edu', rollNumber: 'CSE2025001', deptCode: 'CSE', batch: '2025', semester: 1 },
  { name: 'Diya Malhotra', email: 'diya.malhotra@erp.edu', rollNumber: 'CSE2025002', deptCode: 'CSE', batch: '2025', semester: 1 },
  { name: 'Aditya Khanna', email: 'aditya.khanna@erp.edu', rollNumber: 'CSE2025003', deptCode: 'CSE', batch: '2025', semester: 1 },
  { name: 'Siddharth Sharma', email: 'siddharth.sharma@erp.edu', rollNumber: 'CSE2025004', deptCode: 'CSE', batch: '2025', semester: 1 },
  { name: 'Kavya Nair', email: 'kavya.nair@erp.edu', rollNumber: 'CSE2025005', deptCode: 'CSE', batch: '2025', semester: 1 },
  { name: 'Rohan Das', email: 'rohan.das@erp.edu', rollNumber: 'CSE2025006', deptCode: 'CSE', batch: '2025', semester: 1 },
  { name: 'Ishani Sen', email: 'ishani.sen@erp.edu', rollNumber: 'CSE2025007', deptCode: 'CSE', batch: '2025', semester: 1 },
  { name: 'Arvind Patel', email: 'arvind.patel@erp.edu', rollNumber: 'CSE2025008', deptCode: 'CSE', batch: '2025', semester: 1 },
  { name: 'Preeti Mukherjee', email: 'preeti.mukherjee@erp.edu', rollNumber: 'CSE2025009', deptCode: 'CSE', batch: '2025', semester: 1 },
  { name: 'Kabir Khan', email: 'kabir.khan@erp.edu', rollNumber: 'CSE2025010', deptCode: 'CSE', batch: '2025', semester: 1 },

  // ECE Students
  { name: 'Neha Das', email: 'neha.das@erp.edu', rollNumber: 'ECE2023001', deptCode: 'ECE', batch: '2023', semester: 5 },
  { name: 'Sourav Ganguly', email: 'sourav.ganguly@erp.edu', rollNumber: 'ECE2023002', deptCode: 'ECE', batch: '2023', semester: 5 },
  { name: 'Priyanka Chakraborty', email: 'priyanka.chakraborty@erp.edu', rollNumber: 'ECE2024001', deptCode: 'ECE', batch: '2024', semester: 3 },
  { name: 'Rajesh Banerjee', email: 'rajesh.banerjee@erp.edu', rollNumber: 'ECE2024002', deptCode: 'ECE', batch: '2024', semester: 3 },

  // ME Students
  { name: 'Deepak Yadav', email: 'deepak.yadav@erp.edu', rollNumber: 'ME2023001', deptCode: 'ME', batch: '2023', semester: 5 },
  { name: 'Sunita Rao', email: 'sunita.rao@erp.edu', rollNumber: 'ME2023002', deptCode: 'ME', batch: '2023', semester: 5 },
  { name: 'Mohan Krishna', email: 'mohan.krishna@erp.edu', rollNumber: 'ME2024001', deptCode: 'ME', batch: '2024', semester: 3 },

  // Other Departments
  { name: 'Kavita Iyer', email: 'kavita.iyer@erp.edu', rollNumber: 'CE2023001', deptCode: 'CE', batch: '2023', semester: 5 },
  { name: 'Ramesh Kumar', email: 'ramesh.kumar@erp.edu', rollNumber: 'EE2023001', deptCode: 'EE', batch: '2023', semester: 5 },
  { name: 'Swati Naidu', email: 'swati.naidu@erp.edu', rollNumber: 'IT2023001', deptCode: 'IT', batch: '2023', semester: 5 },
  { name: 'Vikram Sarabhai', email: 'vikram.sarabhai@erp.edu', rollNumber: 'MNC2023001', deptCode: 'MNC', batch: '2023', semester: 5 },
  { name: 'Meera Srinivasan', email: 'meera.srinivasan@erp.edu', rollNumber: 'BA2023001', deptCode: 'BA', batch: '2023', semester: 5 }
];

// Helper function to hash password
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

// Clear existing data
const clearDatabase = async () => {
  console.log('🗑️  Clearing existing data...');
  await AttendanceRecord.deleteMany({});
  await Session.deleteMany({});
  await Enrollment.deleteMany({});
  await OfferingFaculty.deleteMany({});
  await CourseOffering.deleteMany({});
  await Student.deleteMany({});
  await Faculty.deleteMany({});
  await User.deleteMany({});
  await Course.deleteMany({});
  await Term.deleteMany({});
  await Department.deleteMany({});
  console.log('✅ Database cleared');
};

// Seed departments
const seedDepartments = async () => {
  console.log('📁 Seeding departments...');
  const createdDepts = await Department.insertMany(departments);
  console.log(`✅ Created ${createdDepts.length} departments`);
  return createdDepts;
};

// Seed terms
const seedTerms = async () => {
  console.log('📅 Seeding terms...');
  const createdTerms = await Term.insertMany(termsData);
  console.log(`✅ Created ${createdTerms.length} terms`);
  return createdTerms;
};

// Seed courses
const seedCourses = async (deptMap: Map<string, mongoose.Types.ObjectId>) => {
  console.log('📚 Seeding courses...');

  const coursesWithDepts = courseData.map(course => {
    // Determine department from course code
    let deptCode = 'CSE';
    const codePrefix = course.code.substring(0, course.code.indexOf('1') || 2).toUpperCase();
    if (deptMap.has(codePrefix)) {
      deptCode = codePrefix;
    } else if (course.code.startsWith('CS')) deptCode = 'CSE';
    else if (course.code.startsWith('ECE')) deptCode = 'ECE';
    else if (course.code.startsWith('ME')) deptCode = 'ME';
    else if (course.code.startsWith('CE')) deptCode = 'CE';
    else if (course.code.startsWith('EE')) deptCode = 'EE';
    else if (course.code.startsWith('IT')) deptCode = 'IT';
    else if (course.code.startsWith('MNC')) deptCode = 'MNC';
    else if (course.code.startsWith('PHY')) deptCode = 'PHY';
    else if (course.code.startsWith('CHEM')) deptCode = 'CHEM';
    else if (course.code.startsWith('BA')) deptCode = 'BA';

    return {
      ...course,
      description: `This course covers ${course.name.toLowerCase()} concepts and applications.`,
      departmentId: deptMap.get(deptCode)!
    };
  });

  const createdCourses = await Course.insertMany(coursesWithDepts);
  console.log(`✅ Created ${createdCourses.length} courses`);
  return createdCourses;
};

// Seed users
const seedUsers = async (deptMap: Map<string, mongoose.Types.ObjectId>) => {
  console.log('👤 Seeding users...');

  const passwordHash = await hashPassword(SEED_PASSWORD);

  const usersWithDepts = users.map(user => ({
    name: user.name,
    email: user.email,
    passwordHash,
    role: user.role,
    status: UserStatus.ACTIVE,
    departmentId: user.deptCode ? deptMap.get(user.deptCode) : undefined,
    mustChangePassword: false,
    approvedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  const createdUsers = await User.insertMany(usersWithDepts);
  console.log(`✅ Created ${createdUsers.length} users`);
  return createdUsers;
};

// Seed faculty profiles
const seedFaculty = async (
  facultyUsers: any[],
  deptMap: Map<string, mongoose.Types.ObjectId>
) => {
  console.log('👨‍🏫 Seeding faculty profiles...');

  const facultyProfiles = facultyUsers.map(user => {
    const userData = users.find(u => u.email === user.email)!;
    const deptId = deptMap.get(userData.deptCode || 'CSE');
    if (!deptId) {
      throw new Error(`Department not found for user ${user.email}`);
    }
    return {
      userId: user._id,
      departmentId: deptId,
      specialization: userData.specialization || 'General',
      designation: userData.designation || 'Lecturer',
      joinDate: new Date('2022-01-01')
    };
  });

  const createdFaculty = await Faculty.insertMany(facultyProfiles);
  console.log(`✅ Created ${createdFaculty.length} faculty profiles`);
  return createdFaculty;
};

// Seed students
const seedStudents = async (
  studentUsers: any[],
  deptMap: Map<string, mongoose.Types.ObjectId>
) => {
  console.log('🎓 Seeding students...');

  const studentProfiles = studentUsers.map(user => {
    const userData = studentData.find(s => s.email === user.email)!;
    const deptId = deptMap.get(userData.deptCode);
    if (!deptId) {
      throw new Error(`Department not found for student ${user.email}`);
    }
    return {
      userId: user._id,
      rollNumber: userData.rollNumber,
      departmentId: deptId,
      batch: userData.batch,
      semester: userData.semester
    };
  });

  const createdStudents = await Student.insertMany(studentProfiles);
  console.log(`✅ Created ${createdStudents.length} students`);
  return createdStudents;
};

// Seed course offerings
const seedCourseOfferings = async (
  courses: any[],
  createdTerms: any[],
  faculty: any[]
) => {
  console.log('📋 Seeding course offerings...');

  const activeTerm = createdTerms.find(t => t.status === TermStatus.ACTIVE);
  const upcomingTerm = createdTerms.find(t => t.status === TermStatus.UPCOMING);

  if (!activeTerm || !upcomingTerm) {
    throw new Error('Required terms not found');
  }

  const offerings = [];

  // Create offerings for active term
  for (const course of courses) {
    const courseFaculty = faculty.filter(f =>
      f.departmentId.toString() === course.departmentId.toString()
    );

    if (courseFaculty.length > 0) {
      offerings.push({
        courseId: course._id,
        termId: activeTerm._id,
        capacity: Math.floor(Math.random() * 40) + 30,
        schedule: {
          days: ['Mon', 'Wed', 'Fri'].slice(0, Math.floor(Math.random() * 3) + 2),
          startTime: '09:00',
          endTime: '10:30',
          location: `Room ${Math.floor(Math.random() * 20) + 101}`
        }
      });
    }
  }

  // Create some offerings for upcoming term
  for (const course of courses.slice(0, 10)) {
    const courseFaculty = faculty.filter(f =>
      f.departmentId.toString() === course.departmentId.toString()
    );

    if (courseFaculty.length > 0 && Math.random() > 0.3) {
      offerings.push({
        courseId: course._id,
        termId: upcomingTerm._id,
        capacity: 40,
        schedule: {
          days: ['Tue', 'Thu'].slice(0, Math.floor(Math.random() * 2) + 1),
          startTime: '14:00',
          endTime: '15:30',
          location: `Room ${Math.floor(Math.random() * 20) + 101}`
        }
      });
    }
  }

  const createdOfferings = await CourseOffering.insertMany(offerings);
  console.log(`✅ Created ${createdOfferings.length} course offerings`);
  return createdOfferings;
};

// Seed faculty assignments
const seedFacultyAssignments = async (
  offerings: any[],
  faculty: any[]
) => {
  console.log('👨‍🏫 Seeding faculty assignments...');

  const assignments = [];

  for (const offering of offerings) {
    const offeringCourse = await Course.findById(offering.courseId);
    if (!offeringCourse) continue;

    const courseFaculty = faculty.filter(f =>
      f.departmentId.toString() === offeringCourse.departmentId.toString()
    );

    if (courseFaculty.length > 0) {
      // Assign 1-2 faculty per offering
      const numFaculty = Math.min(courseFaculty.length, Math.floor(Math.random() * 2) + 1);
      const selectedFaculty = courseFaculty.slice(0, numFaculty);

      for (const fac of selectedFaculty) {
        assignments.push({
          offeringId: offering._id,
          facultyId: fac._id,
          role: Math.random() > 0.3 ? FacultyRole.PRIMARY : FacultyRole.SECONDARY
        });
      }
    }
  }

  const createdAssignments = await OfferingFaculty.insertMany(assignments);
  console.log(`✅ Created ${createdAssignments.length} faculty assignments`);
  return createdAssignments;
};

// Seed enrollments
const seedEnrollments = async (
  offerings: any[],
  students: any[],
  createdTerms: any[]
) => {
  console.log('📝 Seeding enrollments...');

  const activeTermIds = createdTerms
    .filter(t => t.status === TermStatus.ACTIVE || t.status === TermStatus.COMPLETED)
    .map(t => t._id.toString());

  const activeOfferings = offerings.filter(o =>
    activeTermIds.includes(o.termId.toString())
  );

  const enrollments = [];
  const enrollmentMap = new Map<string, Set<string>>(); // offeringId -> Set of studentIds

  // Initialize enrollment map
  for (const offering of activeOfferings) {
    enrollmentMap.set(offering._id.toString(), new Set());
  }

  // Pass 1: Enroll students in their own department courses
  for (const student of students) {
    const studentDoc = student;
    if (!studentDoc) continue;

    // Find eligible offerings for the student's department
    const eligibleOfferings: any[] = [];
    for (const offering of activeOfferings) {
      const course = await Course.findById(offering.courseId);
      if (course && course.departmentId.toString() === studentDoc.departmentId.toString()) {
        eligibleOfferings.push(offering);
      }
    }

    // Enroll in 4-6 courses per student
    const numEnrollments = Math.min(eligibleOfferings.length, Math.floor(Math.random() * 3) + 4);
    const selectedOfferings = eligibleOfferings.slice(0, numEnrollments);

    for (const offering of selectedOfferings) {
      const term = createdTerms.find(t => t._id.toString() === offering.termId.toString());
      const status = term && term.status === TermStatus.COMPLETED
        ? (Math.random() > 0.15 ? EnrollmentStatus.COMPLETED : EnrollmentStatus.FAILED)
        : EnrollmentStatus.ENROLLED;

      const offeringIdStr = offering._id.toString();
      const studentIdStr = student._id.toString();

      if (!enrollmentMap.get(offeringIdStr)?.has(studentIdStr)) {
        enrollments.push({
          studentId: student._id,
          offeringId: offering._id,
          status,
          enrolledAt: new Date('2025-08-01')
        });
        enrollmentMap.get(offeringIdStr)?.add(studentIdStr);
      }
    }
  }

  // Pass 2: Ensure each offering has at least 10 students (cross-department electives)
  for (const offering of activeOfferings) {
    const offeringIdStr = offering._id.toString();
    const currentEnrollments = enrollmentMap.get(offeringIdStr) || new Set();
    const course = await Course.findById(offering.courseId);

    if (currentEnrollments.size < 10 && course) {
      const needed = 10 - currentEnrollments.size;

      // Find students from other departments to enroll as electives
      const availableStudents: any[] = [];
      for (const student of students) {
        const studentDoc = student;
        if (!studentDoc) continue;

        // Skip if already enrolled or same department (already handled in pass 1)
        const studentIdStr = student._id.toString();
        if (currentEnrollments.has(studentIdStr)) continue;
        if (studentDoc.departmentId.toString() === course.departmentId.toString()) continue;

        // Check if elective
        const isElective = course.elective === true;
        if (isElective || Math.random() > 0.7) {
          availableStudents.push({ student, studentDoc });
        }

        if (availableStudents.length >= needed) break;
      }

      // Enroll additional students
      const toEnroll = availableStudents.slice(0, needed);
      for (const { student } of toEnroll) {
        const term = createdTerms.find(t => t._id.toString() === offering.termId.toString());
        const status = term && term.status === TermStatus.COMPLETED
          ? (Math.random() > 0.15 ? EnrollmentStatus.COMPLETED : EnrollmentStatus.FAILED)
          : EnrollmentStatus.ENROLLED;

        enrollments.push({
          studentId: student._id,
          offeringId: offering._id,
          status,
          enrolledAt: new Date('2025-08-01')
        });
        enrollmentMap.get(offeringIdStr)?.add(student._id.toString());
      }
    }
  }

  // Log enrollment stats
  console.log('📊 Enrollment Distribution:');
  for (const offering of activeOfferings) {
    const count = enrollmentMap.get(offering._id.toString())?.size || 0;
    const course = await Course.findById(offering.courseId);
    console.log(`   ${course?.code || 'Unknown'}: ${count} students`);
  }

  const createdEnrollments = await Enrollment.insertMany(enrollments);
  console.log(`✅ Created ${createdEnrollments.length} enrollments`);
  return createdEnrollments;
};

// Seed sessions
const seedSessions = async (offerings: any[], createdTerms: any[]) => {
  console.log('🕐 Seeding sessions...');

  const activeTerm = createdTerms.find(t => t.status === TermStatus.ACTIVE);
  if (!activeTerm) {
    console.log('⚠️  No active term found, skipping session creation');
    return [];
  }

  const activeOfferings = offerings.filter(o =>
    o.termId.toString() === activeTerm._id.toString()
  );

  const sessions = [];
  const sessionDates = [
    new Date('2025-08-18'),
    new Date('2025-08-20'),
    new Date('2025-08-22'),
    new Date('2025-08-25'),
    new Date('2025-08-27'),
    new Date('2025-09-01'),
    new Date('2025-09-03'),
    new Date('2025-09-05')
  ];

  for (const offering of activeOfferings) {
    for (const date of sessionDates) {
      if (Math.random() > 0.2) {
        const isCompleted = date < new Date('2025-09-01');
        sessions.push({
          offeringId: offering._id,
          date,
          startTime: offering.schedule?.startTime || '09:00',
          endTime: offering.schedule?.endTime || '10:30',
          location: offering.schedule?.location || 'Room 101',
          status: isCompleted ? SessionStatus.COMPLETED : SessionStatus.SCHEDULED
        });
      }
    }
  }

  const createdSessions = await Session.insertMany(sessions);
  console.log(`✅ Created ${createdSessions.length} sessions`);
  return createdSessions;
};

// Seed attendance records
const seedAttendanceRecords = async (
  sessions: any[],
  enrollments: any[]
) => {
  console.log('✅ Seeding attendance records...');

  const completedSessions = sessions.filter(s => s.status === SessionStatus.COMPLETED);
  const records = [];

  for (const session of completedSessions) {
    const sessionEnrollments = enrollments.filter(e =>
      e.offeringId.toString() === session.offeringId.toString() &&
      e.status === EnrollmentStatus.ENROLLED
    );

    for (const enrollment of sessionEnrollments) {
      const present = Math.random() > 0.15; // 85% attendance rate
      records.push({
        sessionId: session._id,
        studentId: enrollment.studentId,
        status: present ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
        markedBy: (await OfferingFaculty.findOne({ offeringId: session.offeringId }))?.facultyId,
        remarks: present ? '' : 'Absent without prior information'
      });
    }
  }

  const createdRecords = await AttendanceRecord.insertMany(records);
  console.log(`✅ Created ${createdRecords.length} attendance records`);
  return createdRecords;
};

// Main seed function
const seed = async () => {
  try {
    console.log('🌱 Starting database seed...\n');

    // Connect to database
    await connectDatabase();

    // Clear existing data if requested
    if (CLEAR_BEFORE_SEED) {
      await clearDatabase();
      console.log('');
    }

    // Check if data already exists
    const existingDepts = await Department.countDocuments();
    if (existingDepts > 0 && !CLEAR_BEFORE_SEED) {
      console.log('⚠️  Database already contains data. Set CLEAR_BEFORE_SEED=true to clear before seeding.');
      console.log('   Proceeding with incremental seed...\n');
    }

    // Seed in order
    const createdDepts = await seedDepartments();
    const deptMap = new Map(createdDepts.map(d => [d.code, d._id]));

    const createdTerms = await seedTerms();
    const createdCourses = await seedCourses(deptMap);
    const createdUsers = await seedUsers(deptMap);

    const facultyUsers = createdUsers.filter(u => u.role === UserRole.FACULTY);
    const studentUsers = createdUsers.filter(u => u.role === UserRole.STUDENT);

    const createdFaculty = await seedFaculty(facultyUsers, deptMap);
    const createdStudents = await seedStudents(studentUsers, deptMap);

    const createdOfferings = await seedCourseOfferings(
      createdCourses,
      createdTerms,
      createdFaculty
    );

    await seedFacultyAssignments(createdOfferings, createdFaculty);
    const createdEnrollments = await seedEnrollments(createdOfferings, createdStudents, createdTerms);
    const createdSessions = await seedSessions(createdOfferings, createdTerms);
    await seedAttendanceRecords(createdSessions, createdEnrollments);

    console.log('\n✨ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Departments: ${createdDepts.length}`);
    console.log(`   - Terms: ${createdTerms.length}`);
    console.log(`   - Courses: ${createdCourses.length}`);
    console.log(`   - Users: ${createdUsers.length}`);
    console.log(`   - Faculty: ${createdFaculty.length}`);
    console.log(`   - Students: ${createdStudents.length}`);
    console.log(`   - Course Offerings: ${createdOfferings.length}`);
    console.log(`   - Enrollments: ${createdEnrollments.length}`);
    console.log(`   - Sessions: ${createdSessions.length}`);
    console.log(`\n🔐 Default password for all users: ${SEED_PASSWORD}`);
    console.log(`\n📧 Super Admin Email: superadmin@erp.edu`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
};

// Run seed
seed();
