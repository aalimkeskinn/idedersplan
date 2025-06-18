// CRITICAL: Weekly Hour Limits Management System
// Bu sistem, kullanıcının ayarladığı haftalık saat limitlerini tam olarak uygular

import { Teacher, Class, Subject, Schedule, DAYS, PERIODS } from '../types';
import { WizardData, SubjectTeacherMapping } from '../types/wizard';

// CRITICAL: Weekly Hour Tracking Interface
export interface WeeklyHourTracker {
  subjectId: string;
  classId: string;
  targetHours: number;      // Kullanıcının ayarladığı hedef saat
  assignedHours: number;    // Şu ana kadar atanan saat
  remainingHours: number;   // Kalan saat
  isCompleted: boolean;     // Hedef tamamlandı mı?
  priority: 'high' | 'medium' | 'low';
  lastAssigned?: { day: string; period: string };
}

// CRITICAL: Hour Distribution Strategy
export interface HourDistributionStrategy {
  strategy: 'even' | 'concentrated' | 'balanced';
  maxConsecutive: number;   // Maksimum ardışık ders sayısı
  preferredDays: string[];  // Tercih edilen günler
  avoidDays: string[];      // Kaçınılacak günler
}

/**
 * Haftalık saat takipçilerini oluşturur
 * Her ders-sınıf kombinasyonu için ayrı takipçi oluşturur
 */
export const createWeeklyHourTrackers = (
  wizardData: WizardData,
  classes: Class[],
  subjects: Subject[]
): WeeklyHourTracker[] => {
  
  const trackers: WeeklyHourTracker[] = [];
  
  console.log('📊 Haftalık saat takipçileri oluşturuluyor...', {
    selectedClasses: wizardData.classes?.selectedClasses?.length || 0,
    selectedSubjects: wizardData.subjects?.selectedSubjects?.length || 0,
    subjectHours: Object.keys(wizardData.subjects?.subjectHours || {}).length
  });

  // Her sınıf için
  wizardData.classes?.selectedClasses?.forEach(classId => {
    const classItem = classes.find(c => c.id === classId);
    if (!classItem) return;

    console.log(`📚 ${classItem.name} sınıfı için saat takipçileri oluşturuluyor...`);

    // Her ders için
    wizardData.subjects?.selectedSubjects?.forEach(subjectId => {
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject) return;

      // Kullanıcının ayarladığı haftalık saat (öncelik: wizard ayarı, fallback: ders varsayılanı)
      const targetHours = wizardData.subjects?.subjectHours?.[subjectId] || subject.weeklyHours || 1;
      
      // Kullanıcının ayarladığı öncelik
      const priority = wizardData.subjects?.subjectPriorities?.[subjectId] || 'medium';

      const tracker: WeeklyHourTracker = {
        subjectId,
        classId,
        targetHours,
        assignedHours: 0,
        remainingHours: targetHours,
        isCompleted: false,
        priority
      };

      trackers.push(tracker);
      
      console.log(`✅ Takipçi oluşturuldu: ${classItem.name} - ${subject.name} (${targetHours} saat, ${priority} öncelik)`);
    });
  });

  console.log(`📊 Toplam ${trackers.length} saat takipçisi oluşturuldu`);
  
  // Öncelik sırasına göre sırala
  return sortTrackersByPriority(trackers);
};

/**
 * Takipçileri öncelik sırasına göre sıralar
 * Yüksek öncelikli dersler önce atanır
 */
export const sortTrackersByPriority = (
  trackers: WeeklyHourTracker[]
): WeeklyHourTracker[] => {
  
  const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
  
  return [...trackers].sort((a, b) => {
    // Önce tamamlanmamış olanlar
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    
    // Sonra öncelik sırası
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // Son olarak kalan saat sayısı (az kalanlar önce)
    return a.remainingHours - b.remainingHours;
  });
};

/**
 * Belirli bir ders için saat atanabilir mi kontrol eder
 */
export const canAssignHour = (
  trackers: WeeklyHourTracker[],
  subjectId: string,
  classId: string
): { canAssign: boolean; reason: string; tracker?: WeeklyHourTracker } => {
  
  const tracker = trackers.find(t => 
    t.subjectId === subjectId && 
    t.classId === classId
  );

  if (!tracker) {
    return {
      canAssign: false,
      reason: 'Bu ders-sınıf kombinasyonu için takipçi bulunamadı'
    };
  }

  if (tracker.isCompleted) {
    return {
      canAssign: false,
      reason: `Haftalık ${tracker.targetHours} saat limiti tamamlandı`,
      tracker
    };
  }

  if (tracker.remainingHours <= 0) {
    return {
      canAssign: false,
      reason: `Haftalık limit doldu (${tracker.assignedHours}/${tracker.targetHours})`,
      tracker
    };
  }

  return {
    canAssign: true,
    reason: `${tracker.remainingHours} saat daha atanabilir`,
    tracker
  };
};

/**
 * Bir dersin atanması durumunda takipçiyi günceller
 */
export const assignHourToTracker = (
  trackers: WeeklyHourTracker[],
  subjectId: string,
  classId: string,
  day: string,
  period: string
): WeeklyHourTracker[] => {
  
  return trackers.map(tracker => {
    if (tracker.subjectId === subjectId && tracker.classId === classId) {
      const newAssignedHours = tracker.assignedHours + 1;
      const newRemainingHours = tracker.targetHours - newAssignedHours;
      
      console.log(`📈 Saat atandı: ${subjectId} - ${classId} (${newAssignedHours}/${tracker.targetHours})`);
      
      return {
        ...tracker,
        assignedHours: newAssignedHours,
        remainingHours: Math.max(0, newRemainingHours),
        isCompleted: newAssignedHours >= tracker.targetHours,
        lastAssigned: { day, period }
      };
    }
    return tracker;
  });
};

/**
 * Belirli bir slot için en uygun dersi bulur (haftalık saat limitlerine göre)
 */
export const findBestSubjectForSlot = (
  trackers: WeeklyHourTracker[],
  classId: string,
  day: string,
  period: string,
  strategy: HourDistributionStrategy = getDefaultStrategy()
): WeeklyHourTracker | null => {
  
  // Bu sınıf için tamamlanmamış takipçileri al
  const availableTrackers = trackers.filter(t => 
    t.classId === classId && 
    !t.isCompleted && 
    t.remainingHours > 0
  );

  if (availableTrackers.length === 0) {
    console.log(`⚠️ ${classId} sınıfı için ${day} ${period}. ders: Atanabilir ders kalmadı`);
    return null;
  }

  // Strateji'ye göre filtrele
  const filteredTrackers = applyDistributionStrategy(
    availableTrackers,
    day,
    period,
    strategy
  );

  if (filteredTrackers.length === 0) {
    console.log(`⚠️ ${classId} sınıfı için ${day} ${period}. ders: Strateji kriterlerine uygun ders yok`);
    return null;
  }

  // Öncelik sırasına göre sırala ve en uygun olanı döndür
  const sortedTrackers = sortTrackersByPriority(filteredTrackers);
  const bestTracker = sortedTrackers[0];
  
  console.log(`✅ ${classId}/${day}/${period} için en uygun ders: ${bestTracker.subjectId} (${bestTracker.priority} öncelik, ${bestTracker.remainingHours} saat kaldı)`);
  
  return bestTracker;
};

/**
 * Dağıtım stratejisini uygular
 */
const applyDistributionStrategy = (
  trackers: WeeklyHourTracker[],
  day: string,
  period: string,
  strategy: HourDistributionStrategy
): WeeklyHourTracker[] => {
  
  // Tercih edilen/kaçınılan günleri kontrol et
  if (strategy.avoidDays.includes(day)) {
    // Sadece yüksek öncelikli dersleri kabul et
    return trackers.filter(t => t.priority === 'high');
  }

  // Ardışık ders kontrolü
  return trackers.filter(tracker => {
    // Son atanan ders bu dersse ve aynı günse, ardışık kontrolü yap
    if (tracker.lastAssigned && tracker.lastAssigned.day === day) {
      const lastPeriod = parseInt(tracker.lastAssigned.period);
      const currentPeriod = parseInt(period);
      
      // Ardışık ders sayısını kontrol et
      if (Math.abs(currentPeriod - lastPeriod) === 1) {
        // Ardışık ders sayısını hesapla
        let consecutiveCount = 1;
        
        // TODO: Daha gelişmiş ardışık ders sayısı hesaplama
        
        return consecutiveCount < strategy.maxConsecutive;
      }
    }
    
    return true;
  });
};

/**
 * Varsayılan dağıtım stratejisini döndürür
 */
export const getDefaultStrategy = (): HourDistributionStrategy => {
  return {
    strategy: 'balanced',
    maxConsecutive: 2,
    preferredDays: ['Salı', 'Çarşamba', 'Perşembe'],
    avoidDays: ['Pazartesi', 'Cuma']
  };
};

/**
 * Takipçi istatistiklerini hesaplar
 */
export const calculateTrackerStatistics = (
  trackers: WeeklyHourTracker[]
): {
  totalTargetHours: number;
  totalAssignedHours: number;
  completionRate: number;
  completedSubjects: number;
  incompleteSubjects: number;
  subjectCompletion: { [subjectId: string]: number };
  classCompletion: { [classId: string]: number };
} => {
  
  const totalTargetHours = trackers.reduce((sum, t) => sum + t.targetHours, 0);
  const totalAssignedHours = trackers.reduce((sum, t) => sum + t.assignedHours, 0);
  const completedSubjects = trackers.filter(t => t.isCompleted).length;
  
  // Ders bazında tamamlanma oranı
  const subjectCompletion: { [subjectId: string]: number } = {};
  const subjectGroups = groupBy(trackers, 'subjectId');
  
  Object.entries(subjectGroups).forEach(([subjectId, subjectTrackers]) => {
    const targetHours = subjectTrackers.reduce((sum, t) => sum + t.targetHours, 0);
    const assignedHours = subjectTrackers.reduce((sum, t) => sum + t.assignedHours, 0);
    subjectCompletion[subjectId] = targetHours > 0 ? (assignedHours / targetHours) * 100 : 0;
  });

  // Sınıf bazında tamamlanma oranı
  const classCompletion: { [classId: string]: number } = {};
  const classGroups = groupBy(trackers, 'classId');
  
  Object.entries(classGroups).forEach(([classId, classTrackers]) => {
    const targetHours = classTrackers.reduce((sum, t) => sum + t.targetHours, 0);
    const assignedHours = classTrackers.reduce((sum, t) => sum + t.assignedHours, 0);
    classCompletion[classId] = targetHours > 0 ? (assignedHours / targetHours) * 100 : 0;
  });

  return {
    totalTargetHours,
    totalAssignedHours,
    completionRate: totalTargetHours > 0 ? (totalAssignedHours / totalTargetHours) * 100 : 0,
    completedSubjects,
    incompleteSubjects: trackers.length - completedSubjects,
    subjectCompletion,
    classCompletion
  };
};

/**
 * Nesneleri bir özelliğe göre gruplar
 */
const groupBy = <T>(array: T[], key: keyof T): { [key: string]: T[] } => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as { [key: string]: T[] });
};

/**
 * Mevcut programdaki ders saatlerini takipçilere yansıtır
 */
export const syncTrackersWithSchedule = (
  trackers: WeeklyHourTracker[],
  schedule: Schedule
): WeeklyHourTracker[] => {
  
  const updatedTrackers = [...trackers];
  
  // Her slot için kontrol et
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = schedule.schedule[day][period];
      
      // Sabit periyotları atla
      if (!slot || slot.classId === 'fixed-period') {
        return;
      }
      
      // Bu slot için takipçiyi bul ve güncelle
      const trackerIndex = updatedTrackers.findIndex(t => 
        t.subjectId === slot.subjectId && 
        t.classId === slot.classId
      );
      
      if (trackerIndex !== -1) {
        updatedTrackers[trackerIndex] = {
          ...updatedTrackers[trackerIndex],
          assignedHours: updatedTrackers[trackerIndex].assignedHours + 1,
          remainingHours: Math.max(0, updatedTrackers[trackerIndex].targetHours - (updatedTrackers[trackerIndex].assignedHours + 1)),
          lastAssigned: { day, period }
        };
        
        // Tamamlanma durumunu güncelle
        if (updatedTrackers[trackerIndex].assignedHours >= updatedTrackers[trackerIndex].targetHours) {
          updatedTrackers[trackerIndex].isCompleted = true;
        }
      }
    });
  });
  
  return updatedTrackers;
};

/**
 * Programdaki toplam ders saati sayısını hesaplar
 */
export const countTotalAssignedHours = (schedule: Schedule): number => {
  let count = 0;
  
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = schedule.schedule[day][period];
      if (slot && slot.classId !== 'fixed-period') {
        count++;
      }
    });
  });
  
  return count;
};

/**
 * Programdaki ders dağılımını hesaplar
 */
export const calculateSubjectDistribution = (
  schedule: Schedule
): { [subjectId: string]: number } => {
  
  const distribution: { [subjectId: string]: number } = {};
  
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = schedule.schedule[day][period];
      if (slot && slot.subjectId && slot.classId !== 'fixed-period') {
        if (!distribution[slot.subjectId]) {
          distribution[slot.subjectId] = 0;
        }
        distribution[slot.subjectId]++;
      }
    });
  });
  
  return distribution;
};

/**
 * Programdaki öğretmen dağılımını hesaplar
 */
export const calculateTeacherDistribution = (
  schedule: Schedule
): { [teacherId: string]: number } => {
  
  const distribution: { [teacherId: string]: number } = {};
  
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = schedule.schedule[day][period];
      if (slot && slot.teacherId && slot.classId !== 'fixed-period') {
        if (!distribution[slot.teacherId]) {
          distribution[slot.teacherId] = 0;
        }
        distribution[slot.teacherId]++;
      }
    });
  });
  
  return distribution;
};

/**
 * Programdaki günlük ders dağılımını hesaplar
 */
export const calculateDailyDistribution = (
  schedule: Schedule
): { [day: string]: number } => {
  
  const distribution: { [day: string]: number } = {};
  
  DAYS.forEach(day => {
    distribution[day] = 0;
    
    PERIODS.forEach(period => {
      const slot = schedule.schedule[day][period];
      if (slot && slot.classId !== 'fixed-period') {
        distribution[day]++;
      }
    });
  });
  
  return distribution;
};

/**
 * Programdaki ders saati dağılımını hesaplar
 */
export const calculatePeriodDistribution = (
  schedule: Schedule
): { [period: string]: number } => {
  
  const distribution: { [period: string]: number } = {};
  
  PERIODS.forEach(period => {
    distribution[period] = 0;
    
    DAYS.forEach(day => {
      const slot = schedule.schedule[day][period];
      if (slot && slot.classId !== 'fixed-period') {
        distribution[period]++;
      }
    });
  });
  
  return distribution;
};