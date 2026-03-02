import mongoose, { Schema, Document, Model } from 'mongoose';

// Faculty role enum for course offerings
export enum FacultyRole {
  PRIMARY = 'primary',
  SECONDARY = 'secondary'
}

// Offering Faculty interface
interface IOfferingFaculty extends Document {
  facultyId: mongoose.Types.ObjectId;
  offeringId: mongoose.Types.ObjectId;
  role: FacultyRole;
  assignedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Offering Faculty schema
const OfferingFacultySchema: Schema = new Schema(
  {
    facultyId: {
      type: Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Faculty reference is required']
    },
    offeringId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseOffering',
      required: [true, 'Course offering reference is required']
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: [FacultyRole.PRIMARY, FacultyRole.SECONDARY],
        message: '{VALUE} is not a valid faculty role'
      },
      default: FacultyRole.SECONDARY
    },
    assignedAt: {
      type: Date,
      required: [true, 'Assigned date is required'],
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'offering_faculty'
  }
);

// Compound unique index on facultyId and offeringId - prevents duplicate assignments
OfferingFacultySchema.index({ facultyId: 1, offeringId: 1 }, { unique: true });

// Index for offering-based queries
OfferingFacultySchema.index({ offeringId: 1 });

// Index for faculty-based queries
OfferingFacultySchema.index({ facultyId: 1 });

// Compound index for role-based queries
OfferingFacultySchema.index({ offeringId: 1, role: 1 });

// Virtual for faculty details
OfferingFacultySchema.virtual('faculty', {
  ref: 'Faculty',
  localField: 'facultyId',
  foreignField: '_id',
  justOne: true
});

// Virtual for course offering details
OfferingFacultySchema.virtual('offering', {
  ref: 'CourseOffering',
  localField: 'offeringId',
  foreignField: '_id',
  justOne: true
});

// Export Offering Faculty model
export const OfferingFaculty: Model<IOfferingFaculty> = mongoose.model<IOfferingFaculty>('OfferingFaculty', OfferingFacultySchema);

// Type exports
export type { IOfferingFaculty };
