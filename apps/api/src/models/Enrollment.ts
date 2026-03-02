import mongoose, { Schema, Document, Model } from 'mongoose';

// Enrollment status enum
export enum EnrollmentStatus {
  ENROLLED = 'enrolled',
  DROPPED = 'dropped',
  COMPLETED = 'completed',
  FAILED = 'failed',
  INCOMPLETE = 'incomplete'
}

// Enrollment interface
interface IEnrollment extends Document {
  studentId: mongoose.Types.ObjectId;
  offeringId: mongoose.Types.ObjectId;
  status: EnrollmentStatus;
  enrolledAt: Date;
  droppedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Enrollment schema
const EnrollmentSchema: Schema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required']
    },
    offeringId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseOffering',
      required: [true, 'Offering reference is required']
    },
    status: {
      type: String,
      enum: {
        values: Object.values(EnrollmentStatus),
        message: '{VALUE} is not a valid enrollment status'
      },
      required: [true, 'Status is required'],
      default: EnrollmentStatus.ENROLLED
    },
    enrolledAt: {
      type: Date,
      required: [true, 'Enrolled date is required'],
      default: Date.now
    },
    droppedAt: {
      type: Date,
      validate: {
        validator: function(this: IEnrollment, value: Date) {
          // droppedAt should only be set if status is DROPPED
          if (this.status === EnrollmentStatus.DROPPED) {
            return !!value;
          }
          return !value;
        },
        message: 'Dropped date is required when status is dropped'
      }
    }
  },
  {
    timestamps: true,
    collection: 'enrollments'
  }
);

// Indexes
// Compound index to prevent duplicate enrollments for same student and offering
EnrollmentSchema.index({ studentId: 1, offeringId: 1 }, { unique: true });
EnrollmentSchema.index({ studentId: 1 });
EnrollmentSchema.index({ offeringId: 1 });
EnrollmentSchema.index({ status: 1 });

// Pre-save middleware for enrollment validations
EnrollmentSchema.pre('save', async function(next) {
  const enrollment = this as IEnrollment;

  // Skip validation if just updating status
  if (!this.isNew) {
    return next();
  }

  // Check if offering exists and has capacity
  const CourseOffering = mongoose.model('CourseOffering');
  const offering = await CourseOffering.findById(enrollment.offeringId);

  if (!offering) {
    return next(new Error('Course offering not found'));
  }

  // Check capacity
  const Enrollment = mongoose.model('Enrollment');
  const currentEnrollments = await Enrollment.countDocuments({
    offeringId: enrollment.offeringId,
    status: EnrollmentStatus.ENROLLED
  });

  if (currentEnrollments >= offering.capacity) {
    return next(new Error('Course offering has reached maximum capacity'));
  }

  // Check if student exists
  const Student = mongoose.model('Student');
  const student = await Student.findById(enrollment.studentId);

  if (!student) {
    return next(new Error('Student not found'));
  }

  next();
});

// Virtual for student details
EnrollmentSchema.virtual('student', {
  ref: 'Student',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true
});

// Virtual for offering details
EnrollmentSchema.virtual('offering', {
  ref: 'CourseOffering',
  localField: 'offeringId',
  foreignField: '_id',
  justOne: true
});

// Export Enrollment model
export const Enrollment: Model<IEnrollment> = mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);

// Type exports
export type { IEnrollment };
