import { Teacher, Class, Subject, Schedule, DAYS, PERIODS } from '../types';
import { TimeConstraint } from '../types/constraints';

export interface ScheduleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  constraintViolations: string[];
}

// Check if a schedule slot violates any time constraints
export const checkConstraintViolations = (
  mode: 'teacher' | 'class',
  day: string,
  period: string,
  teacherId?: string,
  classId?: string,
  constraints: TimeConstraint[] = []
): string[] => {
  const violations: string[] = [];

  if (mode === 'teacher' && teacherId) {
    // Check teacher constraints
    const teacherConstraints = constraints.filter(c => 
      c.entityType === 'teacher' && 
      c.entityId === teacherId && 
      c.day === day && 
      c.period === period
    );

    teacherConstraints.forEach(constraint => {
      if (constraint.constraintType === 'unavailable') {
        violations.push(`Öğretmen ${day} günü ${period}. ders saatinde müsait değil`);
      } else if (constraint.constraintType === 'restricted') {
        violations.push(`Öğretmen ${day} günü ${period}. ders saatinde kısıtlı`);
      }
    });
  }

  if (mode === 'class' && classId) {
    // Check class constraints
    const classConstraints = constraints.filter(c => 
      c.entityType === 'class' && 
      c.entityId === classId && 
      c.day === day && 
      c.period === period
    );

    classConstraints.forEach(constraint => {
      if (constraint.constraintType === 'unavailable') {
        violations.push(`Sınıf ${day} günü ${period}. ders saatinde müsait değil`);
      } else if (constraint.constraintType === 'restricted') {
        violations.push(`Sınıf ${day} günü ${period}. ders saatinde kısıtlı`);
      }
    });
  }

  return violations;
};

// Enhanced schedule validation with constraint checking
export const validateScheduleWithConstraints = (
  mode: 'teacher' | 'class',
  currentSchedule: Schedule['schedule'],
  selectedId: string,
  allSchedules: Schedule[],
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[],
  constraints: TimeConstraint[] = []
): ScheduleValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const constraintViolations: string[] = [];

  // Basic validation
  if (!mode || !currentSchedule || !selectedId) {
    errors.push('Geçersiz program verisi');
    return { isValid: false, errors, warnings, constraintViolations };
  }

  // Check each slot for constraint violations
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = currentSchedule[day]?.[period];
      if (!slot || slot.classId === 'fixed-period') return;

      if (mode === 'teacher' && slot.classId) {
        // Check teacher and class constraints
        const violations = checkConstraintViolations(
          'teacher',
          day,
          period,
          selectedId,
          slot.classId,
          constraints
        );
        constraintViolations.push(...violations);

        // Also check class constraints
        const classViolations = checkConstraintViolations(
          'class',
          day,
          period,
          selectedId,
          slot.classId,
          constraints
        );
        constraintViolations.push(...classViolations);

      } else if (mode === 'class' && slot.teacherId) {
        // Check teacher and class constraints
        const violations = checkConstraintViolations(
          'class',
          day,
          period,
          slot.teacherId,
          selectedId,
          constraints
        );
        constraintViolations.push(...violations);

        // Also check teacher constraints
        const teacherViolations = checkConstraintViolations(
          'teacher',
          day,
          period,
          slot.teacherId,
          selectedId,
          constraints
        );
        constraintViolations.push(...teacherViolations);
      }
    });
  });

  // Check for preferred time slots (warnings)
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = currentSchedule[day]?.[period];
      if (!slot || slot.classId === 'fixed-period') return;

      if (mode === 'teacher' && selectedId) {
        const preferredConstraints = constraints.filter(c => 
          c.entityType === 'teacher' && 
          c.entityId === selectedId && 
          c.constraintType === 'preferred'
        );

        const hasPreferredSlot = preferredConstraints.some(c => c.day === day && c.period === period);
        const hasAnyPreferred = preferredConstraints.length > 0;
        
        if (hasAnyPreferred && !hasPreferredSlot) {
          warnings.push(`${day} ${period}. ders tercih edilen zaman dilimi değil`);
        }
      }
    });
  });

  return {
    isValid: errors.length === 0 && constraintViolations.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    constraintViolations: [...new Set(constraintViolations)]
  };
};

// Get constraint recommendations for optimal scheduling
export const getConstraintRecommendations = (
  entityType: 'teacher' | 'class',
  entityId: string,
  constraints: TimeConstraint[]
): { preferred: string[], avoid: string[], restricted: string[] } => {
  const entityConstraints = constraints.filter(c => 
    c.entityType === entityType && c.entityId === entityId
  );

  const preferred: string[] = [];
  const avoid: string[] = [];
  const restricted: string[] = [];

  entityConstraints.forEach(constraint => {
    const timeSlot = `${constraint.day} ${constraint.period}. ders`;
    
    switch (constraint.constraintType) {
      case 'preferred':
        preferred.push(timeSlot);
        break;
      case 'unavailable':
        avoid.push(timeSlot);
        break;
      case 'restricted':
        restricted.push(timeSlot);
        break;
    }
  });

  return { preferred, avoid, restricted };
};