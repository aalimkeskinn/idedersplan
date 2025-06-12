import { Teacher, Class, Subject, Schedule, DAYS, PERIODS } from '../types';
import { CONFLICT_MESSAGES, VALIDATION_ERRORS } from './messages';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  message: string;
}

// Real-time conflict detection for slot assignment - FIXED VERSION
export const checkSlotConflict = (
  mode: 'teacher' | 'class',
  day: string,
  period: string,
  targetId: string, // classId for teacher mode, teacherId for class mode
  currentEntityId: string, // teacherId for teacher mode, classId for class mode
  allSchedules: Schedule[],
  teachers: Teacher[],
  classes: Class[]
): ConflictCheckResult => {
  console.log('🔍 Çakışma kontrolü başlatıldı:', {
    mode,
    day,
    period,
    targetId,
    currentEntityId,
    schedulesCount: allSchedules.length
  });

  if (mode === 'teacher') {
    // Teacher mode: Check if class is already assigned to another teacher at this time
    const conflictingSchedules = allSchedules.filter(schedule => {
      const slot = schedule.schedule[day]?.[period];
      const hasConflict = schedule.teacherId !== currentEntityId && slot?.classId === targetId;
      
      if (hasConflict) {
        console.log('⚠️ Teacher mode çakışma bulundu:', {
          conflictingTeacherId: schedule.teacherId,
          currentTeacherId: currentEntityId,
          classId: targetId,
          slot
        });
      }
      
      return hasConflict;
    });
    
    if (conflictingSchedules.length > 0) {
      const conflictingSchedule = conflictingSchedules[0];
      const conflictingTeacher = teachers.find(t => t.id === conflictingSchedule.teacherId);
      const className = classes.find(c => c.id === targetId)?.name || 'Bilinmeyen Sınıf';
      
      const message = `${className} sınıfı ${day} günü ${period}. ders saatinde ${conflictingTeacher?.name || 'başka bir öğretmen'} ile çakışıyor`;
      
      console.log('❌ Teacher mode çakışma mesajı:', message);
      
      return {
        hasConflict: true,
        message
      };
    }
  } else {
    // Class mode: Check if teacher is already assigned to another class at this time
    const teacherSchedule = allSchedules.find(s => s.teacherId === targetId);
    
    console.log('🔍 Class mode - öğretmen programı kontrol ediliyor:', {
      teacherId: targetId,
      teacherScheduleFound: !!teacherSchedule,
      currentClassId: currentEntityId
    });
    
    if (teacherSchedule) {
      const existingSlot = teacherSchedule.schedule[day]?.[period];
      
      console.log('🔍 Mevcut slot kontrol ediliyor:', {
        day,
        period,
        existingSlot,
        existingClassId: existingSlot?.classId,
        currentClassId: currentEntityId
      });
      
      if (existingSlot?.classId && existingSlot.classId !== currentEntityId) {
        const teacherName = teachers.find(t => t.id === targetId)?.name || 'Bilinmeyen Öğretmen';
        const conflictingClass = classes.find(c => c.id === existingSlot.classId)?.name || 'Bilinmeyen Sınıf';
        
        const message = `${teacherName} öğretmeni ${day} günü ${period}. ders saatinde ${conflictingClass} sınıfı ile çakışıyor`;
        
        console.log('❌ Class mode çakışma mesajı:', message);
        
        return {
          hasConflict: true,
          message
        };
      }
    }
  }

  console.log('✅ Çakışma bulunamadı');
  return { hasConflict: false, message: '' };
};

// Enhanced schedule validation with detailed conflict detection
export const validateSchedule = (
  mode: 'teacher' | 'class',
  currentSchedule: Schedule['schedule'],
  selectedId: string,
  allSchedules: Schedule[],
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[]
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('🔍 Program doğrulama başlatıldı:', {
    mode,
    selectedId,
    scheduleSlots: Object.keys(currentSchedule).length
  });

  // Calculate weekly and daily hours
  const weeklyHours = calculateWeeklyHours(currentSchedule, mode);
  const dailyHours = calculateDailyHours(currentSchedule, mode);

  // Check weekly hour limits
  if (weeklyHours > 30) {
    errors.push('Haftalık ders saati 30\'u geçemez');
  }

  // Check daily hour limits
  DAYS.forEach(day => {
    const dayHours = dailyHours[day] || 0;
    if (dayHours > 9) {
      errors.push(`${day} günü için günlük ders saati 9'u geçemez (şu an: ${dayHours})`);
    }
  });

  // Comprehensive conflict detection
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = currentSchedule[day]?.[period];
      if (!slot) return;

      if (mode === 'teacher' && slot.classId) {
        const conflictResult = checkSlotConflict(
          'teacher',
          day,
          period,
          slot.classId,
          selectedId,
          allSchedules,
          teachers,
          classes
        );
        
        if (conflictResult.hasConflict) {
          errors.push(conflictResult.message);
        }
      } else if (mode === 'class' && slot.teacherId) {
        const conflictResult = checkSlotConflict(
          'class',
          day,
          period,
          slot.teacherId,
          selectedId,
          allSchedules,
          teachers,
          classes
        );
        
        if (conflictResult.hasConflict) {
          errors.push(conflictResult.message);
        }
      }

      // Check level and branch compatibility
      const compatibilityIssues = checkCompatibility(slot, teachers, classes, subjects);
      warnings.push(...compatibilityIssues);
    });
  });

  console.log('📊 Doğrulama sonuçları:', {
    isValid: errors.length === 0,
    errorsCount: errors.length,
    warningsCount: warnings.length,
    errors,
    warnings
  });

  return {
    isValid: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)]
  };
};

// Check level and branch compatibility
const checkCompatibility = (
  slot: any,
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[]
): string[] => {
  const warnings: string[] = [];

  if (slot.teacherId && slot.classId) {
    const teacher = teachers.find(t => t.id === slot.teacherId);
    const classItem = classes.find(c => c.id === slot.classId);

    if (teacher && classItem) {
      // Check level compatibility
      if (teacher.level !== classItem.level) {
        warnings.push(`${teacher.name} (${teacher.level}) ile ${classItem.name} (${classItem.level}) seviye uyumsuzluğu`);
      }
    }
  }

  if (slot.teacherId && slot.subjectId) {
    const teacher = teachers.find(t => t.id === slot.teacherId);
    const subject = subjects.find(s => s.id === slot.subjectId);

    if (teacher && subject) {
      // Check branch compatibility
      if (teacher.branch !== subject.branch) {
        warnings.push(`${teacher.name} (${teacher.branch}) ile ${subject.name} (${subject.branch}) branş uyumsuzluğu`);
      }
    }
  }

  return warnings;
};

// Calculate weekly hours for a schedule
const calculateWeeklyHours = (
  schedule: Schedule['schedule'],
  mode: 'teacher' | 'class'
): number => {
  let totalHours = 0;
  
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = schedule[day]?.[period];
      if (mode === 'teacher' && slot?.classId) {
        totalHours++;
      } else if (mode === 'class' && slot?.teacherId) {
        totalHours++;
      }
    });
  });
  
  return totalHours;
};

// Calculate daily hours for each day
const calculateDailyHours = (
  schedule: Schedule['schedule'],
  mode: 'teacher' | 'class'
): { [day: string]: number } => {
  const dailyHours: { [day: string]: number } = {};
  
  DAYS.forEach(day => {
    let dayHours = 0;
    PERIODS.forEach(period => {
      const slot = schedule[day]?.[period];
      if (mode === 'teacher' && slot?.classId) {
        dayHours++;
      } else if (mode === 'class' && slot?.teacherId) {
        dayHours++;
      }
    });
    dailyHours[day] = dayHours;
  });
  
  return dailyHours;
};