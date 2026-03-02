import mongoose, { Schema, Document, Model } from 'mongoose';

// Course interface
interface ICourse extends Document {
  name: string;
  code: string;
  description?: string;
  credits: number;
  departmentId: mongoose.Types.ObjectId;
  prerequisites?: mongoose.Types.ObjectId[];
  elective?: boolean;
  level?: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
  updatedAt: Date;
}

// Course schema
const CourseSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      maxlength: [200, 'Course name cannot exceed 200 characters']
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      trim: true,
      maxlength: [20, 'Course code cannot exceed 20 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: [1, 'Credits must be at least 1'],
      max: [10, 'Credits cannot exceed 10']
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required']
    },
    prerequisites: {
      type: [Schema.Types.ObjectId],
      ref: 'Course',
      default: [],
      validate: {
        validator: function(this: ICourse, prereqs: mongoose.Types.ObjectId[]) {
          // Prevent circular prerequisites
          const checkCircular = async (courseId: string, visited: Set<string>): Promise<boolean> => {
            if (visited.has(courseId)) {
              return true; // Circular reference detected
            }

            visited.add(courseId);
            const course = await Course.findById(courseId);

            if (!course || !course.prerequisites || course.prerequisites.length === 0) {
              return false;
            }

            for (const prereqId of course.prerequisites) {
              if (await checkCircular(prereqId.toString(), visited)) {
                return true;
              }
            }

            return false;
          };

          // Only check on save, not on validation
          return true;
        },
        message: 'Circular prerequisite detected'
      }
    },
    elective: {
      type: Boolean,
      default: false
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    }
  },
  {
    timestamps: true,
    collection: 'courses'
  }
);

// Indexes
// Compound index for unique course code within department
CourseSchema.index({ departmentId: 1, code: 1 }, { unique: true });
CourseSchema.index({ departmentId: 1 });
CourseSchema.index({ name: 1 });

// Virtual for department details
CourseSchema.virtual('department', {
  ref: 'Department',
  localField: 'departmentId',
  foreignField: '_id',
  justOne: true
});

// Virtual for course offerings
CourseSchema.virtual('offerings', {
  ref: 'CourseOffering',
  localField: '_id',
  foreignField: 'courseId'
});

// Virtual for prerequisites
CourseSchema.virtual('prerequisiteCourses', {
  ref: 'Course',
  localField: 'prerequisites',
  foreignField: '_id'
});

// Pre-save middleware to check circular prerequisites
CourseSchema.pre('save', async function(next) {
  const course = this as ICourse;

  if (course.prerequisites && course.prerequisites.length > 0) {
    // Check if any prerequisite is the course itself
    if (course.prerequisites.some(prereq => prereq.equals(course._id))) {
      return next(new Error('Course cannot be a prerequisite of itself'));
    }

    // Check for circular references
    const checkCircular = async (courseId: string, visited: Set<string>): Promise<boolean> => {
      if (visited.has(courseId)) {
        return true; // Circular reference detected
      }

      visited.add(courseId);
      const prereqCourse = await Course.findById(courseId).lean();

      if (!prereqCourse || !prereqCourse.prerequisites || prereqCourse.prerequisites.length === 0) {
        return false;
      }

      for (const prereqId of prereqCourse.prerequisites) {
        if (await checkCircular(prereqId.toString(), visited)) {
          return true;
        }
      }

      return false;
    };

    for (const prereqId of course.prerequisites) {
      const visited = new Set<string>();
      if (await checkCircular(prereqId.toString(), visited)) {
        return next(new Error('Circular prerequisite chain detected'));
      }
    }
  }

  next();
});

// Export Course model
export const Course: Model<ICourse> = mongoose.model<ICourse>('Course', CourseSchema);

// Type-only export
export type { ICourse };
