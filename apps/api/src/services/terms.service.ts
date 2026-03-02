import mongoose, { ClientSession } from 'mongoose';
import { Term, ITerm, TermStatus, CourseOffering } from '../models';
import { AppError } from '../utils/errors';
import { validateDateRange } from '../utils/business-validation.utils';

/**
 * Terms Service
 * Handles business logic for academic term management with overlap validation
 */

export interface TermOverlapCheck {
  hasOverlap: boolean;
  overlappingTerms: Array<{
    termId: string;
    termName: string;
    startDate: Date;
    endDate: Date;
    status: string;
  }>;
}

export interface TermStats {
  totalOfferings: number;
  totalEnrolledStudents: number;
  activeOfferings: number;
}

/**
 * Check for term date overlaps (excluding cancelled terms)
 */
export const checkTermOverlap = async (
  startDate: Date,
  endDate: Date,
  excludeTermId?: string
): Promise<TermOverlapCheck> => {
  const query: any = {
    status: { $ne: TermStatus.CANCELLED },
    _id: { $ne: excludeTermId }
  };

  const allTerms = await Term.find(query).lean();

  const overlappingTerms: TermOverlapCheck['overlappingTerms'] = [];

  for (const term of allTerms) {
    // Check for date overlap
    // Two ranges [s1, e1] and [s2, e2] overlap if s1 <= e2 && e1 >= s2
    const hasOverlap = startDate <= term.endDate && endDate >= term.startDate;

    if (hasOverlap) {
      overlappingTerms.push({
        termId: term._id.toString(),
        termName: term.name,
        startDate: term.startDate,
        endDate: term.endDate,
        status: term.status
      });
    }
  }

  return {
    hasOverlap: overlappingTerms.length > 0,
    overlappingTerms
  };
};

/**
 * Create a new term with overlap validation
 */
export const createTerm = async (
  termData: {
    name: string;
    startDate: Date;
    endDate: Date;
    status?: TermStatus;
  },
  session?: ClientSession
): Promise<ITerm> => {
  // Validate date range
  const dateValidation = validateDateRange(termData.startDate, termData.endDate);

  if (!dateValidation.valid) {
    throw new AppError(dateValidation.error || 'Invalid date range', 400);
  }

  // Check for overlaps
  const overlapCheck = await checkTermOverlap(
    termData.startDate,
    termData.endDate
  );

  if (overlapCheck.hasOverlap) {
    const overlappingTermNames = overlapCheck.overlappingTerms
      .map(t => t.termName)
      .join(', ');

    throw new AppError(
      `Term dates overlap with existing term(s): ${overlappingTermNames}`,
      400
    );
  }

  // Create term
  const term = new Term({
    name: termData.name,
    startDate: termData.startDate,
    endDate: termData.endDate,
    status: termData.status || TermStatus.UPCOMING
  });

  if (session) {
    await term.save({ session });
  } else {
    await term.save();
  }

  return term;
};

/**
 * Update term with overlap validation
 */
export const updateTerm = async (
  termId: string,
  updateData: Partial<{
    name: string;
    startDate: Date;
    endDate: Date;
    status: TermStatus;
  }>,
  session?: ClientSession
): Promise<ITerm> => {
  const term = await Term.findById(termId);

  if (!term) {
    throw new AppError('Term not found', 404);
  }

  // If updating dates, validate and check for overlaps
  const newStartDate = updateData.startDate || term.startDate;
  const newEndDate = updateData.endDate || term.endDate;

  if (updateData.startDate !== undefined || updateData.endDate !== undefined) {
    // Validate date range
    const dateValidation = validateDateRange(newStartDate, newEndDate);

    if (!dateValidation.valid) {
      throw new AppError(dateValidation.error || 'Invalid date range', 400);
    }

    // Check for overlaps (excluding current term)
    const overlapCheck = await checkTermOverlap(
      newStartDate,
      newEndDate,
      termId
    );

    if (overlapCheck.hasOverlap) {
      const overlappingTermNames = overlapCheck.overlappingTerms
        .map(t => t.termName)
        .join(', ');

      throw new AppError(
        `Term dates would overlap with: ${overlappingTermNames}`,
        400
      );
    }

    term.startDate = newStartDate;
    term.endDate = newEndDate;
  }

  // Update other fields
  if (updateData.name) term.name = updateData.name;
  if (updateData.status) term.status = updateData.status;

  // Validate status transitions
  if (updateData.status) {
    const statusTransition = validateStatusTransition(term.status, updateData.status);

    if (!statusTransition.valid) {
      throw new AppError(statusTransition.error || 'Invalid status transition', 400);
    }

    term.status = updateData.status;
  }

  if (session) {
    await term.save({ session });
  } else {
    await term.save();
  }

  return term;
};

/**
 * Delete term (only if no offerings exist)
 */
export const deleteTerm = async (
  termId: string,
  session?: ClientSession
): Promise<void> => {
  const term = await Term.findById(termId);

  if (!term) {
    throw new AppError('Term not found', 404);
  }

  // Check for existing offerings
  const offeringCount = await CourseOffering.countDocuments({
    termId
  });

  if (offeringCount > 0) {
    throw new AppError(
      `Cannot delete term with ${offeringCount} course offering(s)`,
      400
    );
  }

  if (session) {
    await Term.deleteOne({ _id: termId }).session(session);
  } else {
    await Term.deleteOne({ _id: termId });
  }
};

/**
 * Validate status transition
 */
export const validateStatusTransition = (
  currentStatus: TermStatus,
  newStatus: TermStatus
): { valid: boolean; error?: string } => {
  // Define allowed transitions
  const allowedTransitions: Record<TermStatus, TermStatus[]> = {
    [TermStatus.UPCOMING]: [TermStatus.ACTIVE, TermStatus.CANCELLED],
    [TermStatus.ACTIVE]: [TermStatus.COMPLETED, TermStatus.CANCELLED],
    [TermStatus.COMPLETED]: [], // No transitions from completed
    [TermStatus.CANCELLED]: [] // No transitions from cancelled
  };

  const allowed = allowedTransitions[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    let message = `Cannot transition from ${currentStatus} to ${newStatus}`;

    if (currentStatus === TermStatus.COMPLETED) {
      message = 'Cannot modify completed term';
    } else if (currentStatus === TermStatus.CANCELLED) {
      message = 'Cannot modify cancelled term';
    }

    return {
      valid: false,
      error: message
    };
  }

  return {
    valid: true
  };
};

/**
 * Get active term
 */
export const getActiveTerm = async (): Promise<ITerm | null> => {
  return await Term.findOne({ status: TermStatus.ACTIVE }).sort({ startDate: -1 });
};

/**
 * Get current/upcoming term based on date
 */
export const getCurrentTerm = async (): Promise<ITerm | null> => {
  const now = new Date();

  return await Term.findOne({
    status: { $in: [TermStatus.ACTIVE, TermStatus.UPCOMING] },
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).sort({ startDate: -1 });
};

/**
 * Get term statistics
 */
export const getTermStats = async (termId: string): Promise<TermStats> => {
  const term = await Term.findById(termId);

  if (!term) {
    throw new AppError('Term not found', 404);
  }

  const offerings = await CourseOffering.find({ termId });

  // Get unique enrolled students across all offerings
  const Enrollment = mongoose.model('Enrollment');

  const uniqueStudents = await Enrollment.distinct('studentId', {
    offeringId: { $in: offerings.map(o => o._id) },
    status: 'enrolled'
  });

  return {
    totalOfferings: offerings.length,
    totalEnrolledStudents: uniqueStudents.length,
    activeOfferings: offerings.length // All offerings in a term are considered active
  };
};

/**
 * Activate a term (set to active and deactivate others)
 */
export const activateTerm = async (
  termId: string,
  session?: ClientSession
): Promise<ITerm> => {
  const term = await Term.findById(termId);

  if (!term) {
    throw new AppError('Term not found', 404);
  }

  // Check if term can be activated
  const now = new Date();
  if (term.startDate > now) {
    throw new AppError('Cannot activate term that has not started', 400);
  }

  if (term.endDate < now) {
    throw new AppError('Cannot activate term that has already ended', 400);
  }

  // Deactivate all currently active terms
  await Term.updateMany(
    { status: TermStatus.ACTIVE },
    { status: TermStatus.COMPLETED }
  );

  // Activate this term
  term.status = TermStatus.ACTIVE;

  if (session) {
    await term.save({ session });
  } else {
    await term.save();
  }

  return term;
};

/**
 * Complete a term
 */
export const completeTerm = async (
  termId: string,
  session?: ClientSession
): Promise<ITerm> => {
  const term = await Term.findById(termId);

  if (!term) {
    throw new AppError('Term not found', 404);
  }

  if (term.status !== TermStatus.ACTIVE) {
    throw new AppError('Only active terms can be completed', 400);
  }

  term.status = TermStatus.COMPLETED;

  if (session) {
    await term.save({ session });
  } else {
    await term.save();
  }

  return term;
};

/**
 * Cancel a term
 */
export const cancelTerm = async (
  termId: string,
  session?: ClientSession
): Promise<ITerm> => {
  const term = await Term.findById(termId);

  if (!term) {
    throw new AppError('Term not found', 404);
  }

  if (term.status === TermStatus.COMPLETED) {
    throw new AppError('Cannot cancel completed term', 400);
  }

  if (term.status === TermStatus.CANCELLED) {
    throw new AppError('Term is already cancelled', 400);
  }

  // Check if term has active enrollments
  const CourseOffering = mongoose.model('CourseOffering');
  const offerings = await CourseOffering.find({ termId });
  const offeringIds = offerings.map(o => o._id);

  const Enrollment = mongoose.model('Enrollment');
  const activeEnrollmentCount = await Enrollment.countDocuments({
    offeringId: { $in: offeringIds },
    status: 'enrolled'
  });

  if (activeEnrollmentCount > 0) {
    throw new AppError(
      `Cannot cancel term with ${activeEnrollmentCount} active enrollments`,
      400
    );
  }

  term.status = TermStatus.CANCELLED;

  if (session) {
    await term.save({ session });
  } else {
    await term.save();
  }

  return term;
};

/**
 * Get all terms sorted by date
 */
export const getAllTermsSorted = async (
  status?: TermStatus
): Promise<any[]> => {
  const query: any = {};

  if (status) {
    query.status = status;
  }

  return await Term.find(query)
    .sort({ startDate: -1 })
    .lean();
};

/**
 * Check if date falls within term
 */
export const isDateInTerm = async (date: Date, termId: string): Promise<boolean> => {
  const term = await Term.findById(termId);

  if (!term) {
    return false;
  }

  return date >= term.startDate && date <= term.endDate;
};

/**
 * Get term by date
 */
export const getTermByDate = async (date: Date): Promise<ITerm | null> => {
  return await Term.findOne({
    startDate: { $lte: date },
    endDate: { $gte: date },
    status: { $ne: TermStatus.CANCELLED }
  });
};
