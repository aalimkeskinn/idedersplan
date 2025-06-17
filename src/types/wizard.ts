export interface ScheduleWizardStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  isCompleted: boolean;
  isActive: boolean;
  data?: any;
}

export interface WizardData {
  // Step 1: Basic Info
  basicInfo: {
    name: string;
    academicYear: string;
    semester: 'Güz' | 'Bahar' | 'Yaz';
    startDate: string;
    endDate: string;
    description?: string;
  };
  
  // Step 2: Subjects Configuration
  subjects: {
    selectedSubjects: string[]; // Subject IDs
    subjectHours: { [subjectId: string]: number }; // Weekly hours per subject
    subjectPriorities: { [subjectId: string]: 'high' | 'medium' | 'low' };
  };
  
  // Step 3: Classes Configuration
  classes: {
    selectedClasses: string[]; // Class IDs
    classCapacities: { [classId: string]: number };
    classPreferences: { [classId: string]: string[] }; // Preferred time slots
  };
  
  // Step 4: Classrooms Configuration
  classrooms: {
    selectedClassrooms: string[]; // Classroom IDs
    classroomCapacities: { [classroomId: string]: number };
    classroomTypes: { [classroomId: string]: 'normal' | 'lab' | 'workshop' | 'gym' };
    classroomEquipment: { [classroomId: string]: string[] };
  };
  
  // Step 5: Teachers Configuration
  teachers: {
    selectedTeachers: string[]; // Teacher IDs
    teacherSubjects: { [teacherId: string]: string[] }; // Subject assignments
    teacherMaxHours: { [teacherId: string]: number }; // Max weekly hours
    teacherPreferences: { [teacherId: string]: string[] }; // Preferred time slots
  };
  
  // Step 6: Constraints
  constraints: {
    timeConstraints: TimeConstraint[];
    globalRules: {
      maxDailyHours: number;
      maxConsecutiveHours: number;
      lunchBreakRequired: boolean;
      weekendScheduling: boolean;
    };
  };
  
  // Step 7: Generation Settings
  generationSettings: {
    algorithm: 'balanced' | 'compact' | 'distributed';
    prioritizeTeacherPreferences: boolean;
    prioritizeClassPreferences: boolean;
    allowOverlaps: boolean;
    generateMultipleOptions: boolean;
    optimizationLevel: 'fast' | 'balanced' | 'thorough';
  };
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  academicYear: string;
  semester: string;
  createdAt: Date;
  updatedAt: Date;
  wizardData: WizardData;
  generatedSchedules: Schedule[];
  status: 'draft' | 'generating' | 'completed' | 'failed';
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  type: 'normal' | 'lab' | 'workshop' | 'gym' | 'library';
  equipment: string[];
  location: string;
  level: 'Anaokulu' | 'İlkokul' | 'Ortaokul';
  isAvailable: boolean;
  createdAt: Date;
}

export const WIZARD_STEPS = [
  {
    id: 'basic-info',
    title: 'Temel Bilgiler',
    description: 'Program adı, dönem ve tarih bilgileri',
    icon: '📋'
  },
  {
    id: 'subjects',
    title: 'Dersler',
    description: 'Ders seçimi ve haftalık saat konfigürasyonu',
    icon: '📚'
  },
  {
    id: 'classes',
    title: 'Sınıflar',
    description: 'Sınıf seçimi ve kapasite ayarları',
    icon: '🏫'
  },
  {
    id: 'classrooms',
    title: 'Derslikler',
    description: 'Derslik yönetimi ve ekipman konfigürasyonu',
    icon: '🚪'
  },
  {
    id: 'teachers',
    title: 'Öğretmenler',
    description: 'Öğretmen atamaları ve ders yükleri',
    icon: '👨‍🏫'
  },
  {
    id: 'constraints',
    title: 'Kısıtlamalar',
    description: 'Zaman kısıtlamaları ve kurallar',
    icon: '⏰'
  },
  {
    id: 'generation',
    title: 'Program Oluştur',
    description: 'Otomatik program oluşturma ve optimizasyon',
    icon: '🎯'
  }
] as const;

export type WizardStepId = typeof WIZARD_STEPS[number]['id'];