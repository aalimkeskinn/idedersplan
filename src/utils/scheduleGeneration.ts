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
    
    // IMPROVED: Sınıfları rastgele sırayla işle (daha dengeli dağılım için)
    const shuffledClassIds = [...(wizardData.classes?.selectedClasses || [])].sort(() => Math.random() - 0.5);
    
    for (const classId of shuffledClassIds) {
      const classItem = classes.find(c => c.id === classId);
      if (!classItem) {
        context.warnings.push(`Sınıf bulunamadı: ${classId}`);
        continue;
      }

      console.log(`📖 ${classItem.name} sınıfı için program oluşturuluyor...`);
      
      // IMPROVED: Maksimum 3 deneme yap
      let attempts = 0;
      let classSchedule = null;
      
      while (attempts < 3 && !classSchedule) {
        attempts++;
        console.log(`🔄 ${classItem.name} için ${attempts}. deneme...`);
        
        classSchedule = await generateClassSchedule(
          classId,
          mappings,
          context,
          wizardData,
          teachers,
          classes,
          subjects,
          schedules // Mevcut programları da geçir
        );
        
        // Eğer program oluşturuldu ama çakışma varsa, yeniden dene
        if (classSchedule && hasConflicts(classSchedule, schedules, teachers, classes)) {
          console.log(`⚠️ ${classItem.name} programında çakışma tespit edildi, yeniden deneniyor...`);
          classSchedule = null;
        }
      }
      
      if (classSchedule) {
        schedules.push(classSchedule);
        context.classSchedules[classId] = classSchedule;
        console.log(`✅ ${classItem.name} programı oluşturuldu (${attempts}. denemede)`);
      } else {
        context.errors.push(`${classItem.name} için program oluşturulamadı (${attempts} deneme sonrası)`);
        console.error(`❌ ${classItem.name} programı oluşturulamadı (${attempts} deneme sonrası)`);
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
 * IMPROVED: Programda çakışma olup olmadığını kontrol eder
 */
const hasConflicts = (
  schedule: Schedule,
  existingSchedules: Schedule[],
  teachers: Teacher[],
  classes: Class[]
): boolean => {
  let hasConflict = false;
  
  // Her gün ve ders saati için çakışma kontrolü yap
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = schedule.schedule[day]?.[period];
      
      // Sabit periyotları atla
      if (!slot || slot.classId === 'fixed-period') return;
      
      // Öğretmen çakışması: Aynı öğretmen aynı saatte başka bir sınıfta ders veriyor mu?
      if (slot.teacherId) {
        const teacherConflict = existingSchedules.some(existingSchedule => {
          const existingSlot = existingSchedule.schedule[day]?.[period];
          return existingSlot && 
                 existingSlot.teacherId === slot.teacherId && 
                 existingSlot.classId !== slot.classId &&
                 existingSlot.classId !== 'fixed-period';
        });
        
        if (teacherConflict) {
          const teacher = teachers.find(t => t.id === slot.teacherId);
          console.log(`⚠️ Öğretmen çakışması: ${teacher?.name} ${day} günü ${period}. ders saatinde başka bir sınıfta ders veriyor`);
          hasConflict = true;
        }
      }
      
      // Sınıf çakışması: Aynı sınıfa aynı saatte başka bir öğretmen ders veriyor mu?
      if (slot.classId) {
        const classConflict = existingSchedules.some(existingSchedule => {
          const existingSlot = existingSchedule.schedule[day]?.[period];
          return existingSlot && 
                 existingSlot.classId === slot.classId && 
                 existingSlot.teacherId !== slot.teacherId &&
                 existingSlot.classId !== 'fixed-period';
        });
        
        if (classConflict) {
          const classItem = classes.find(c => c.id === slot.classId);
          console.log(`⚠️ Sınıf çakışması: ${classItem?.name} ${day} günü ${period}. ders saatinde başka bir öğretmenle ders yapıyor`);
          hasConflict = true;
        }
      }
    });
  });
  
  return hasConflict;
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
  subjects: Subject[],
  existingSchedules: Schedule[] = [] // Mevcut programlar
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

  // IMPROVED: Günleri ve periyotları rastgele sırayla işle (daha dengeli dağılım için)
  const shuffledDays = [...DAYS].sort(() => Math.random() - 0.5);
  
  // CRITICAL: Her gün için tam olarak 9 ders saati olacak şekilde doldur
  // Önce her gün için 9 ders saati ayır
  const dailySlots: { [day: string]: { period: string, filled: boolean }[] } = {};
  
  shuffledDays.forEach(day => {
    dailySlots[day] = [];
    PERIODS.forEach(period => {
      // Sabit periyotları atla
      if (period === 'prep' || period === 'breakfast' || period === 'afternoon-breakfast' || 
          ((classItem.level === 'İlkokul' || classItem.level === 'Anaokulu') && period === '5') ||
          (classItem.level === 'Ortaokul' && period === '6')) {
        return;
      }
      
      // Sadece ilk 9 ders saatini al (sabit periyotlar hariç)
      if (dailySlots[day].length < 9) {
        dailySlots[day].push({ period, filled: false });
      }
    });
  });

  // IMPROVED: Önce her dersin haftalık saat sayısını doldurmaya çalış
  // Daha dengeli dağılım için dersleri rastgele sırayla dağıt
  const shuffledMappings = [...prioritizedMappings].sort(() => Math.random() - 0.5);
  
  for (const mapping of shuffledMappings) {
    const subject = subjects.find(s => s.id === mapping.subjectId);
    const teacher = teachers.find(t => t.id === mapping.teacherId);
    
    if (!subject || !teacher) continue;
    
    console.log(`🔄 ${classItem.name} - ${subject.name} dersi için ${mapping.weeklyHours} saat atanacak`);
    
    // Bu ders için atanması gereken saat sayısı
    const hoursToAssign = mapping.weeklyHours;
    let assignedHours = 0;
    
    // IMPROVED: Daha dengeli dağılım için günleri karıştır
    const shuffledDaysForSubject = [...shuffledDays];
    
    // Her gün için deneme yap
    for (const day of shuffledDaysForSubject) {
      if (assignedHours >= hoursToAssign) break; // Yeterli saat atandıysa dur
      
      // Bu gün için boş slotları bul
      const availableSlots = dailySlots[day].filter(slot => !slot.filled);
      
      if (availableSlots.length === 0) continue; // Bu günde boş slot yoksa atla
      
      // IMPROVED: Rastgele bir slot seç
      const randomIndex = Math.floor(Math.random() * availableSlots.length);
      const selectedSlot = availableSlots[randomIndex];
      const period = selectedSlot.period;
      
      totalAssignments++;
      
      // IMPROVED: Çakışma kontrolü - Hem öğretmen hem de sınıf bazlı
      let hasConflict = false;
      
      // 1. Öğretmen çakışması kontrolü - Mevcut programlarda ve oluşturulmuş programlarda
      const teacherConflict = [...Object.values(context.classSchedules), ...existingSchedules].some(existingSchedule => {
        const existingSlot = existingSchedule.schedule[day]?.[period];
        return existingSlot && 
               existingSlot.teacherId === mapping.teacherId && 
               existingSlot.classId !== 'fixed-period';
      });
      
      if (teacherConflict) {
        console.log(`⚠️ ${classItem.name} - ${day} ${period}. ders: Öğretmen (${teacher.name}) çakışması`);
        context.conflicts.push(`${teacher.name} öğretmeni ${day} günü ${period}. ders saatinde başka bir sınıfta ders veriyor`);
        hasConflict = true;
      }
      
      // 2. Sınıf çakışması kontrolü - Mevcut programlarda ve oluşturulmuş programlarda
      const classConflict = [...Object.values(context.classSchedules), ...existingSchedules].some(existingSchedule => {
        const existingSlot = existingSchedule.schedule[day]?.[period];
        return existingSlot && 
               existingSlot.classId === classId && 
               existingSlot.classId !== 'fixed-period';
      });
      
      if (classConflict) {
        console.log(`⚠️ ${classItem.name} - ${day} ${period}. ders: Sınıf çakışması`);
        context.conflicts.push(`${classItem.name} sınıfı ${day} günü ${period}. ders saatinde başka bir öğretmenle ders yapıyor`);
        hasConflict = true;
      }
      
      if (hasConflict) {
        continue; // Çakışma varsa bu slot'u atla
      }

      // Dersi ata
      schedule.schedule[day][period] = {
        subjectId: mapping.subjectId,
        classId: classId,
        teacherId: mapping.teacherId
      };
      
      // Slot'u doldurulmuş olarak işaretle
      const slotIndex = dailySlots[day].findIndex(s => s.period === period);
      if (slotIndex !== -1) {
        dailySlots[day][slotIndex].filled = true;
      }

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
    
    // Atama sonrası durum raporu
    console.log(`📊 ${classItem.name} - ${subject.name}: ${assignedHours}/${hoursToAssign} saat atandı`);
    
    if (assignedHours < hoursToAssign) {
      context.warnings.push(`${classItem.name} - ${subject.name} için ${hoursToAssign} saat yerine sadece ${assignedHours} saat atanabildi`);
    }
  }

  // CRITICAL: Kalan boş slotları doldur - Tam olarak 45 saat olacak şekilde
  // Önce boş slotları say
  let filledSlots = 0;
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      if (schedule.schedule[day][period] && 
          schedule.schedule[day][period]?.classId !== 'fixed-period') {
        filledSlots++;
      }
    });
  });
  
  console.log(`📊 ${classItem.name} için şu ana kadar ${filledSlots} slot dolduruldu, hedef: 45 slot`);
  
  // IMPROVED: Eğer 45 saate ulaşılmadıysa, kalan boş slotları doldur
  if (filledSlots < 45) {
    const remainingSlots = 45 - filledSlots;
    console.log(`🔄 ${classItem.name} için ${remainingSlots} slot daha doldurulacak`);
    
    // Hala atanabilecek saati olan dersleri bul
    const availableMappings = prioritizedMappings.filter(m => 
      m.assignedHours < m.weeklyHours
    );
    
    if (availableMappings.length > 0) {
      // Boş slotları bul
      const emptySlots: { day: string, period: string }[] = [];
      
      DAYS.forEach(day => {
        // Her gün için boş slotları bul
        dailySlots[day].forEach(slot => {
          if (!slot.filled) {
            emptySlots.push({ day, period: slot.period });
          }
        });
      });
      
      // Rastgele sırayla boş slotları doldur
      const shuffledEmptySlots = emptySlots.sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < Math.min(remainingSlots, shuffledEmptySlots.length); i++) {
        const slot = shuffledEmptySlots[i];
        
        // Rastgele bir mapping seç
        const randomMappingIndex = Math.floor(Math.random() * availableMappings.length);
        const selectedMapping = availableMappings[randomMappingIndex];
        
        // IMPROVED: Çakışma kontrolü - Hem öğretmen hem de sınıf bazlı
        let hasConflict = false;
        
        // 1. Öğretmen çakışması kontrolü - Mevcut programlarda ve oluşturulmuş programlarda
        const teacherConflict = [...Object.values(context.classSchedules), ...existingSchedules].some(existingSchedule => {
          const existingSlot = existingSchedule.schedule[slot.day]?.[slot.period];
          return existingSlot && 
                 existingSlot.teacherId === selectedMapping.teacherId && 
                 existingSlot.classId !== 'fixed-period';
        });
        
        if (teacherConflict) {
          const teacher = teachers.find(t => t.id === selectedMapping.teacherId);
          console.log(`⚠️ Boş slot doldurma - Öğretmen çakışması: ${teacher?.name} ${slot.day} ${slot.period}. ders`);
          hasConflict = true;
        }
        
        // 2. Sınıf çakışması kontrolü - Mevcut programlarda ve oluşturulmuş programlarda
        const classConflict = [...Object.values(context.classSchedules), ...existingSchedules].some(existingSchedule => {
          const existingSlot = existingSchedule.schedule[slot.day]?.[slot.period];
          return existingSlot && 
                 existingSlot.classId === classId && 
                 existingSlot.classId !== 'fixed-period';
        });
        
        if (classConflict) {
          console.log(`⚠️ Boş slot doldurma - Sınıf çakışması: ${classItem.name} ${slot.day} ${slot.period}. ders`);
          hasConflict = true;
        }
        
        if (!hasConflict) {
          // Dersi ata
          schedule.schedule[slot.day][slot.period] = {
            subjectId: selectedMapping.subjectId,
            classId: classId,
            teacherId: selectedMapping.teacherId
          };
          
          // Slot'u doldurulmuş olarak işaretle
          const slotIndex = dailySlots[slot.day].findIndex(s => s.period === slot.period);
          if (slotIndex !== -1) {
            dailySlots[slot.day][slotIndex].filled = true;
          }
          
          // Eşleştirmedeki atanan saat sayısını artır
          selectedMapping.assignedHours++;
          
          // Context'i güncelle
          if (!context.teacherWorkloads[selectedMapping.teacherId]) {
            context.teacherWorkloads[selectedMapping.teacherId] = 0;
          }
          context.teacherWorkloads[selectedMapping.teacherId]++;
          
          if (!context.subjectDistribution[selectedMapping.subjectId]) {
            context.subjectDistribution[selectedMapping.subjectId] = 0;
          }
          context.subjectDistribution[selectedMapping.subjectId]++;
          
          const subject = subjects.find(s => s.id === selectedMapping.subjectId);
          const teacher = teachers.find(t => t.id === selectedMapping.teacherId);
          
          console.log(`✅ Boş slot dolduruldu: ${slot.day} ${slot.period}. ders: ${subject?.name} - ${teacher?.name}`);
          
          successfulAssignments++;
        }
      }
    }
    
    // IMPROVED: Hala boş slotlar varsa, herhangi bir öğretmenle doldur
    filledSlots = 0;
    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        if (schedule.schedule[day][period] && 
            schedule.schedule[day][period]?.classId !== 'fixed-period') {
          filledSlots++;
        }
      });
    });
    
    if (filledSlots < 45) {
      console.log(`⚠️ ${classItem.name} için hala ${45 - filledSlots} boş slot var, herhangi bir öğretmenle dolduruluyor...`);
      
      // Sınıf öğretmenini bul
      const classTeacherId = classItem.classTeacherId;
      const classTeacher = teachers.find(t => t.id === classTeacherId);
      
      if (classTeacher) {
        // Boş slotları bul
        DAYS.forEach(day => {
          dailySlots[day].forEach(slot => {
            if (!slot.filled) {
              // Çakışma kontrolü - Mevcut programlarda ve oluşturulmuş programlarda
              const teacherConflict = [...Object.values(context.classSchedules), ...existingSchedules].some(existingSchedule => {
                const existingSlot = existingSchedule.schedule[day]?.[slot.period];
                return existingSlot && 
                       existingSlot.teacherId === classTeacherId && 
                       existingSlot.classId !== 'fixed-period';
              });
              
              if (!teacherConflict) {
                // Sınıf öğretmeni ile doldur
                schedule.schedule[day][slot.period] = {
                  subjectId: '', // Genel ders
                  classId: classId,
                  teacherId: classTeacherId
                };
                
                // Slot'u doldurulmuş olarak işaretle
                slot.filled = true;
                
                console.log(`✅ Boş slot sınıf öğretmeni ile dolduruldu: ${day} ${slot.period}. ders: ${classTeacher.name}`);
              }
            }
          });
        });
      }
      
      // Hala boş slotlar varsa, herhangi bir öğretmenle doldur
      filledSlots = 0;
      DAYS.forEach(day => {
        PERIODS.forEach(period => {
          if (schedule.schedule[day][period] && 
              schedule.schedule[day][period]?.classId !== 'fixed-period') {
            filledSlots++;
          }
        });
      });
      
      if (filledSlots < 45) {
        console.log(`⚠️ ${classItem.name} için hala ${45 - filledSlots} boş slot var, rastgele öğretmenlerle dolduruluyor...`);
        
        // Tüm öğretmenleri al
        const availableTeachers = teachers.filter(t => t.level === classItem.level);
        
        if (availableTeachers.length > 0) {
          // Boş slotları bul
          DAYS.forEach(day => {
            dailySlots[day].forEach(slot => {
              if (!slot.filled) {
                // Rastgele bir öğretmen seç
                const randomTeacherIndex = Math.floor(Math.random() * availableTeachers.length);
                const randomTeacher = availableTeachers[randomTeacherIndex];
                
                // Çakışma kontrolü - Mevcut programlarda ve oluşturulmuş programlarda
                const teacherConflict = [...Object.values(context.classSchedules), ...existingSchedules].some(existingSchedule => {
                  const existingSlot = existingSchedule.schedule[day]?.[slot.period];
                  return existingSlot && 
                         existingSlot.teacherId === randomTeacher.id && 
                         existingSlot.classId !== 'fixed-period';
                });
                
                if (!teacherConflict) {
                  // Rastgele öğretmen ile doldur
                  schedule.schedule[day][slot.period] = {
                    subjectId: '', // Genel ders
                    classId: classId,
                    teacherId: randomTeacher.id
                  };
                  
                  // Slot'u doldurulmuş olarak işaretle
                  slot.filled = true;
                  
                  console.log(`✅ Boş slot rastgele öğretmen ile dolduruldu: ${day} ${slot.period}. ders: ${randomTeacher.name}`);
                }
              }
            });
          });
        }
      }
    }
  }

  // CRITICAL: Son kontrol - Her gün tam olarak 9 ders saati olmalı
  DAYS.forEach(day => {
    let filledSlotsForDay = 0;
    PERIODS.forEach(period => {
      if (schedule.schedule[day][period] && 
          schedule.schedule[day][period]?.classId !== 'fixed-period') {
        filledSlotsForDay++;
      }
    });
    
    console.log(`📊 ${classItem.name} - ${day} günü: ${filledSlotsForDay}/9 ders saati dolu`);
    
    if (filledSlotsForDay < 9) {
      context.warnings.push(`${classItem.name} - ${day} günü için 9 ders saati yerine sadece ${filledSlotsForDay} ders saati atanabildi`);
    }
  });

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
  subjects: Subject[],
  existingSchedules: Schedule[] = [] // Mevcut programlar
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
          // IMPROVED: Çakışma kontrolü - Hem öğretmen hem de sınıf bazlı
          let hasConflict = false;
          
          // 1. Öğretmen çakışması kontrolü - Mevcut programlarda ve oluşturulmuş programlarda
          const teacherConflict = [...Object.values(context.classSchedules), ...existingSchedules].some(existingSchedule => {
            const existingSlot = existingSchedule.schedule[day]?.[period];
            return existingSlot && 
                   existingSlot.teacherId === availableMapping.teacherId && 
                   existingSlot.classId !== 'fixed-period';
          });
          
          if (teacherConflict) {
            const teacher = teachers.find(t => t.id === availableMapping.teacherId);
            console.log(`⚠️ Boş slot doldurma - Öğretmen çakışması: ${teacher?.name} ${day} ${period}. ders`);
            hasConflict = true;
          }
          
          // 2. Sınıf çakışması kontrolü - Mevcut programlarda ve oluşturulmuş programlarda
          const classConflict = [...Object.values(context.classSchedules), ...existingSchedules].some(existingSchedule => {
            const existingSlot = existingSchedule.schedule[day]?.[period];
            return existingSlot && 
                   existingSlot.classId === availableMapping.classId && 
                   existingSlot.classId !== 'fixed-period';
          });
          
          if (classConflict) {
            const classItem = classes.find(c => c.id === availableMapping.classId);
            console.log(`⚠️ Boş slot doldurma - Sınıf çakışması: ${classItem?.name} ${day} ${period}. ders`);
            hasConflict = true;
          }
          
          if (!hasConflict) {
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
    // Maksimum 45 saat/hafta varsayımı
    teacherUtilization[teacherId] = Math.min((workload / 45) * 100, 100);
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