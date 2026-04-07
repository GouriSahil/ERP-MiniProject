import mongoose, { Schema, Document, Model } from 'mongoose';

// Schedule interface
export interface ICourseOfferingSchedule {
  days?: string[];
  startTime?: string;
  endTime?: string;
  location?: string;
}

// Course Offering interface
interface ICourseOffering extends Document {
  courseId: mongoose.Types.ObjectId;
  termId: mongoose.Types.ObjectId;
  capacity: number;
  schedule?: ICourseOfferingSchedule;
  createdAt: Date;
  updatedAt: Date;
}

// Schedule sub-schema
const ScheduleSchema: Schema = new Schema({
  days: {
    type: [String],
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },
  startTime: {
    type: String,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/
  },
  endTime: {
    type: String,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100
  }
}, { _id: false });

// Course Offering schema
const CourseOfferingSchema: Schema = new Schema(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required']
    },
    termId: {
      type: Schema.Types.ObjectId,
      ref: 'Term',
      required: [true, 'Term reference is required']
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [500, 'Capacity cannot exceed 500']
    },
    schedule: {
      type: ScheduleSchema
    }
  },
  {
    timestamps: true,
    collection: 'course_offerings'
  }
);

// Indexes
CourseOfferingSchema.index({ courseId: 1, termId: 1 });
CourseOfferingSchema.index({ termId: 1 });
CourseOfferingSchema.index({ capacity: 1 });

// Virtual for course details
CourseOfferingSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true
});

// Virtual for term details
CourseOfferingSchema.virtual('term', {
  ref: 'Term',
  localField: 'termId',
  foreignField: '_id',
  justOne: true
});

// Virtual for faculty assignments
CourseOfferingSchema.virtual('facultyAssignments', {
  ref: 'OfferingFaculty',
  localField: '_id',
  foreignField: 'offeringId'
});

// Virtual for enrollments
CourseOfferingSchema.virtual('enrollments', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'offeringId'
});

// Virtual for sessions
CourseOfferingSchema.virtual('sessions', {
  ref: 'Session',
  localField: '_id',
  foreignField: 'offeringId'
});

// Export Course Offering model
export const CourseOffering: Model<ICourseOffering> = mongoose.model<ICourseOffering>('CourseOffering', CourseOfferingSchema);

// Type exports
export type { ICourseOffering };
