import { Teacher, Class, Subject, Schedule, DAYS, PERIODS, ScheduleSlot } from '../types';
import { WizardData, SubjectTeacherMapping, ScheduleGenerationContext, EnhancedGenerationResult } from '../types/wizard';
import { 
  createSubjectTeacherMappings, 
  checkWeeklyHourLimits, 
  updateMappingAssignment,
  findBestMappingForSlot,
  calculateMappingStatistics,
  validateMappings
} from './subjectTeacherMapping';
import { checkSlotConflict } from './validation';

// CRITICAL: Geliştirilmiş Program Oluşturma Sistemi
// Bu sistem, ders-öğretmen eşleştirmelerini kullanarak sistematik program oluşturur

/**
 * Ana program oluşturma fonksiyonu
 * Wizard verilerini kullanarak tüm sınıflar için program oluşturur
 */
export const generateSystematicSchedule = async (
  wizardData: WizardData,
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[]
): Promise<EnhancedGenerationResult> => {
  
  const startTime = Date.now();
  
  console.log('🚀 Sistematik program oluşturma başlatıldı...', {
    classes: wizardData.classes?.selectedClasses?.length || 0,
    subjects: wizardData.subjects?.selectedSubjects?.length || 0,
    teachers: wizardData.teachers?.selectedTeachers?.length || 0
  });

  try {
    // 1. Ders-öğretmen eşleştirmelerini oluştur
    console.log('📋 1. Adım: Ders-öğretmen eşleştirmeleri oluşturuluyor...');
    const mappings = createSubjectTeacherMappings(wizardData, teachers, classes, subjects);
    
    // 2. Eşleştirmeleri doğrula
    console.log('✅ 2. Adım: Eşleştirmeler doğrulanıyor...');
    const validation = validateMappings(mappings, teachers, classes, subjects);
    
    if (!validation.isValid) {
      return {
        success: false,
        schedules: [],
        context: createEmptyContext(mappings),
        statistics: createEmptyStatistics(),
        warnings: validation.warnings,
        errors: validation.errors,
        generationTime: Date.now() - startTime,
        algorithm: wizardData.generationSettings?.algorithm || 'balanced',
        optimizationLevel: wizardData.generationSettings?.optimizationLevel || 'balanced'
      };
    }

    // 3. Program oluşturma context'ini hazırla
    console.log('🔧 3. Adım: Program oluşturma context\'i hazırlanıyor...');
    const context = initializeGenerationContext(mappings, wizardData, classes);
    
    // 4. Her sınıf için program oluştur
    console.log('📚 4. Adım: Sınıf programları oluşturuluyor...');
    const schedules: Schedule[] = [];
    
    for (const classId of wizardData.classes?.selectedClasses || []) {
      const classItem = classes.find(c => c.id === classId);
      if (!classItem) {
        context.warnings.push(`Sınıf bulunamadı: ${classId}`);
        continue;
      }

      console.log(`📖 ${classItem.name} sınıfı için program oluşturuluyor...`);
      
      const classSchedule = await generateClassSchedule(
        classId,
        mappings,
        context,
        wizardData,
        teachers,
        classes,
        subjects
      );
      
      if (classSchedule) {
        schedules.push(classSchedule);
        context.classSchedules[classId] = classSchedule;
        console.log(`✅ ${classItem.name} programı oluşturuldu`);
      } else {
        context.errors.push(`${classItem.name} için program oluşturulamadı`);
        console.error(`❌ ${classItem.name} programı oluşturulamadı`);
      }
    }

    // 5. İstatistikleri hesapla
    console.log('📊 5. Adım: İstatistikler hesaplanıyor...');
    const mappingStats = calculateMappingStatistics(mappings);
    const finalStatistics = calculateFinalStatistics(schedules, mappings, context);

    // 6. Sonuçları hazırla
    const generationTime = Date.now() - startTime;
    
    console.log('🎉 Program oluşturma tamamlandı!', {
      duration: `${generationTime}ms`,
      schedulesCreated: schedules.length,
      totalSlots: finalStatistics.totalSlots,
      filledSlots: finalStatistics.filledSlots,
      successRate: `${((finalStatistics.filledSlots / finalStatistics.totalSlots) * 100).toFixed(1)}%`
    });

    return {
      success: schedules.length > 0,
      schedules,
      context,
      statistics: finalStatistics,
      warnings: [...validation.warnings, ...context.warnings],
      errors: context.errors,
      generationTime,
      algorithm: wizardData.generationSettings?.algorithm || 'balanced',
      optimizationLevel: wizardData.generationSettings?.optimizationLevel || 'balanced'
    };

  } catch (error) {
    console.error('❌ Program oluşturma hatası:', error);
    
    return {
      success: false,
      schedules: [],
      context: createEmptyContext([]),
      statistics: createEmptyStatistics(),
      warnings: [],
      errors: [`Program oluşturma hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`],
      generationTime: Date.now() - startTime,
      algorithm: wizardData.generationSettings?.algorithm || 'balanced',
      optimizationLevel: wizardData.generationSettings?.optimizationLevel || 'balanced'
    };
  }
};

/**
 * Tek bir sınıf için program oluşturur
 * CRITICAL: Bu fonksiyon, bir sınıf için program oluştururken
 * her dersin haftalık saat limitini kontrol eder ve aşmaz
 */
const generateClassSchedule = async (
  classId: string,
  mappings: SubjectTeacherMapping[],
  context: ScheduleGenerationContext,
  wizardData: WizardData,
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[]
): Promise<Schedule | null> => {
  
  const classItem = classes.find(c => c.id === classId);
  if (!classItem) {
    return null;
  }

  // Boş program oluştur
  const schedule: Schedule = {
    id: `schedule-${classId}-${Date.now()}`,
    teacherId: '', // Class mode için boş
    schedule: createEmptyScheduleGrid(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Bu sınıf için geçerli eşleştirmeleri al
  const classMappings = mappings.filter(m => 
    m.classId === classId && m.isValid
  );

  if (classMappings.length === 0) {
    context.warnings.push(`${classItem.name} için geçerli ders eşleştirmesi bulunamadı`);
    return schedule;
  }

  console.log(`📋 ${classItem.name} için ${classMappings.length} ders eşleştirmesi bulundu`);

  // CRITICAL: Toplam haftalık saat sayısını hesapla
  const totalWeeklyHours = classMappings.reduce((sum, mapping) => sum + mapping.weeklyHours, 0);
  console.log(`📊 ${classItem.name} için toplam haftalık saat: ${totalWeeklyHours}`);

  // Sabit periyotları ekle (kahvaltı, yemek, vb.)
  addFixedPeriods(schedule, classItem.level);

  // Her gün ve ders saati için en uygun dersi ata
  let totalAssignments = 0;
  let successfulAssignments = 0;

  // CRITICAL: Ders atama stratejisi - Önce yüksek öncelikli dersler
  // Öncelik sırasına göre sıralanmış eşleştirmeler
  const prioritizedMappings = [...classMappings].sort((a, b) => {
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  // CRITICAL: Önce her dersin haftalık saat sayısını doldurmaya çalış
  for (const mapping of prioritizedMappings) {
    const subject = subjects.find(s => s.id === mapping.subjectId);
    const teacher = teachers.find(t => t.id === mapping.teacherId);
    
    if (!subject || !teacher) continue;
    
    console.log(`🔄 ${classItem.name} - ${subject.name} dersi için ${mapping.weeklyHours} saat atanacak`);
    
    // Bu ders için atanması gereken saat sayısı
    const hoursToAssign = mapping.weeklyHours;
    let assignedHours = 0;
    
    // Günleri ve saatleri karıştır (daha dengeli dağılım için)
    const shuffledDays = [...DAYS].sort(() => Math.random() - 0.5);
    const shuffledPeriods = [...PERIODS].sort(() => Math.random() - 0.5);
    
    // Her gün ve saat için deneme yap
    for (const day of shuffledDays) {
      if (assignedHours >= hoursToAssign) break; // Yeterli saat atandıysa dur
      
      for (const period of shuffledPeriods) {
        if (assignedHours >= hoursToAssign) break; // Yeterli saat atandıysa dur
        
        // Sabit periyotları atla
        if (schedule.schedule[day][period]?.classId === 'fixed-period') {
          continue;
        }
        
        // Slot boş mu kontrol et
        if (schedule.schedule[day][period] !== null) {
          continue;
        }
        
        totalAssignments++;
        
        // Çakışma kontrolü
        const conflictCheck = checkSlotConflict(
          'class',
          day,
          period,
          mapping.teacherId,
          classId,
          Object.values(context.classSchedules),
          teachers,
          classes
        );

        if (conflictCheck.hasConflict) {
          console.log(`⚠️ ${classItem.name} - ${day} ${period}. ders: ${conflictCheck.message}`);
          context.conflicts.push(conflictCheck.message);
          continue;
        }

        // Dersi ata
        schedule.schedule[day][period] = {
          subjectId: mapping.subjectId,
          classId: classId,
          teacherId: mapping.teacherId
        };

        // Eşleştirmedeki atanan saat sayısını artır
        assignedHours++;
        mapping.assignedHours++;

        // Context'i güncelle
        if (!context.teacherWorkloads[mapping.teacherId]) {
          context.teacherWorkloads[mapping.teacherId] = 0;
        }
        context.teacherWorkloads[mapping.teacherId]++;

        if (!context.subjectDistribution[mapping.subjectId]) {
          context.subjectDistribution[mapping.subjectId] = 0;
        }
        context.subjectDistribution[mapping.subjectId]++;

        successfulAssignments++;
        
        console.log(`✅ ${classItem.name} - ${day} ${period}. ders: ${subject.name} - ${teacher.name} (${assignedHours}/${hoursToAssign})`);
      }
    }
    
    // Atama sonrası durum raporu
    console.log(`📊 ${classItem.name} - ${subject.name}: ${assignedHours}/${hoursToAssign} saat atandı`);
    
    if (assignedHours < hoursToAssign) {
      context.warnings.push(`${classItem.name} - ${subject.name} için ${hoursToAssign} saat yerine sadece ${assignedHours} saat atanabildi`);
    }
  }

  // Kalan boş slotları doldur (opsiyonel)
  if (wizardData.generationSettings?.algorithm === 'compact') {
    fillEmptySlots(schedule, classMappings, context, teachers, classes, subjects);
  }

  const successRate = totalAssignments > 0 ? (successfulAssignments / totalAssignments) * 100 : 0;
  console.log(`📊 ${classItem.name} başarı oranı: ${successRate.toFixed(1)}% (${successfulAssignments}/${totalAssignments})`);

  if (successRate < 50) {
    context.warnings.push(`${classItem.name} için düşük başarı oranı: %${successRate.toFixed(1)}`);
  }

  return schedule;
};

/**
 * Boş slotları doldurur (compact algoritması için)
 */
const fillEmptySlots = (
  schedule: Schedule,
  mappings: SubjectTeacherMapping[],
  context: ScheduleGenerationContext,
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[]
) => {
  // Boş slotları bul
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      if (schedule.schedule[day][period] === null) {
        // Hala atanabilecek ders var mı kontrol et
        const availableMapping = mappings.find(m => 
          m.isValid && 
          checkWeeklyHourLimits(mappings, m.subjectId, m.classId).canAssign
        );
        
        if (availableMapping) {
          // Çakışma kontrolü
          const conflictCheck = checkSlotConflict(
            'class',
            day,
            period,
            availableMapping.teacherId,
            availableMapping.classId,
            Object.values(context.classSchedules),
            teachers,
            classes
          );

          if (!conflictCheck.hasConflict) {
            // Dersi ata
            schedule.schedule[day][period] = {
              subjectId: availableMapping.subjectId,
              classId: availableMapping.classId,
              teacherId: availableMapping.teacherId
            };
            
            // Eşleştirmedeki atanan saat sayısını artır
            const mappingIndex = mappings.findIndex(m => m.id === availableMapping.id);
            if (mappingIndex !== -1) {
              mappings[mappingIndex].assignedHours++;
            }
            
            // Context'i güncelle
            if (!context.teacherWorkloads[availableMapping.teacherId]) {
              context.teacherWorkloads[availableMapping.teacherId] = 0;
            }
            context.teacherWorkloads[availableMapping.teacherId]++;
            
            if (!context.subjectDistribution[availableMapping.subjectId]) {
              context.subjectDistribution[availableMapping.subjectId] = 0;
            }
            context.subjectDistribution[availableMapping.subjectId]++;
            
            const subject = subjects.find(s => s.id === availableMapping.subjectId);
            const teacher = teachers.find(t => t.id === availableMapping.teacherId);
            
            console.log(`✅ Boş slot dolduruldu: ${day} ${period}. ders: ${subject?.name} - ${teacher?.name}`);
          }
        }
      }
    });
  });
};

/**
 * Boş program grid'i oluşturur
 */
const createEmptyScheduleGrid = (): Schedule['schedule'] => {
  const grid: Schedule['schedule'] = {};
  
  DAYS.forEach(day => {
    grid[day] = {};
    PERIODS.forEach(period => {
      grid[day][period] = null;
    });
  });
  
  return grid;
};

/**
 * Sabit periyotları ekler (kahvaltı, yemek, vb.)
 */
const addFixedPeriods = (
  schedule: Schedule,
  level: 'Anaokulu' | 'İlkokul' | 'Ortaokul'
) => {
  DAYS.forEach(day => {
    // Hazırlık/Kahvaltı (tüm seviyeler için)
    schedule.schedule[day]['prep'] = {
      classId: 'fixed-period',
      subjectId: 'fixed-prep'
    };

    // Ortaokul için 1. ve 2. ders arası kahvaltı
    if (level === 'Ortaokul') {
      schedule.schedule[day]['breakfast'] = {
        classId: 'fixed-period',
        subjectId: 'fixed-breakfast'
      };
    }

    // Yemek saati
    const lunchPeriod = (level === 'İlkokul' || level === 'Anaokulu') ? '5' : '6';
    schedule.schedule[day][lunchPeriod] = {
      classId: 'fixed-period',
      subjectId: 'fixed-lunch'
    };

    // İkindi kahvaltısı (8. ders sonrası)
    schedule.schedule[day]['afternoon-breakfast'] = {
      classId: 'fixed-period',
      subjectId: 'fixed-afternoon-breakfast'
    };
  });
};

/**
 * Program oluşturma context'ini başlatır
 */
const initializeGenerationContext = (
  mappings: SubjectTeacherMapping[],
  wizardData: WizardData,
  classes: Class[]
): ScheduleGenerationContext => {
  
  const totalSlotsPerClass = DAYS.length * PERIODS.length;
  const totalClasses = wizardData.classes?.selectedClasses?.length || 0;
  const totalSlotsAvailable = totalSlotsPerClass * totalClasses;
  
  // Sabit periyotları çıkar (her sınıf için 4 sabit periyot: prep, lunch, afternoon-breakfast, ve ortaokul için breakfast)
  const fixedPeriodsPerClass = 4; // Ortalama
  const totalSlotsNeeded = totalSlotsAvailable - (fixedPeriodsPerClass * totalClasses);

  return {
    mappings,
    totalSlotsNeeded,
    totalSlotsAvailable,
    classSchedules: {},
    teacherWorkloads: {},
    subjectDistribution: {},
    conflicts: [],
    warnings: []
  };
};

/**
 * Boş context oluşturur
 */
const createEmptyContext = (mappings: SubjectTeacherMapping[]): ScheduleGenerationContext => {
  return {
    mappings,
    totalSlotsNeeded: 0,
    totalSlotsAvailable: 0,
    classSchedules: {},
    teacherWorkloads: {},
    subjectDistribution: {},
    conflicts: [],
    warnings: []
  };
};

/**
 * Boş istatistik oluşturur
 */
const createEmptyStatistics = () => {
  return {
    totalSlots: 0,
    filledSlots: 0,
    emptySlots: 0,
    conflictCount: 0,
    satisfiedConstraints: 0,
    totalConstraints: 0,
    subjectCoverage: {},
    teacherUtilization: {}
  };
};

/**
 * Final istatistikleri hesaplar
 */
const calculateFinalStatistics = (
  schedules: Schedule[],
  mappings: SubjectTeacherMapping[],
  context: ScheduleGenerationContext
) => {
  let totalSlots = 0;
  let filledSlots = 0;
  
  // Her programdaki slot'ları say
  schedules.forEach(schedule => {
    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        totalSlots++;
        const slot = schedule.schedule[day][period];
        if (slot && slot.classId !== 'fixed-period' && slot.teacherId) {
          filledSlots++;
        }
      });
    });
  });

  const emptySlots = totalSlots - filledSlots;
  
  // Ders kapsamı hesapla
  const subjectCoverage: { [subjectId: string]: number } = {};
  const validMappings = mappings.filter(m => m.isValid);
  
  validMappings.forEach(mapping => {
    const targetHours = mapping.weeklyHours;
    const assignedHours = mapping.assignedHours;
    const coverage = targetHours > 0 ? (assignedHours / targetHours) * 100 : 0;
    
    if (!subjectCoverage[mapping.subjectId]) {
      subjectCoverage[mapping.subjectId] = 0;
    }
    subjectCoverage[mapping.subjectId] = Math.max(
      subjectCoverage[mapping.subjectId], 
      coverage
    );
  });

  // Öğretmen kullanımı hesapla
  const teacherUtilization: { [teacherId: string]: number } = {};
  Object.entries(context.teacherWorkloads).forEach(([teacherId, workload]) => {
    // Maksimum 30 saat/hafta varsayımı
    teacherUtilization[teacherId] = Math.min((workload / 30) * 100, 100);
  });

  return {
    totalSlots,
    filledSlots,
    emptySlots,
    conflictCount: context.conflicts.length,
    satisfiedConstraints: filledSlots, // Basit hesaplama
    totalConstraints: totalSlots,
    subjectCoverage,
    teacherUtilization
  };
};