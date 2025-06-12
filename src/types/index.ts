export interface Teacher {
  id: string;
  name: string;
  branch: string;
  level: 'Anaokulu' | 'İlkokul' | 'Ortaokul';
  createdAt: Date;
}

export interface Class {
  id: string;
  name: string;
  level: 'Anaokulu' | 'İlkokul' | 'Ortaokul';
  createdAt: Date;
}

export interface Subject {
  id: string;
  name: string;
  branch: string;
  level: 'Anaokulu' | 'İlkokul' | 'Ortaokul';
  weeklyHours: number;
  createdAt: Date;
}

export interface ScheduleSlot {
  subjectId?: string;
  classId?: string;
  teacherId?: string; // Added for class-based scheduling
}

export interface Schedule {
  id: string;
  teacherId: string;
  schedule: {
    [day: string]: {
      [period: string]: ScheduleSlot;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
export const PERIODS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
export const EDUCATION_LEVELS = ['Anaokulu', 'İlkokul', 'Ortaokul'] as const;

// YENI: Ders saatleri zaman dilimleri
export interface TimePeriod {
  period: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
  breakType?: 'prep' | 'breakfast' | 'lunch';
  breakDuration?: number;
}

// İlkokul için ders saatleri (10 ders + molalar)
export const PRIMARY_SCHOOL_TIME_PERIODS: TimePeriod[] = [
  { period: 'breakfast1', startTime: '08:30', endTime: '08:50', isBreak: true, breakType: 'breakfast', breakDuration: 20 },
  { period: '1', startTime: '08:50', endTime: '09:25' },
  { period: 'break1', startTime: '09:25', endTime: '09:35', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '2', startTime: '09:35', endTime: '10:10' },
  { period: 'break2', startTime: '10:10', endTime: '10:20', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '3', startTime: '10:20', endTime: '10:55' },
  { period: 'break3', startTime: '10:55', endTime: '11:05', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '4', startTime: '11:05', endTime: '11:40' },
  { period: 'break4', startTime: '11:40', endTime: '11:50', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '5', startTime: '11:50', endTime: '12:25' },
  { period: 'lunch', startTime: '12:25', endTime: '12:30', isBreak: true, breakType: 'lunch', breakDuration: 5 },
  { period: '6', startTime: '12:30', endTime: '13:05' },
  { period: 'break5', startTime: '13:05', endTime: '13:15', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '7', startTime: '13:15', endTime: '13:50' },
  { period: 'break6', startTime: '13:50', endTime: '14:00', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '8', startTime: '14:00', endTime: '14:35' },
  { period: 'breakfast2', startTime: '14:35', endTime: '14:45', isBreak: true, breakType: 'breakfast', breakDuration: 10 },
  { period: '9', startTime: '14:45', endTime: '15:20' },
  { period: 'break7', startTime: '15:20', endTime: '15:25', isBreak: true, breakType: 'prep', breakDuration: 5 },
  { period: '10', startTime: '15:25', endTime: '16:00' }
];

// UPDATED: Ortaokul için ders saatleri (1. ve 2. ders arasına 20 dakikalık kahvaltı eklendi)
export const MIDDLE_SCHOOL_TIME_PERIODS: TimePeriod[] = [
  { period: 'prep', startTime: '08:30', endTime: '08:40', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '1', startTime: '08:40', endTime: '09:15' },
  { period: 'breakfast', startTime: '09:15', endTime: '09:35', isBreak: true, breakType: 'breakfast', breakDuration: 20 },
  { period: '2', startTime: '09:35', endTime: '10:10' },
  { period: 'break1', startTime: '10:10', endTime: '10:20', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '3', startTime: '10:20', endTime: '10:55' },
  { period: 'break2', startTime: '10:55', endTime: '11:05', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '4', startTime: '11:05', endTime: '11:40' },
  { period: 'break3', startTime: '11:40', endTime: '11:50', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '5', startTime: '11:50', endTime: '12:25' },
  { period: 'break4', startTime: '12:25', endTime: '12:30', isBreak: true, breakType: 'prep', breakDuration: 5 },
  { period: '6', startTime: '12:30', endTime: '13:05' },
  { period: 'break5', startTime: '13:05', endTime: '13:15', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '7', startTime: '13:15', endTime: '13:50' },
  { period: 'break6', startTime: '13:50', endTime: '14:00', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '8', startTime: '14:00', endTime: '14:35' },
  { period: 'breakfast2', startTime: '14:35', endTime: '14:45', isBreak: true, breakType: 'breakfast', breakDuration: 10 },
  { period: '9', startTime: '14:45', endTime: '15:20' },
  { period: 'break7', startTime: '15:20', endTime: '15:25', isBreak: true, breakType: 'prep', breakDuration: 5 },
  { period: '10', startTime: '15:25', endTime: '16:00' }
];

// Anaokulu için genel ders saatleri (10 ders)
export const KINDERGARTEN_TIME_PERIODS: TimePeriod[] = [
  { period: 'breakfast1', startTime: '08:30', endTime: '08:50', isBreak: true, breakType: 'breakfast', breakDuration: 20 },
  { period: '1', startTime: '08:50', endTime: '09:25' },
  { period: 'break1', startTime: '09:25', endTime: '09:35', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '2', startTime: '09:35', endTime: '10:10' },
  { period: 'break2', startTime: '10:10', endTime: '10:20', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '3', startTime: '10:20', endTime: '10:55' },
  { period: 'break3', startTime: '10:55', endTime: '11:05', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '4', startTime: '11:05', endTime: '11:40' },
  { period: 'break4', startTime: '11:40', endTime: '11:50', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '5', startTime: '11:50', endTime: '12:25' },
  { period: 'lunch', startTime: '12:25', endTime: '12:30', isBreak: true, breakType: 'lunch', breakDuration: 5 },
  { period: '6', startTime: '12:30', endTime: '13:05' },
  { period: 'break5', startTime: '13:05', endTime: '13:15', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '7', startTime: '13:15', endTime: '13:50' },
  { period: 'break6', startTime: '13:50', endTime: '14:00', isBreak: true, breakType: 'prep', breakDuration: 10 },
  { period: '8', startTime: '14:00', endTime: '14:35' },
  { period: 'breakfast2', startTime: '14:35', endTime: '14:45', isBreak: true, breakType: 'breakfast', breakDuration: 10 },
  { period: '9', startTime: '14:45', endTime: '15:20' },
  { period: 'break7', startTime: '15:20', endTime: '15:25', isBreak: true, breakType: 'prep', breakDuration: 5 },
  { period: '10', startTime: '15:25', endTime: '16:00' }
];

// Zaman dilimi yardımcı fonksiyonları
export const getTimePeriods = (level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): TimePeriod[] => {
  switch (level) {
    case 'İlkokul':
      return PRIMARY_SCHOOL_TIME_PERIODS;
    case 'Ortaokul':
      return MIDDLE_SCHOOL_TIME_PERIODS;
    case 'Anaokulu':
      return KINDERGARTEN_TIME_PERIODS;
    default:
      return PRIMARY_SCHOOL_TIME_PERIODS; // Default to primary school
  }
};

export const getTimeForPeriod = (period: string, level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): TimePeriod | undefined => {
  const timePeriods = getTimePeriods(level);
  return timePeriods.find(tp => tp.period === period && !tp.isBreak);
};

export const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${startTime} - ${endTime}`;
};

export const getPeriodDuration = (period: string, level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): number => {
  const timePeriod = getTimeForPeriod(period, level);
  if (!timePeriod) return 35; // Default 35 minutes
  
  const start = new Date(`2000-01-01 ${timePeriod.startTime}`);
  const end = new Date(`2000-01-01 ${timePeriod.endTime}`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // Minutes
};

// Aktif ders saatlerini al (molalar hariç)
export const getActivePeriods = (level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): TimePeriod[] => {
  const timePeriods = getTimePeriods(level);
  return timePeriods.filter(tp => !tp.isBreak);
};

// Mola saatlerini al
export const getBreakPeriods = (level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): TimePeriod[] => {
  const timePeriods = getTimePeriods(level);
  return timePeriods.filter(tp => tp.isBreak);
};

// Kahvaltı saatlerini al
export const getBreakfastPeriods = (level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): TimePeriod[] => {
  const timePeriods = getTimePeriods(level);
  return timePeriods.filter(tp => tp.isBreak && tp.breakType === 'breakfast');
};

// Yemek saatlerini al
export const getLunchPeriods = (level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): TimePeriod[] => {
  const timePeriods = getTimePeriods(level);
  return timePeriods.filter(tp => tp.isBreak && tp.breakType === 'lunch');
};

// Hazırlık saatlerini al
export const getPrepPeriods = (level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): TimePeriod[] => {
  const timePeriods = getTimePeriods(level);
  return timePeriods.filter(tp => tp.isBreak && tp.breakType === 'prep');
};