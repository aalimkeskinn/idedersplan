// CRITICAL: Enhanced Conflict Detection System
// Bu sistem, program oluşturma sırasında çakışmaları tespit eder ve önler

import { Teacher, Class, Subject, Schedule, DAYS, PERIODS } from '../types';
import { TimeConstraint } from '../types/constraints';
import { SubjectTeacherMapping } from '../types/wizard';

// CRITICAL: Çakışma türleri
export enum ConflictType {
  TEACHER_DOUBLE_BOOKING = 'teacher_double_booking',
  CLASS_DOUBLE_BOOKING = 'class_double_booking',
  CLASSROOM_DOUBLE_BOOKING = 'classroom_double_booking',
  TEACHER_UNAVAILABLE = 'teacher_unavailable',
  CLASS_UNAVAILABLE = 'class_unavailable',
  TEACHER_CLASS_LEVEL_MISMATCH = 'teacher_class_level_mismatch',
  TEACHER_SUBJECT_BRANCH_MISMATCH = 'teacher_subject_branch_mismatch',
  WEEKLY_HOURS_EXCEEDED = 'weekly_hours_exceeded',
  DAILY_HOURS_EXCEEDED = 'daily_hours_exceeded',
  CONSECUTIVE_HOURS_EXCEEDED = 'consecutive_hours_exceeded'
}

// CRITICAL: Çakışma sonucu
export interface ConflictResult {
  hasConflict: boolean;
  conflictType?: ConflictType;
  message: string;
  severity: 'error' | 'warning' | 'info';
  entities: {
    teacherId?: string;
    classId?: string;
    subjectId?: string;
    day?: string;
    period?: string;
  };
}

/**
 * Öğretmen çakışması kontrolü
 * Bir öğretmenin aynı anda birden fazla sınıfta ders vermesi durumunu kontrol eder
 */
export const checkTeacherConflict = (
  teacherId: string,
  day: string,
  period: string,
  allSchedules: Schedule[]
): ConflictResult => {
  
  // Sabit periyotları atla
  if (period === 'prep' || period === 'breakfast' || period === 'afternoon-breakfast') {
    return { 
      hasConflict: false, 
      message: '', 
      severity: 'info',
      entities: { teacherId, day, period }
    };
  }

  // İlkokul/Anaokulu için 5. ders, Ortaokul için 6. ders yemek saati
  if (period === '5' || period === '6') {
    const teacher = allSchedules.find(s => s.teacherId === teacherId);
    if (teacher) {
      const slot = teacher.schedule[day]?.[period];
      if (slot?.classId === 'fixed-period' && slot?.subjectId === 'fixed-lunch') {
        return { 
          hasConflict: false, 
          message: '', 
          severity: 'info',
          entities: { teacherId, day, period }
        };
      }
    }
  }

  console.log(`🔍 Öğretmen çakışması kontrolü: ${teacherId}, ${day}, ${period}`);

  // Bu öğretmenin bu gün ve saatte başka bir sınıfta dersi var mı?
  const conflictingSchedules = allSchedules.filter(schedule => {
    // Sadece bu öğretmenin programlarını kontrol et
    if (schedule.teacherId !== teacherId) {
      return false;
    }
    
    const slot = schedule.schedule[day]?.[period];
    
    // Slot varsa ve sabit periyot değilse çakışma var
    return slot && slot.classId !== 'fixed-period';
  });

  if (conflictingSchedules.length > 0) {
    const conflictingSchedule = conflictingSchedules[0];
    const conflictingSlot = conflictingSchedule.schedule[day][period];
    
    console.log(`⚠️ Öğretmen çakışması tespit edildi:`, {
      teacherId,
      day,
      period,
      conflictingClassId: conflictingSlot?.classId
    });
    
    return {
      hasConflict: true,
      conflictType: ConflictType.TEACHER_DOUBLE_BOOKING,
      message: `Öğretmen ${day} günü ${period}. ders saatinde başka bir sınıfta ders veriyor`,
      severity: 'error',
      entities: {
        teacherId,
        classId: conflictingSlot?.classId,
        day,
        period
      }
    };
  }

  return { 
    hasConflict: false, 
    message: '', 
    severity: 'info',
    entities: { teacherId, day, period }
  };
};

/**
 * Sınıf çakışması kontrolü
 * Bir sınıfın aynı anda birden fazla ders alması durumunu kontrol eder
 */
export const checkClassConflict = (
  classId: string,
  day: string,
  period: string,
  allSchedules: Schedule[]
): ConflictResult => {
  
  // Sabit periyotları atla
  if (period === 'prep' || period === 'breakfast' || period === 'afternoon-breakfast') {
    return { 
      hasConflict: false, 
      message: '', 
      severity: 'info',
      entities: { classId, day, period }
    };
  }

  // İlkokul/Anaokulu için 5. ders, Ortaokul için 6. ders yemek saati
  if (period === '5' || period === '6') {
    // Sınıf programını bul
    for (const schedule of allSchedules) {
      const slot = schedule.schedule[day]?.[period];
      if (slot?.classId === classId && slot?.subjectId === 'fixed-lunch') {
        return { 
          hasConflict: false, 
          message: '', 
          severity: 'info',
          entities: { classId, day, period }
        };
      }
    }
  }

  console.log(`🔍 Sınıf çakışması kontrolü: ${classId}, ${day}, ${period}`);

  // Bu sınıfın bu gün ve saatte başka bir dersi var mı?
  const conflictingSchedules = allSchedules.filter(schedule => {
    // Tüm programlarda bu sınıfı ara
    const slot = schedule.schedule[day]?.[period];
    
    // Slot varsa, bu sınıfa aitse ve sabit periyot değilse çakışma var
    return slot && slot.classId === classId && slot.classId !== 'fixed-period';
  });

  if (conflictingSchedules.length > 0) {
    const conflictingSchedule = conflictingSchedules[0];
    const conflictingSlot = conflictingSchedule.schedule[day][period];
    
    console.log(`⚠️ Sınıf çakışması tespit edildi:`, {
      classId,
      day,
      period,
      conflictingTeacherId: conflictingSchedule.teacherId
    });
    
    return {
      hasConflict: true,
      conflictType: ConflictType.CLASS_DOUBLE_BOOKING,
      message: `Sınıf ${day} günü ${period}. ders saatinde başka bir ders alıyor`,
      severity: 'error',
      entities: {
        classId,
        teacherId: conflictingSchedule.teacherId,
        subjectId: conflictingSlot?.subjectId,
        day,
        period
      }
    };
  }

  return { 
    hasConflict: false, 
    message: '', 
    severity: 'info',
    entities: { classId, day, period }
  };
};

/**
 * Öğretmen uygunluk kontrolü
 * Bir öğretmenin belirli bir gün ve saatte müsait olup olmadığını kontrol eder
 */
export const checkTeacherAvailability = (
  teacherId: string,
  day: string,
  period: string,
  constraints: TimeConstraint[]
): ConflictResult => {
  
  console.log(`🔍 Öğretmen uygunluk kontrolü: ${teacherId}, ${day}, ${period}`);

  // Bu öğretmen için kısıtlamaları bul
  const teacherConstraints = constraints.filter(c => 
    c.entityType === 'teacher' && 
    c.entityId === teacherId && 
    c.day === day && 
    c.period === period
  );

  // Müsait değil kısıtlaması varsa
  const unavailableConstraint = teacherConstraints.find(c => 
    c.constraintType === 'unavailable'
  );

  if (unavailableConstraint) {
    console.log(`⚠️ Öğretmen müsait değil:`, {
      teacherId,
      day,
      period,
      reason: unavailableConstraint.reason
    });
    
    return {
      hasConflict: true,
      conflictType: ConflictType.TEACHER_UNAVAILABLE,
      message: `Öğretmen ${day} günü ${period}. ders saatinde müsait değil${unavailableConstraint.reason ? `: ${unavailableConstraint.reason}` : ''}`,
      severity: 'error',
      entities: {
        teacherId,
        day,
        period
      }
    };
  }

  // Kısıtlı kısıtlaması varsa (uyarı)
  const restrictedConstraint = teacherConstraints.find(c => 
    c.constraintType === 'restricted'
  );

  if (restrictedConstraint) {
    console.log(`⚠️ Öğretmen kısıtlı:`, {
      teacherId,
      day,
      period,
      reason: restrictedConstraint.reason
    });
    
    return {
      hasConflict: false, // Uyarı olarak işaretle, engelleme yapma
      conflictType: ConflictType.TEACHER_UNAVAILABLE,
      message: `Öğretmen ${day} günü ${period}. ders saatinde kısıtlı${restrictedConstraint.reason ? `: ${restrictedConstraint.reason}` : ''}`,
      severity: 'warning',
      entities: {
        teacherId,
        day,
        period
      }
    };
  }

  return { 
    hasConflict: false, 
    message: '', 
    severity: 'info',
    entities: { teacherId, day, period }
  };
};

/**
 * Sınıf uygunluk kontrolü
 * Bir sınıfın belirli bir gün ve saatte müsait olup olmadığını kontrol eder
 */
export const checkClassAvailability = (
  classId: string,
  day: string,
  period: string,
  constraints: TimeConstraint[]
): ConflictResult => {
  
  console.log(`🔍 Sınıf uygunluk kontrolü: ${classId}, ${day}, ${period}`);

  // Bu sınıf için kısıtlamaları bul
  const classConstraints = constraints.filter(c => 
    c.entityType === 'class' && 
    c.entityId === classId && 
    c.day === day && 
    c.period === period
  );

  // Müsait değil kısıtlaması varsa
  const unavailableConstraint = classConstraints.find(c => 
    c.constraintType === 'unavailable'
  );

  if (unavailableConstraint) {
    console.log(`⚠️ Sınıf müsait değil:`, {
      classId,
      day,
      period,
      reason: unavailableConstraint.reason
    });
    
    return {
      hasConflict: true,
      conflictType: ConflictType.CLASS_UNAVAILABLE,
      message: `Sınıf ${day} günü ${period}. ders saatinde müsait değil${unavailableConstraint.reason ? `: ${unavailableConstraint.reason}` : ''}`,
      severity: 'error',
      entities: {
        classId,
        day,
        period
      }
    };
  }

  // Kısıtlı kısıtlaması varsa (uyarı)
  const restrictedConstraint = classConstraints.find(c => 
    c.constraintType === 'restricted'
  );

  if (restrictedConstraint) {
    console.log(`⚠️ Sınıf kısıtlı:`, {
      classId,
      day,
      period,
      reason: restrictedConstraint.reason
    });
    
    return {
      hasConflict: false, // Uyarı olarak işaretle, engelleme yapma
      conflictType: ConflictType.CLASS_UNAVAILABLE,
      message: `Sınıf ${day} günü ${period}. ders saatinde kısıtlı${restrictedConstraint.reason ? `: ${restrictedConstraint.reason}` : ''}`,
      severity: 'warning',
      entities: {
        classId,
        day,
        period
      }
    };
  }

  return { 
    hasConflict: false, 
    message: '', 
    severity: 'info',
    entities: { classId, day, period }
  };
};

/**
 * Seviye uyumluluğu kontrolü
 * Öğretmen ve sınıf seviyelerinin uyumlu olup olmadığını kontrol eder
 */
export const checkLevelCompatibility = (
  teacherId: string,
  classId: string,
  teachers: Teacher[],
  classes: Class[]
): ConflictResult => {
  
  const teacher = teachers.find(t => t.id === teacherId);
  const classItem = classes.find(c => c.id === classId);
  
  if (!teacher || !classItem) {
    return { 
      hasConflict: false, 
      message: 'Öğretmen veya sınıf bulunamadı', 
      severity: 'warning',
      entities: { teacherId, classId }
    };
  }

  console.log(`🔍 Seviye uyumluluğu kontrolü: ${teacher.name} (${teacher.level}) - ${classItem.name} (${classItem.level})`);

  if (teacher.level !== classItem.level) {
    console.log(`⚠️ Seviye uyumsuzluğu:`, {
      teacherName: teacher.name,
      teacherLevel: teacher.level,
      className: classItem.name,
      classLevel: classItem.level
    });
    
    return {
      hasConflict: false, // Uyarı olarak işaretle, engelleme yapma
      conflictType: ConflictType.TEACHER_CLASS_LEVEL_MISMATCH,
      message: `Öğretmen seviyesi (${teacher.level}) sınıf seviyesi (${classItem.level}) ile uyuşmuyor`,
      severity: 'warning',
      entities: {
        teacherId,
        classId
      }
    };
  }

  return { 
    hasConflict: false, 
    message: '', 
    severity: 'info',
    entities: { teacherId, classId }
  };
};

/**
 * Branş uyumluluğu kontrolü
 * Öğretmen ve ders branşlarının uyumlu olup olmadığını kontrol eder
 */
export const checkBranchCompatibility = (
  teacherId: string,
  subjectId: string,
  teachers: Teacher[],
  subjects: Subject[]
): ConflictResult => {
  
  const teacher = teachers.find(t => t.id === teacherId);
  const subject = subjects.find(s => s.id === subjectId);
  
  if (!teacher || !subject) {
    return { 
      hasConflict: false, 
      message: 'Öğretmen veya ders bulunamadı', 
      severity: 'warning',
      entities: { teacherId, subjectId }
    };
  }

  console.log(`🔍 Branş uyumluluğu kontrolü: ${teacher.name} (${teacher.branch}) - ${subject.name} (${subject.branch})`);

  if (teacher.branch !== subject.branch) {
    console.log(`⚠️ Branş uyumsuzluğu:`, {
      teacherName: teacher.name,
      teacherBranch: teacher.branch,
      subjectName: subject.name,
      subjectBranch: subject.branch
    });
    
    return {
      hasConflict: false, // Uyarı olarak işaretle, engelleme yapma
      conflictType: ConflictType.TEACHER_SUBJECT_BRANCH_MISMATCH,
      message: `Öğretmen branşı (${teacher.branch}) ders branşı (${subject.branch}) ile uyuşmuyor`,
      severity: 'warning',
      entities: {
        teacherId,
        subjectId
      }
    };
  }

  return { 
    hasConflict: false, 
    message: '', 
    severity: 'info',
    entities: { teacherId, subjectId }
  };
};

/**
 * Haftalık saat limiti kontrolü
 * Bir ders için haftalık saat limitinin aşılıp aşılmadığını kontrol eder
 */
export const checkWeeklyHourLimit = (
  subjectId: string,
  classId: string,
  mappings: SubjectTeacherMapping[]
): ConflictResult => {
  
  const mapping = mappings.find(m => 
    m.subjectId === subjectId && 
    m.classId === classId
  );
  
  if (!mapping) {
    return { 
      hasConflict: true, 
      conflictType: ConflictType.WEEKLY_HOURS_EXCEEDED,
      message: 'Bu ders için eşleştirme bulunamadı', 
      severity: 'error',
      entities: { subjectId, classId }
    };
  }

  console.log(`🔍 Haftalık saat limiti kontrolü: ${subjectId}, ${classId}, ${mapping.assignedHours}/${mapping.weeklyHours}`);

  if (mapping.assignedHours >= mapping.weeklyHours) {
    console.log(`⚠️ Haftalık saat limiti aşıldı:`, {
      subjectId,
      classId,
      assignedHours: mapping.assignedHours,
      weeklyHours: mapping.weeklyHours
    });
    
    return {
      hasConflict: true,
      conflictType: ConflictType.WEEKLY_HOURS_EXCEEDED,
      message: `Bu ders için haftalık ${mapping.weeklyHours} saat limiti doldu`,
      severity: 'error',
      entities: {
        subjectId,
        classId
      }
    };
  }

  return { 
    hasConflict: false, 
    message: '', 
    severity: 'info',
    entities: { subjectId, classId }
  };
};

/**
 * Günlük ders saati limiti kontrolü
 * Bir sınıfın veya öğretmenin günlük ders saati limitinin aşılıp aşılmadığını kontrol eder
 */
export const checkDailyHourLimit = (
  entityId: string,
  entityType: 'teacher' | 'class',
  day: string,
  allSchedules: Schedule[],
  maxHours: number = 8
): ConflictResult => {
  
  console.log(`🔍 Günlük saat limiti kontrolü: ${entityType} ${entityId}, ${day}, max: ${maxHours}`);

  // Bu gün için ders saati sayısını hesapla
  let dailyHours = 0;
  
  if (entityType === 'teacher') {
    // Öğretmen için
    const teacherSchedule = allSchedules.find(s => s.teacherId === entityId);
    if (teacherSchedule) {
      PERIODS.forEach(period => {
        const slot = teacherSchedule.schedule[day][period];
        if (slot && slot.classId !== 'fixed-period') {
          dailyHours++;
        }
      });
    }
  } else {
    // Sınıf için
    allSchedules.forEach(schedule => {
      PERIODS.forEach(period => {
        const slot = schedule.schedule[day][period];
        if (slot && slot.classId === entityId && slot.classId !== 'fixed-period') {
          dailyHours++;
        }
      });
    });
  }

  if (dailyHours >= maxHours) {
    console.log(`⚠️ Günlük saat limiti aşıldı:`, {
      entityType,
      entityId,
      day,
      dailyHours,
      maxHours
    });
    
    return {
      hasConflict: true,
      conflictType: ConflictType.DAILY_HOURS_EXCEEDED,
      message: `${entityType === 'teacher' ? 'Öğretmen' : 'Sınıf'} için ${day} günü maksimum ${maxHours} ders saati limiti aşıldı (${dailyHours})`,
      severity: 'error',
      entities: {
        teacherId: entityType === 'teacher' ? entityId : undefined,
        classId: entityType === 'class' ? entityId : undefined,
        day
      }
    };
  }

  return { 
    hasConflict: false, 
    message: '', 
    severity: 'info',
    entities: { 
      teacherId: entityType === 'teacher' ? entityId : undefined,
      classId: entityType === 'class' ? entityId : undefined,
      day 
    }
  };
};

/**
 * Ardışık ders saati limiti kontrolü
 * Bir öğretmenin veya sınıfın ardışık ders saati limitinin aşılıp aşılmadığını kontrol eder
 */
export const checkConsecutiveHourLimit = (
  entityId: string,
  entityType: 'teacher' | 'class',
  day: string,
  period: string,
  allSchedules: Schedule[],
  maxConsecutiveHours: number = 3
): ConflictResult => {
  
  console.log(`🔍 Ardışık saat limiti kontrolü: ${entityType} ${entityId}, ${day}, ${period}, max: ${maxConsecutiveHours}`);

  // Mevcut ardışık ders sayısını hesapla
  let consecutiveHours = 1; // Mevcut ders dahil
  const periodIndex = PERIODS.indexOf(period);
  
  if (periodIndex === -1) {
    return { 
      hasConflict: false, 
      message: 'Geçersiz ders saati', 
      severity: 'warning',
      entities: { 
        teacherId: entityType === 'teacher' ? entityId : undefined,
        classId: entityType === 'class' ? entityId : undefined,
        day,
        period
      }
    };
  }

  // Önceki dersleri kontrol et
  for (let i = periodIndex - 1; i >= 0; i--) {
    const prevPeriod = PERIODS[i];
    let hasClass = false;
    
    if (entityType === 'teacher') {
      // Öğretmen için
      const teacherSchedule = allSchedules.find(s => s.teacherId === entityId);
      if (teacherSchedule) {
        const slot = teacherSchedule.schedule[day][prevPeriod];
        if (slot && slot.classId !== 'fixed-period') {
          hasClass = true;
        }
      }
    } else {
      // Sınıf için
      for (const schedule of allSchedules) {
        const slot = schedule.schedule[day][prevPeriod];
        if (slot && slot.classId === entityId && slot.classId !== 'fixed-period') {
          hasClass = true;
          break;
        }
      }
    }
    
    if (hasClass) {
      consecutiveHours++;
    } else {
      break;
    }
  }

  // Sonraki dersleri kontrol et
  for (let i = periodIndex + 1; i < PERIODS.length; i++) {
    const nextPeriod = PERIODS[i];
    let hasClass = false;
    
    if (entityType === 'teacher') {
      // Öğretmen için
      const teacherSchedule = allSchedules.find(s => s.teacherId === entityId);
      if (teacherSchedule) {
        const slot = teacherSchedule.schedule[day][nextPeriod];
        if (slot && slot.classId !== 'fixed-period') {
          hasClass = true;
        }
      }
    } else {
      // Sınıf için
      for (const schedule of allSchedules) {
        const slot = schedule.schedule[day][nextPeriod];
        if (slot && slot.classId === entityId && slot.classId !== 'fixed-period') {
          hasClass = true;
          break;
        }
      }
    }
    
    if (hasClass) {
      consecutiveHours++;
    } else {
      break;
    }
  }

  if (consecutiveHours > maxConsecutiveHours) {
    console.log(`⚠️ Ardışık saat limiti aşıldı:`, {
      entityType,
      entityId,
      day,
      period,
      consecutiveHours,
      maxConsecutiveHours
    });
    
    return {
      hasConflict: true,
      conflictType: ConflictType.CONSECUTIVE_HOURS_EXCEEDED,
      message: `${entityType === 'teacher' ? 'Öğretmen' : 'Sınıf'} için ${day} günü maksimum ${maxConsecutiveHours} ardışık ders saati limiti aşıldı (${consecutiveHours})`,
      severity: 'warning', // Uyarı olarak işaretle, engelleme yapma
      entities: {
        teacherId: entityType === 'teacher' ? entityId : undefined,
        classId: entityType === 'class' ? entityId : undefined,
        day,
        period
      }
    };
  }

  return { 
    hasConflict: false, 
    message: '', 
    severity: 'info',
    entities: { 
      teacherId: entityType === 'teacher' ? entityId : undefined,
      classId: entityType === 'class' ? entityId : undefined,
      day,
      period
    }
  };
};

/**
 * Tüm çakışma kontrollerini bir arada yapar
 */
export const checkAllConflicts = (
  teacherId: string,
  classId: string,
  subjectId: string,
  day: string,
  period: string,
  allSchedules: Schedule[],
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[],
  constraints: TimeConstraint[],
  mappings: SubjectTeacherMapping[]
): ConflictResult[] => {
  
  console.log(`🔍 Tüm çakışma kontrolleri: ${teacherId}, ${classId}, ${subjectId}, ${day}, ${period}`);

  const conflicts: ConflictResult[] = [];

  // 1. Öğretmen çakışması
  const teacherConflict = checkTeacherConflict(teacherId, day, period, allSchedules);
  if (teacherConflict.hasConflict) {
    conflicts.push(teacherConflict);
  }

  // 2. Sınıf çakışması
  const classConflict = checkClassConflict(classId, day, period, allSchedules);
  if (classConflict.hasConflict) {
    conflicts.push(classConflict);
  }

  // 3. Öğretmen uygunluğu
  const teacherAvailability = checkTeacherAvailability(teacherId, day, period, constraints);
  if (teacherAvailability.hasConflict) {
    conflicts.push(teacherAvailability);
  }

  // 4. Sınıf uygunluğu
  const classAvailability = checkClassAvailability(classId, day, period, constraints);
  if (classAvailability.hasConflict) {
    conflicts.push(classAvailability);
  }

  // 5. Seviye uyumluluğu
  const levelCompatibility = checkLevelCompatibility(teacherId, classId, teachers, classes);
  if (levelCompatibility.hasConflict) {
    conflicts.push(levelCompatibility);
  }

  // 6. Branş uyumluluğu
  const branchCompatibility = checkBranchCompatibility(teacherId, subjectId, teachers, subjects);
  if (branchCompatibility.hasConflict) {
    conflicts.push(branchCompatibility);
  }

  // 7. Haftalık saat limiti
  const weeklyHourLimit = checkWeeklyHourLimit(subjectId, classId, mappings);
  if (weeklyHourLimit.hasConflict) {
    conflicts.push(weeklyHourLimit);
  }

  // 8. Günlük ders saati limiti - Öğretmen
  const teacherDailyLimit = checkDailyHourLimit(teacherId, 'teacher', day, allSchedules);
  if (teacherDailyLimit.hasConflict) {
    conflicts.push(teacherDailyLimit);
  }

  // 9. Günlük ders saati limiti - Sınıf
  const classDailyLimit = checkDailyHourLimit(classId, 'class', day, allSchedules);
  if (classDailyLimit.hasConflict) {
    conflicts.push(classDailyLimit);
  }

  // 10. Ardışık ders saati limiti - Öğretmen
  const teacherConsecutiveLimit = checkConsecutiveHourLimit(teacherId, 'teacher', day, period, allSchedules);
  if (teacherConsecutiveLimit.hasConflict) {
    conflicts.push(teacherConsecutiveLimit);
  }

  // 11. Ardışık ders saati limiti - Sınıf
  const classConsecutiveLimit = checkConsecutiveHourLimit(classId, 'class', day, period, allSchedules);
  if (classConsecutiveLimit.hasConflict) {
    conflicts.push(classConsecutiveLimit);
  }

  // Uyarıları da ekle
  if (teacherAvailability.severity === 'warning') {
    conflicts.push(teacherAvailability);
  }
  if (classAvailability.severity === 'warning') {
    conflicts.push(classAvailability);
  }
  if (levelCompatibility.severity === 'warning') {
    conflicts.push(levelCompatibility);
  }
  if (branchCompatibility.severity === 'warning') {
    conflicts.push(branchCompatibility);
  }

  console.log(`📊 Çakışma kontrolleri tamamlandı: ${conflicts.length} çakışma bulundu`);
  
  return conflicts;
};

/**
 * Çakışma sonuçlarını özetler
 */
export const summarizeConflicts = (
  conflicts: ConflictResult[]
): {
  hasBlockingConflict: boolean;
  hasWarning: boolean;
  errorMessages: string[];
  warningMessages: string[];
} => {
  
  const errorConflicts = conflicts.filter(c => c.severity === 'error');
  const warningConflicts = conflicts.filter(c => c.severity === 'warning');
  
  return {
    hasBlockingConflict: errorConflicts.length > 0,
    hasWarning: warningConflicts.length > 0,
    errorMessages: errorConflicts.map(c => c.message),
    warningMessages: warningConflicts.map(c => c.message)
  };
};

/**
 * Çakışma sonuçlarını gruplar
 */
export const groupConflictsByType = (
  conflicts: ConflictResult[]
): { [type in ConflictType]?: ConflictResult[] } => {
  
  const grouped: { [type in ConflictType]?: ConflictResult[] } = {};
  
  conflicts.forEach(conflict => {
    if (conflict.conflictType) {
      if (!grouped[conflict.conflictType]) {
        grouped[conflict.conflictType] = [];
      }
      grouped[conflict.conflictType]!.push(conflict);
    }
  });
  
  return grouped;
};

/**
 * Çakışma sonuçlarını önem sırasına göre sıralar
 */
export const sortConflictsByImportance = (
  conflicts: ConflictResult[]
): ConflictResult[] => {
  
  const severityOrder = { 'error': 3, 'warning': 2, 'info': 1 };
  
  return [...conflicts].sort((a, b) => {
    // Önce önem sırası
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
};