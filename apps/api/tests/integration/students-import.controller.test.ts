/**
 * Students CSV Import Tests
 * Tests for CSV file upload and import functionality
 */

import { describe, it, expect } from 'bun:test';

// Sample valid CSV content
const validCSVContent = `name,email,password,rollNumber,departmentCode,batch,semester
John Doe,john@example.com,password123,CS001,CSE,2024,1
Jane Smith,jane@example.com,password123,CS002,CSE,2024,1
Bob Wilson,bob@example.com,password123,CS003,CSE,2024,2`;

// CSV with missing columns
const missingColumnsCSV = `name,email,password
John Doe,john@example.com,password123`;

// CSV with invalid email
const invalidEmailCSV = `name,email,password,rollNumber,departmentCode,batch,semester
John Doe,invalid-email,password123,CS001,CSE,2024,1`;

// CSV with short password
const shortPasswordCSV = `name,email,password,rollNumber,departmentCode,batch,semester
John Doe,john@example.com,short,CS001,CSE,2024,1`;

// CSV with duplicate roll numbers
const duplicateRollCSV = `name,email,password,rollNumber,departmentCode,batch,semester
John Doe,john1@example.com,password123,CS001,CSE,2024,1
Jane Smith,jane@example.com,password123,CS001,CSE,2024,1`;

describe('CSV Import Utilities', () => {
  describe('parseCSVBuffer', () => {
    it('should parse valid CSV content', () => {
      const buffer = Buffer.from(validCSVContent, 'utf-8');
      const { parseCSVBuffer } = require('../../src/utils/csv.util');

      const records = parseCSVBuffer(buffer);

      expect(records).toHaveLength(3);
      expect(records[0]).toMatchObject({
        name: 'John Doe',
        email: 'john@example.com',
        rollNumber: 'CS001'
      });
    });

    it('should handle empty CSV', () => {
      const buffer = Buffer.from('', 'utf-8');
      const { parseCSVBuffer, validateStudentCSV } = require('../../src/utils/csv.util');

      const records = parseCSVBuffer(buffer);
      const validation = validateStudentCSV(records);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual({
        row: 0,
        field: 'file',
        message: 'CSV file is empty'
      });
    });

    it('should trim whitespace from values', () => {
      const csvWithSpaces = `name, email, password, rollNumber, departmentCode, batch, semester
  John Doe  ,  john@example.com  , password123,  CS001  , CSE, 2024, 1`;
      const buffer = Buffer.from(csvWithSpaces, 'utf-8');
      const { parseCSVBuffer } = require('../../src/utils/csv.util');

      const records = parseCSVBuffer(buffer);

      expect(records[0].name).toBe('John Doe');
      expect(records[0].email).toBe('john@example.com');
      expect(records[0].rollNumber).toBe('CS001');
    });
  });

  describe('validateStudentCSV', () => {
    it('should pass validation for valid CSV', () => {
      const buffer = Buffer.from(validCSVContent, 'utf-8');
      const { parseCSVBuffer, validateStudentCSV } = require('../../src/utils/csv.util');

      const records = parseCSVBuffer(buffer);
      const validation = validateStudentCSV(records);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.rowCount).toBe(3);
    });

    it('should detect missing required columns', () => {
      const buffer = Buffer.from(missingColumnsCSV, 'utf-8');
      const { parseCSVBuffer, validateStudentCSV } = require('../../src/utils/csv.util');

      const records = parseCSVBuffer(buffer);
      const validation = validateStudentCSV(records);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Missing required columns'))).toBe(true);
    });

    it('should detect invalid email format', () => {
      const buffer = Buffer.from(invalidEmailCSV, 'utf-8');
      const { parseCSVBuffer, validateStudentCSV } = require('../../src/utils/csv.util');

      const records = parseCSVBuffer(buffer);
      const validation = validateStudentCSV(records);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'email' && e.message.includes('Invalid email'))).toBe(true);
    });

    it('should detect short password', () => {
      const buffer = Buffer.from(shortPasswordCSV, 'utf-8');
      const { parseCSVBuffer, validateStudentCSV } = require('../../src/utils/csv.util');

      const records = parseCSVBuffer(buffer);
      const validation = validateStudentCSV(records);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'password' && e.message.includes('at least 8 characters'))).toBe(true);
    });

    it('should detect missing required fields', () => {
      const csvWithEmpty = `name,email,password,rollNumber,departmentCode,batch,semester
,john@example.com,password123,CS001,CSE,2024,1`;
      const buffer = Buffer.from(csvWithEmpty, 'utf-8');
      const { parseCSVBuffer, validateStudentCSV } = require('../../src/utils/csv.util');

      const records = parseCSVBuffer(buffer);
      const validation = validateStudentCSV(records);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should validate semester range', () => {
      const invalidSemesterCSV = `name,email,password,rollNumber,departmentCode,batch,semester
John Doe,john@example.com,password123,CS001,CSE,2024,15`;
      const buffer = Buffer.from(invalidSemesterCSV, 'utf-8');
      const { parseCSVBuffer, validateStudentCSV } = require('../../src/utils/csv.util');

      const records = parseCSVBuffer(buffer);
      const validation = validateStudentCSV(records);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'semester' && e.message.includes('between 1 and 10'))).toBe(true);
    });

    it('should return all validation errors', () => {
      const multiErrorCSV = `name,email,password,rollNumber,departmentCode,batch,semester
,bad-email,short,TOOLONGCODETHATEXCEEDSLIMIT, ,a,not_a_number`;
      const buffer = Buffer.from(multiErrorCSV, 'utf-8');
      const { parseCSVBuffer, validateStudentCSV } = require('../../src/utils/csv.util');

      const records = parseCSVBuffer(buffer);
      const validation = validateStudentCSV(records);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(3);
    });
  });

  describe('transformCSVRowToStudentData', () => {
    it('should transform CSV row to student data', () => {
      const { transformCSVRowToStudentData } = require('../../src/utils/csv.util');
      const departmentId = '507f1f77bcf86cd799439011';

      const row = {
        name: '  John Doe  ',
        email: '  JOHN@EXAMPLE.COM  ',
        password: 'password123',
        rollNumber: '  cs001  ',
        departmentCode: 'CSE',
        batch: '2024',
        semester: '1'
      };

      const result = transformCSVRowToStudentData(row, departmentId);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.rollNumber).toBe('CS001');
      expect(result.departmentId).toBe(departmentId);
      expect(result.batch).toBe('2024');
      expect(result.semester).toBe(1);
      expect(result.password).toBe('password123');
    });
  });
});
