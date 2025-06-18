import { Teacher, Class, Subject, DAYS, PERIODS } from '../types';
import { WizardData, SubjectTeacherMapping, ScheduleGenerationContext } from '../types/wizard';

// CRITICAL: Subject-Teacher Mapping System
// Bu sistem, hangi öğretmenin hangi dersi hangi sınıfa vereceğini belirler

/**
 * Ders-öğretmen eşleştirmelerini oluşturur
 * Bu fonksiyon, sihirbazdan gelen verileri kullanarak
 * her sınıf için uygun öğretmen-ders eşleştirmelerini yapar
 */
export const createSubjectTeacherMappings = (
  wizardData: WizardData,
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[]
): SubjectTeacherMapping[] => {
  const mappings: SubjectTeacherMapping[] = [];
  
  console.log('🔄 Ders-öğretmen eşleştirmeleri oluşturuluyor...', {
    selectedClasses: wizardData.classes?.selectedClasses?.length || 0,
    selectedSubjects: wizardData.subjects?.selectedSubjects?.length || 0,
    selectedTeachers: wizardData.teachers?.selectedTeachers?.length || 0
  });

  // Her sınıf için eşleştirme yap
  wizardData.classes?.selectedClasses?.forEach(classId => {
    const classItem = classes.find(c => c.id === classId);
    if (!classItem) {
      console.warn(`⚠️ Sınıf bulunamadı: ${classId}`);
      return;
    }

    console.log(`📚 ${classItem.name} sınıfı için eşleştirmeler oluşturuluyor...`);

    // Bu sınıf için atanan öğretmenler (sınıf ekleme sırasında seçilenler)
    const classTeachers = classItem.teacherIds || [];
    console.log(`👥 ${classItem.name} için atanan öğretmenler:`, classTeachers.length);

    // Seçilen dersler için eşleştirme yap
    wizardData.subjects?.selectedSubjects?.forEach(subjectId => {
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject) {
        console.warn(`⚠️ Ders bulunamadı: ${subjectId}`);
        return;
      }

      // Bu ders için haftalık saat sayısı
      const weeklyHours = wizardData.subjects?.subjectHours?.[subjectId] || subject.weeklyHours || 1;
      
      // Bu ders için öncelik
      const priority = wizardData.subjects?.subjectPriorities?.[subjectId] || 'medium';

      console.log(`📖 ${subject.name} dersi için öğretmen aranıyor... (${weeklyHours} saat/hafta)`);

      // Bu ders için en uygun öğretmeni bul
      const suitableTeacher = findSuitableTeacher(
        subject,
        classTeachers,
        teachers,
        classItem
      );

      if (suitableTeacher) {
        const mapping: SubjectTeacherMapping = {
          id: `${classId}-${subjectId}-${suitableTeacher.id}`,
          subjectId,
          teacherId: suitableTeacher.id,
          classId,
          weeklyHours,
          assignedHours: 0,
          priority,
          isValid: true,
          compatibilityScore: calculateCompatibilityScore(suitableTeacher, subject, classItem),
          createdAt: new Date()
        };

        mappings.push(mapping);
        
        console.log(`✅ Eşleştirme oluşturuldu: ${classItem.name} - ${subject.name} - ${suitableTeacher.name} (${weeklyHours} saat)`);
      } else {
        console.error(`❌ ${classItem.name} sınıfı için ${subject.name} dersine uygun öğretmen bulunamadı!`);
        
        // Eşleştirme bulunamadığında da kaydet ama geçersiz olarak işaretle
        const mapping: SubjectTeacherMapping = {
          id: `${classId}-${subjectId}-unassigned`,
          subjectId,
          teacherId: '', // Boş bırak
          classId,
          weeklyHours,
          assignedHours: 0,
          priority,
          isValid: false,
          compatibilityScore: 0,
          createdAt: new Date()
        };

        mappings.push(mapping);
      }
    });
  });

  console.log(`📊 Toplam ${mappings.length} eşleştirme oluşturuldu`);
  console.log(`✅ Geçerli eşleştirmeler: ${mappings.filter(m => m.isValid).length}`);
  console.log(`❌ Geçersiz eşleştirmeler: ${mappings.filter(m => !m.isValid).length}`);

  return mappings;
};

/**
 * Bir ders için en uygun öğretmeni bulur
 * Öncelik sırası:
 * 1. Sınıfa atanan öğretmenler arasından branş ve seviye uyumlu olanlar
 * 2. Tüm seçili öğretmenler arasından branş ve seviye uyumlu olanlar
 * 3. Sınıfa atanan öğretmenler arasından sadece seviye uyumlu olanlar
 * 4. Tüm seçili öğretmenler arasından sadece seviye uyumlu olanlar
 */
export const findSuitableTeacher = (
  subject: Subject,
  classTeacherIds: string[],
  allTeachers: Teacher[],
  classItem: Class
): Teacher | null => {
  
  console.log(`🔍 ${subject.name} dersi için uygun öğretmen aranıyor...`, {
    subjectBranch: subject.branch,
    subjectLevel: subject.level,
    classLevel: classItem.level,
    classTeachersCount: classTeacherIds.length
  });

  // Sınıfa atanan öğretmenleri al
  const classTeachers = allTeachers.filter(t => classTeacherIds.includes(t.id));
  
  // Tüm seçili öğretmenleri al (fallback için)
  const allSelectedTeachers = allTeachers; // Burada wizardData'dan seçili öğretmenleri alabilirsiniz

  // 1. Öncelik: Sınıfa atanan öğretmenler arasından branş ve seviye uyumlu
  let suitableTeacher = classTeachers.find(teacher => 
    teacher.branch === subject.branch && 
    teacher.level === subject.level
  );

  if (suitableTeacher) {
    console.log(`✅ Mükemmel eşleştirme bulundu (sınıf öğretmeni): ${suitableTeacher.name} (${suitableTeacher.branch} - ${suitableTeacher.level})`);
    return suitableTeacher;
  }

  // 2. Öncelik: Tüm öğretmenler arasından branş ve seviye uyumlu
  suitableTeacher = allSelectedTeachers.find(teacher => 
    teacher.branch === subject.branch && 
    teacher.level === subject.level
  );

  if (suitableTeacher) {
    console.log(`✅ İyi eşleştirme bulundu (genel): ${suitableTeacher.name} (${suitableTeacher.branch} - ${suitableTeacher.level})`);
    return suitableTeacher;
  }

  // 3. Öncelik: Sınıfa atanan öğretmenler arasından sadece seviye uyumlu
  suitableTeacher = classTeachers.find(teacher => 
    teacher.level === subject.level
  );

  if (suitableTeacher) {
    console.log(`⚠️ Kısmi eşleştirme bulundu (sınıf öğretmeni, sadece seviye): ${suitableTeacher.name} (${suitableTeacher.branch} - ${suitableTeacher.level})`);
    return suitableTeacher;
  }

  // 4. Öncelik: Tüm öğretmenler arasından sadece seviye uyumlu
  suitableTeacher = allSelectedTeachers.find(teacher => 
    teacher.level === subject.level
  );

  if (suitableTeacher) {
    console.log(`⚠️ Zayıf eşleştirme bulundu (genel, sadece seviye): ${suitableTeacher.name} (${suitableTeacher.branch} - ${suitableTeacher.level})`);
    return suitableTeacher;
  }

  // 5. Son çare: Sınıfa atanan herhangi bir öğretmen
  if (classTeachers.length > 0) {
    suitableTeacher = classTeachers[0];
    console.log(`⚠️ Son çare eşleştirme (sınıf öğretmeni): ${suitableTeacher.name} (${suitableTeacher.branch} - ${suitableTeacher.level})`);
    return suitableTeacher;
  }

  console.error(`❌ ${subject.name} dersi için hiç uygun öğretmen bulunamadı!`);
  return null;
};

/**
 * Öğretmen-ders-sınıf uyumluluğu skorunu hesaplar
 * 100: Mükemmel uyum (branş ve seviye eşleşiyor)
 * 75: İyi uyum (sadece seviye eşleşiyor)
 * 50: Orta uyum (sadece branş eşleşiyor)
 * 25: Zayıf uyum (hiçbiri eşleşmiyor ama aynı genel kategori)
 * 0: Uyumsuz
 */
export const calculateCompatibilityScore = (
  teacher: Teacher,
  subject: Subject,
  classItem: Class
): number => {
  let score = 0;

  // Seviye uyumluluğu (50 puan)
  if (teacher.level === subject.level && teacher.level === classItem.level) {
    score += 50;
  } else if (teacher.level === classItem.level) {
    score += 25; // En azından sınıf seviyesi uyumlu
  }

  // Branş uyumluluğu (50 puan)
  if (teacher.branch === subject.branch) {
    score += 50;
  } else if (isRelatedBranch(teacher.branch, subject.branch)) {
    score += 25; // İlgili branş
  }

  return score;
};

/**
 * İki branşın birbiriyle ilgili olup olmadığını kontrol eder
 */
const isRelatedBranch = (teacherBranch: string, subjectBranch: string): boolean => {
  const relatedBranches: { [key: string]: string[] } = {
    'Matematik': ['Fen Bilimleri', 'Fizik', 'Kimya'],
    'Fen Bilimleri': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
    'Türkçe': ['Edebiyat', 'Dil ve Anlatım'],
    'Sosyal Bilgiler': ['Tarih', 'Coğrafya', 'Vatandaşlık'],
    'İngilizce': ['Almanca', 'Fransızca'], // Yabancı diller
    'Beden Eğitimi': ['Spor', 'Sağlık'],
    'Müzik': ['Sanat', 'Resim'],
    'Resim': ['Sanat', 'Müzik']
  };

  return relatedBranches[teacherBranch]?.includes(subjectBranch) || 
         relatedBranches[subjectBranch]?.includes(teacherBranch) || 
         false;
};

/**
 * Haftalık saat limitlerini kontrol eder
 */
export const checkWeeklyHourLimits = (
  mappings: SubjectTeacherMapping[],
  subjectId: string,
  classId: string
): { canAssign: boolean; reason: string; remainingHours: number } => {
  
  const mapping = mappings.find(m => 
    m.subjectId === subjectId && 
    m.classId === classId && 
    m.isValid
  );

  if (!mapping) {
    return {
      canAssign: false,
      reason: 'Bu ders için geçerli öğretmen eşleştirmesi bulunamadı',
      remainingHours: 0
    };
  }

  const remainingHours = mapping.weeklyHours - mapping.assignedHours;

  if (remainingHours <= 0) {
    return {
      canAssign: false,
      reason: `${mapping.weeklyHours} saatlik haftalık limit doldu`,
      remainingHours: 0
    };
  }

  return {
    canAssign: true,
    reason: `${remainingHours} saat daha atanabilir`,
    remainingHours
  };
};

/**
 * Bir dersin atanması durumunda mapping'i günceller
 */
export const updateMappingAssignment = (
  mappings: SubjectTeacherMapping[],
  subjectId: string,
  classId: string,
  increment: number = 1
): SubjectTeacherMapping[] => {
  
  return mappings.map(mapping => {
    if (mapping.subjectId === subjectId && 
        mapping.classId === classId && 
        mapping.isValid) {
      
      return {
        ...mapping,
        assignedHours: Math.min(
          mapping.assignedHours + increment,
          mapping.weeklyHours
        )
      };
    }
    return mapping;
  });
};

/**
 * Eşleştirme istatistiklerini hesaplar
 */
export const calculateMappingStatistics = (
  mappings: SubjectTeacherMapping[]
): {
  totalMappings: number;
  validMappings: number;
  invalidMappings: number;
  totalHoursNeeded: number;
  totalHoursAssigned: number;
  completionRate: number;
  subjectCoverage: { [subjectId: string]: number };
  teacherWorkload: { [teacherId: string]: number };
} => {
  
  const validMappings = mappings.filter(m => m.isValid);
  const totalHoursNeeded = validMappings.reduce((sum, m) => sum + m.weeklyHours, 0);
  const totalHoursAssigned = validMappings.reduce((sum, m) => sum + m.assignedHours, 0);
  
  // Ders kapsamı hesapla
  const subjectCoverage: { [subjectId: string]: number } = {};
  validMappings.forEach(mapping => {
    if (!subjectCoverage[mapping.subjectId]) {
      subjectCoverage[mapping.subjectId] = 0;
    }
    subjectCoverage[mapping.subjectId] += mapping.assignedHours;
  });

  // Öğretmen iş yükü hesapla
  const teacherWorkload: { [teacherId: string]: number } = {};
  validMappings.forEach(mapping => {
    if (mapping.teacherId && !teacherWorkload[mapping.teacherId]) {
      teacherWorkload[mapping.teacherId] = 0;
    }
    if (mapping.teacherId) {
      teacherWorkload[mapping.teacherId] += mapping.assignedHours;
    }
  });

  return {
    totalMappings: mappings.length,
    validMappings: validMappings.length,
    invalidMappings: mappings.length - validMappings.length,
    totalHoursNeeded,
    totalHoursAssigned,
    completionRate: totalHoursNeeded > 0 ? (totalHoursAssigned / totalHoursNeeded) * 100 : 0,
    subjectCoverage,
    teacherWorkload
  };
};

/**
 * Eşleştirmeleri öncelik sırasına göre sıralar
 */
export const sortMappingsByPriority = (
  mappings: SubjectTeacherMapping[]
): SubjectTeacherMapping[] => {
  
  const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
  
  return [...mappings].sort((a, b) => {
    // Önce geçerlilik
    if (a.isValid !== b.isValid) {
      return a.isValid ? -1 : 1;
    }
    
    // Sonra öncelik
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // Son olarak uyumluluk skoru
    return b.compatibilityScore - a.compatibilityScore;
  });
};

/**
 * Belirli bir slot için en uygun eşleştirmeyi bulur
 */
export const findBestMappingForSlot = (
  mappings: SubjectTeacherMapping[],
  day: string,
  period: string,
  classId: string
): SubjectTeacherMapping | null => {
  
  // Bu sınıf için geçerli eşleştirmeleri al
  const classMappings = mappings.filter(m => 
    m.classId === classId && 
    m.isValid &&
    m.assignedHours < m.weeklyHours // Henüz limit dolmamış
  );

  if (classMappings.length === 0) {
    return null;
  }

  // Öncelik sırasına göre sırala
  const sortedMappings = sortMappingsByPriority(classMappings);
  
  // En yüksek öncelikli ve uyumlu olanı döndür
  return sortedMappings[0] || null;
};

/**
 * Eşleştirme doğrulama
 */
export const validateMappings = (
  mappings: SubjectTeacherMapping[],
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[]
): { isValid: boolean; errors: string[]; warnings: string[] } => {
  
  const errors: string[] = [];
  const warnings: string[] = [];

  mappings.forEach(mapping => {
    const teacher = teachers.find(t => t.id === mapping.teacherId);
    const classItem = classes.find(c => c.id === mapping.classId);
    const subject = subjects.find(s => s.id === mapping.subjectId);

    // Temel varlık kontrolü
    if (!teacher && mapping.isValid) {
      errors.push(`Eşleştirme ${mapping.id}: Öğretmen bulunamadı`);
    }
    if (!classItem) {
      errors.push(`Eşleştirme ${mapping.id}: Sınıf bulunamadı`);
    }
    if (!subject) {
      errors.push(`Eşleştirme ${mapping.id}: Ders bulunamadı`);
    }

    // Uyumluluk kontrolü
    if (teacher && subject && classItem) {
      if (teacher.level !== subject.level) {
        warnings.push(`${teacher.name}: Seviye uyumsuzluğu (${teacher.level} ≠ ${subject.level})`);
      }
      if (teacher.branch !== subject.branch) {
        warnings.push(`${teacher.name}: Branş uyumsuzluğu (${teacher.branch} ≠ ${subject.branch})`);
      }
      if (teacher.level !== classItem.level) {
        warnings.push(`${teacher.name}: Sınıf seviyesi uyumsuzluğu (${teacher.level} ≠ ${classItem.level})`);
      }
    }

    // Haftalık saat kontrolü
    if (mapping.weeklyHours <= 0) {
      errors.push(`Eşleştirme ${mapping.id}: Geçersiz haftalık saat sayısı`);
    }
    if (mapping.assignedHours > mapping.weeklyHours) {
      errors.push(`Eşleştirme ${mapping.id}: Atanan saat haftalık limitten fazla`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};