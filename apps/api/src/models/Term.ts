import mongoose, { Schema, Document, Model } from 'mongoose';

// Term status enum
export enum TermStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Term interface
interface ITerm extends Document {
  name: string;
  startDate: Date;
  endDate: Date;
  status: TermStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Term schema
const TermSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Term name is required'],
      trim: true,
      maxlength: [100, 'Term name cannot exceed 100 characters']
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function(this: ITerm, value: Date) {
          return value > this.startDate;
        },
        message: 'End date must be after start date'
      }
    },
    status: {
      type: String,
      enum: {
        values: Object.values(TermStatus),
        message: '{VALUE} is not a valid term status'
      },
      required: [true, 'Status is required'],
      default: TermStatus.UPCOMING
    }
  },
  {
    timestamps: true,
    collection: 'terms'
  }
);

// Indexes
TermSchema.index({ status: 1 });
TermSchema.index({ startDate: 1, endDate: 1 });

// Virtual for course offerings in this term
TermSchema.virtual('offerings', {
  ref: 'CourseOffering',
  localField: '_id',
  foreignField: 'termId'
});

// Pre-save middleware to prevent overlapping terms
TermSchema.pre('save', async function(next) {
  const term = this as ITerm;
  
  // Check for overlapping terms
  const overlappingTerm = await Term.findOne({
    _id: { $ne: term._id },
    status: { $ne: TermStatus.CANCELLED },
    $or: [
      {
        startDate: { $lte: term.endDate },
        endDate: { $gte: term.startDate }
      }
    ]
  });
  
  if (overlappingTerm) {
    next(new Error('Term dates overlap with an existing term'));
  } else {
    next();
  }
});

// Export Term model
export const Term: Model<ITerm> = mongoose.model<ITerm>('Term', TermSchema);

// Export types
export type { ITerm };
