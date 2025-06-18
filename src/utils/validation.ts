import { Teacher, Class, Subject, Schedule, DAYS, PERIODS } from '../types';
import { CONFLICT_MESSAGES, VALIDATION_ERRORS } from './messages';
import { ConflictResult, checkAllConflicts, summarizeConflicts } from './conflictDetection';
import { TimeConstraint } from '../types/constraints';
import { SubjectTeacherMapping } from '../types/wizard';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  message: string;
}

// SECURITY: Input sanitization function
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters
  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove HTML/script injection chars
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 500); // Limit length
};

// SECURITY: Email validation with domain restriction
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitizedEmail = sanitizeInput(email);
  
  // SECURITY: Only allow @ide.k12.tr domain
  return emailRegex.test(sanitizedEmail) && sanitizedEmail.endsWith('@ide.k12.tr');
};

// SECURITY: Teacher validation with sanitization
export const validateTeacher = (teacher: Partial<Teacher>): string[] => {
  const errors: string[] = [];
  
  // Sanitize inputs
  const name = teacher.name ? sanitizeInput(teacher.name) : '';
  const branch = teacher.branch ? sanitizeInput(teacher.branch) : '';
  
  // Validate name
  if (!name || name.length < 2) {
    errors.push(VALIDATION_ERRORS.MIN_LENGTH('Ad', 2));
  }
  
  if (name.length > 100) {
    errors.push(VALIDATION_ERRORS.MAX_LENGTH('Ad', 100));
  }
  
  // Check for suspicious patterns
  if (name && /<script|javascript:|on\w+=/i.test(name)) {
    errors.push('Geçersiz karakter tespit edildi');
  }
  
  // Validate branch
  if (!branch || branch.length < 2) {
    errors.push(VALIDATION_ERRORS.MIN_LENGTH('Branş', 2));
  }
  
  // Validate level
  const validLevels = ['Anaokulu', 'İlkokul', 'Ortaokul'];
  if (!teacher.level || !validLevels.includes(teacher.level)) {
    errors.push(VALIDATION_ERRORS.INVALID_SELECTION('seviye'));
  }
  
  return errors;
};

// SECURITY: Class validation with sanitization
export const validateClass = (classItem: Partial<Class>): string[] => {
  const errors: string[] = [];
  
  // Sanitize inputs
  const name = classItem.name ? sanitizeInput(classItem.name) : '';
  
  // Validate name
  if (!name || name.length < 1) {
    errors.push(VALIDATION_ERRORS.MIN_LENGTH('Sınıf adı', 1));
  }
  
  if (name.length > 50) {
    errors.push(VALIDATION_ERRORS.MAX_LENGTH('Sınıf adı', 50));
  }
  
  // Check for suspicious patterns
  if (name && /<script|javascript:|on\w+=/i.test(name)) {
    errors.push('Geçersiz karakter tespit edildi');
  }
  
  // Validate level
  const validLevels = ['Anaokulu', 'İlkokul', 'Ortaokul'];
  if (!classItem.level || !validLevels.includes(classItem.level)) {
    errors.push(VALIDATION_ERRORS.INVALID_SELECTION('seviye'));
  }
  
  return errors;
};

// SECURITY: Subject validation with sanitization
export const validateSubject = (subject: Partial<Subject>): string[] => {
  const errors: string[] = [];
  
  // Sanitize inputs
  const name = subject.name ? sanitizeInput(subject.name) : '';
  const branch = subject.branch ? sanitizeInput(subject.branch) : '';
  
  // Validate name
  if (!name || name.length < 2) {
    errors.push(VALIDATION_ERRORS.MIN_LENGTH('Ders adı', 2));
  }
  
  if (name.length > 100) {
    errors.push(VALIDATION_ERRORS.MAX_LENGTH('Ders adı', 100));
  }
  
  // Validate branch
  if (!branch || branch.length < 2) {
    errors.push(VALIDATION_ERRORS.MIN_LENGTH('Branş', 2));
  }
  
  // Validate weekly hours
  if (!subject.weeklyHours || subject.weeklyHours < 1 || subject.weeklyHours > 10) {
    errors.push('Haftalık ders saati 1-10 arasında olmalıdır');
  }
  
  // Check for suspicious patterns
  if ((name && /<script|javascript:|on\w+=/i.test(name)) || 
      (branch && /<script|javascript:|on\w+=/i.test(branch))) {
    errors.push('Geçersiz karakter tespit edildi');
  }
  
  return errors;
};

// FIXED: Real-time conflict detection for slot assignment - IMPROVED VERSION
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
  
  // SECURITY: Input validation
  if (!day || !period || !targetId || !currentEntityId) {
    return { hasConflict: true, message: 'Geçersiz parametre' };
  }
  
  // SECURITY: Sanitize inputs
  const sanitizedDay = sanitizeInput(day);
  const sanitizedPeriod = sanitizeInput(period);
  
  // SECURITY: Validate day and period
  if (!DAYS.includes(sanitizedDay) || !PERIODS.includes(sanitizedPeriod)) {
    return { hasConflict: true, message: 'Geçersiz gün veya ders saati' };
  }

  console.log('🔍 IMPROVED Çakışma kontrolü başlatıldı:', {
    mode,
    day: sanitizedDay,
    period: sanitizedPeriod,
    targetId,
    currentEntityId,
    schedulesCount: allSchedules.length
  });

  if (mode === 'teacher') {
    // FIXED: Teacher mode - Check if class is already assigned to another teacher at this time
    const conflictingSchedules = allSchedules.filter(schedule => {
      // Skip current teacher's schedule
      if (schedule.teacherId === currentEntityId) {
        return false;
      }
      
      const slot = schedule.schedule[sanitizedDay]?.[sanitizedPeriod];
      
      // Check if this slot has the same class assigned
      const hasConflict = slot?.classId === targetId && slot.classId !== 'fixed-period';
      
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
      const classItem = classes.find(c => c.id === targetId);
      
      const message = `${classItem?.name || 'Sınıf'} ${sanitizedDay} günü ${sanitizedPeriod}. ders saatinde ${conflictingTeacher?.name || 'başka bir öğretmen'} ile çakışıyor`;
      
      console.log('❌ Teacher mode çakışma mesajı:', message);
      
      return {
        hasConflict: true,
        message
      };
    }
  } else {
    // FIXED: Class mode - Check if teacher is already assigned to another class at this time
    const teacherSchedule = allSchedules.find(s => s.teacherId === targetId);
    
    console.log('🔍 Class mode - öğretmen programı kontrol ediliyor:', {
      teacherId: targetId,
      teacherScheduleFound: !!teacherSchedule,
      currentClassId: currentEntityId
    });
    
    if (teacherSchedule) {
      const existingSlot = teacherSchedule.schedule[sanitizedDay]?.[sanitizedPeriod];
      
      console.log('🔍 Mevcut slot kontrol ediliyor:', {
        day: sanitizedDay,
        period: sanitizedPeriod,
        existingSlot,
        existingClassId: existingSlot?.classId,
        currentClassId: currentEntityId,
        isFixedPeriod: existingSlot?.classId === 'fixed-period'
      });
      
      // FIXED: Check if teacher is already assigned to a different class (not fixed period)
      if (existingSlot?.classId && 
          existingSlot.classId !== currentEntityId && 
          existingSlot.classId !== 'fixed-period') {
        
        const teacher = teachers.find(t => t.id === targetId);
        const conflictingClass = classes.find(c => c.id === existingSlot.classId);
        
        const message = `${teacher?.name || 'Öğretmen'} ${sanitizedDay} günü ${sanitizedPeriod}. ders saatinde ${conflictingClass?.name || 'başka bir sınıf'} ile çakışıyor`;
        
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

// ENHANCED: Comprehensive schedule validation with conflict detection
export const validateSchedule = (
  mode: 'teacher' | 'class',
  currentSchedule: Schedule['schedule'],
  selectedId: string,
  allSchedules: Schedule[],
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[],
  constraints: TimeConstraint[] = [],
  mappings: SubjectTeacherMapping[] = []
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // SECURITY: Input validation
  if (!mode || !currentSchedule || !selectedId) {
    errors.push('Geçersiz program verisi');
    return { isValid: false, errors, warnings };
  }

  // SECURITY: Validate mode
  if (!['teacher', 'class'].includes(mode)) {
    errors.push('Geçersiz program modu');
    return { isValid: false, errors, warnings };
  }

  console.log('🔍 ENHANCED Program doğrulama başlatıldı:', {
    mode,
    selectedId,
    scheduleSlots: Object.keys(currentSchedule).length
  });

  // Tüm çakışmaları tespit et
  const allConflicts: ConflictResult[] = [];
  
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = currentSchedule[day]?.[period];
      if (!slot || slot.classId === 'fixed-period') return;

      // Tüm çakışma kontrollerini yap
      const conflicts = checkAllConflicts(
        slot.teacherId || '',
        slot.classId || '',
        slot.subjectId || '',
        day,
        period,
        allSchedules,
        teachers,
        classes,
        subjects,
        constraints,
        mappings
      );
      
      allConflicts.push(...conflicts);
    });
  });

  // Çakışma özetini al
  const summary = summarizeConflicts(allConflicts);
  
  // Hata ve uyarıları ekle
  errors.push(...summary.errorMessages);
  warnings.push(...summary.warningMessages);

  console.log('📊 ENHANCED Doğrulama sonuçları:', {
    isValid: !summary.hasBlockingConflict,
    errorsCount: summary.errorMessages.length,
    warningsCount: summary.warningMessages.length,
    errors,
    warnings
  });

  return {
    isValid: !summary.hasBlockingConflict,
    errors: [...new Set(errors)], // Remove duplicates
    warnings: [...new Set(warnings)] // Remove duplicates
  };
};

// Calculate weekly hours for a schedule
export const calculateWeeklyHours = (
  schedule: Schedule['schedule'],
  mode: 'teacher' | 'class'
): number => {
  let totalHours = 0;
  
  // SECURITY: Input validation
  if (!schedule || typeof schedule !== 'object') {
    return 0;
  }
  
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = schedule[day]?.[period];
      // Don't count fixed periods
      if (slot && slot.classId !== 'fixed-period') {
        if (mode === 'teacher' && slot.classId) {
          totalHours++;
        } else if (mode === 'class' && slot.teacherId) {
          totalHours++;
        }
      }
    });
  });
  
  return Math.min(totalHours, 50); // SECURITY: Cap at reasonable limit
};

// Calculate daily hours for each day
export const calculateDailyHours = (
  schedule: Schedule['schedule'],
  mode: 'teacher' | 'class'
): { [day: string]: number } => {
  const dailyHours: { [day: string]: number } = {};
  
  // SECURITY: Input validation
  if (!schedule || typeof schedule !== 'object') {
    return dailyHours;
  }
  
  DAYS.forEach(day => {
    let dayHours = 0;
    PERIODS.forEach(period => {
      const slot = schedule[day]?.[period];
      // Don't count fixed periods
      if (slot && slot.classId !== 'fixed-period') {
        if (mode === 'teacher' && slot.classId) {
          dayHours++;
        } else if (mode === 'class' && slot.teacherId) {
          dayHours++;
        }
      }
    });
    dailyHours[day] = Math.min(dayHours, 10); // SECURITY: Cap at reasonable limit
  });
  
  return dailyHours;
};

// Calculate subject distribution
export const calculateSubjectDistribution = (
  schedule: Schedule['schedule'],
  subjects: Subject[]
): { [subjectId: string]: { count: number; name: string } } => {
  const distribution: { [subjectId: string]: { count: number; name: string } } = {};
  
  // SECURITY: Input validation
  if (!schedule || typeof schedule !== 'object') {
    return distribution;
  }
  
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = schedule[day]?.[period];
      if (slot && slot.subjectId && slot.classId !== 'fixed-period') {
        const subject = subjects.find(s => s.id === slot.subjectId);
        if (!distribution[slot.subjectId]) {
          distribution[slot.subjectId] = { 
            count: 0, 
            name: subject?.name || 'Bilinmeyen Ders' 
          };
        }
        distribution[slot.subjectId].count++;
      }
    });
  });
  
  return distribution;
};

// Check if weekly hours match the target for each subject
export const validateWeeklyHourLimits = (
  schedule: Schedule['schedule'],
  mappings: SubjectTeacherMapping[],
  classId: string
): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // SECURITY: Input validation
  if (!schedule || typeof schedule !== 'object') {
    errors.push('Geçersiz program verisi');
    return { isValid: false, errors, warnings };
  }
  
  // Her ders için haftalık saat sayısını hesapla
  const subjectHours: { [subjectId: string]: number } = {};
  
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = schedule[day]?.[period];
      if (slot && slot.subjectId && slot.classId !== 'fixed-period') {
        if (!subjectHours[slot.subjectId]) {
          subjectHours[slot.subjectId] = 0;
        }
        subjectHours[slot.subjectId]++;
      }
    });
  });
  
  // Her ders için hedef saat sayısını kontrol et
  Object.entries(subjectHours).forEach(([subjectId, hours]) => {
    const mapping = mappings.find(m => 
      m.subjectId === subjectId && 
      m.classId === classId
    );
    
    if (mapping) {
      if (hours > mapping.weeklyHours) {
        errors.push(`${subjectId} dersi için haftalık saat limiti aşıldı: ${hours}/${mapping.weeklyHours}`);
      } else if (hours < mapping.weeklyHours) {
        warnings.push(`${subjectId} dersi için haftalık saat hedefine ulaşılamadı: ${hours}/${mapping.weeklyHours}`);
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};