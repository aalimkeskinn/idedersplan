export interface WizardData {
  // Step 1: Basic Info
  basicInfo: {
    programName: string;
    academicYear: string;
    semester: 'fall' | 'spring' | 'summer';
    startDate?: Date;
    endDate?: Date;
  };
  
  // Step 2: Subjects
  subjects: {
    selectedSubjects: string[];
    subjectHours: { [subjectId: string]: number };
    subjectPriorities: { [subjectId: string]: 'high' | 'medium' | 'low' };
  };
  
  // Step 3: Classes
  classes: {
    selectedClasses: string[];
    classCapacities: { [classId: string]: number };
  };
  
  // Step 4: Classrooms
  classrooms: {
    selectedClassrooms: string[];
    classroomAssignments: { [classId: string]: string[] }; // class -> classroom IDs
  };
  
  // Step 5: Teachers
  teachers: {
    selectedTeachers: string[];
    teacherWorkloads: { [teacherId: string]: number };
    teacherSubjects: { [teacherId: string]: string[] };
  };
  
  // Step 6: Constraints
  constraints: {
    timeConstraints: {
      teachers?: { [teacherId: string]: TimeConstraint };
      classes?: { [classId: string]: TimeConstraint };
      subjects?: { [subjectId: string]: TimeConstraint };
    };
    globalRules?: GlobalConstraints;
  };
  
  // Step 7: Generation Settings
  generationSettings: {
    algorithm: 'balanced' | 'compact' | 'distributed';
    optimizationLevel: 'fast' | 'balanced' | 'thorough';
    maxGenerationTime: number; // in minutes
    allowPartialSolution: boolean;
    prioritizeTeacherPreferences: boolean;
    prioritizeClassPreferences: boolean;
    generateMultipleOptions: boolean;
    allowOverlaps: boolean;
  };
}

// CRITICAL: NEW - Subject-Teacher Mapping System
export interface SubjectTeacherMapping {
  id: string;
  subjectId: string;
  teacherId: string;
  classId: string;
  weeklyHours: number;
  assignedHours: number;
  priority: 'high' | 'medium' | 'low';
  isValid: boolean;
  compatibilityScore: number;
  createdAt: Date;
}

// CRITICAL: NEW - Schedule Generation Context
export interface ScheduleGenerationContext {
  mappings: SubjectTeacherMapping[];
  totalSlotsNeeded: number;
  totalSlotsAvailable: number;
  classSchedules: { [classId: string]: Schedule };
  teacherWorkloads: { [teacherId: string]: number };
  subjectDistribution: { [subjectId: string]: number };
  conflicts: string[];
  warnings: string[];
}

// CRITICAL: NEW - Generation Result with detailed feedback
export interface EnhancedGenerationResult {
  success: boolean;
  schedules: Schedule[];
  context: ScheduleGenerationContext;
  statistics: {
    totalSlots: number;
    filledSlots: number;
    emptySlots: number;
    conflictCount: number;
    satisfiedConstraints: number;
    totalConstraints: number;
    subjectCoverage: { [subjectId: string]: number };
    teacherUtilization: { [teacherId: string]: number };
  };
  warnings: string[];
  errors: string[];
  generationTime: number;
  algorithm: string;
  optimizationLevel: string;
}

export interface Classroom {
  id: string;
  name: string;
  type: 'normal' | 'laboratory' | 'workshop' | 'gym' | 'library' | 'computer';
  capacity: number;
  floor: string;
  building: string;
  equipment: string[]; // equipment IDs
}

export interface GlobalConstraints {
  maxDailyHoursTeacher: number;
  maxDailyHoursClass: number;
  maxConsecutiveHours: number;
  avoidConsecutiveSameSubject: boolean;
  preferMorningHours: boolean;
  avoidFirstLastPeriod: boolean;
  lunchBreakRequired: boolean;
  lunchBreakDuration: number; // in periods
}

export interface TimeConstraint {
  [day: string]: {
    [period: string]: 'available' | 'restricted' | 'unavailable';
  };
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  academicYear: string;
  semester: string;
  wizardData: WizardData;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
}

export interface GenerationResult {
  success: boolean;
  scheduleId?: string;
  statistics: {
    totalSlots: number;
    filledSlots: number;
    emptySlots: number;
    conflictCount: number;
    satisfiedConstraints: number;
    totalConstraints: number;
  };
  warnings: string[];
  errors: string[];
  generationTime: number; // in seconds
  algorithm: string;
  optimizationLevel: string;
}

export const WIZARD_STEPS = [
  { id: 'basic', title: 'Temel Bilgiler', description: 'Program adı ve dönem bilgileri' },
  { id: 'subjects', title: 'Dersler', description: 'Ders seçimi ve haftalık saatler' },
  { id: 'classes', title: 'Sınıflar', description: 'Sınıf seçimi ve kapasiteler' },
  { id: 'classrooms', title: 'Derslikler', description: 'Derslik yönetimi ve atamalar' },
  { id: 'teachers', title: 'Öğretmenler', description: 'Öğretmen seçimi ve ders yükleri' },
  { id: 'constraints', title: 'Kısıtlamalar', description: 'Zaman kısıtlamaları ve kurallar' },
  { id: 'generation', title: 'Program Oluştur', description: 'Otomatik program oluşturma' }
] as const;

export type WizardStepId = typeof WIZARD_STEPS[number]['id'];

export const getStepIndex = (stepId: WizardStepId): number => {
  return WIZARD_STEPS.findIndex(step => step.id === stepId);
};

export const getStepById = (stepId: WizardStepId) => {
  return WIZARD_STEPS.find(step => step.id === stepId);
};

export const isStepComplete = (stepId: WizardStepId, data: WizardData): boolean => {
  switch (stepId) {
    case 'basic':
      return !!(data.basicInfo?.programName && data.basicInfo?.academicYear && data.basicInfo?.semester);
    case 'subjects':
      return !!(data.subjects?.selectedSubjects && data.subjects.selectedSubjects.length > 0);
    case 'classes':
      return !!(data.classes?.selectedClasses && data.classes.selectedClasses.length > 0);
    case 'classrooms':
      return !!(data.classrooms?.selectedClassrooms && data.classrooms.selectedClassrooms.length > 0);
    case 'teachers':
      return !!(data.teachers?.selectedTeachers && data.teachers.selectedTeachers.length > 0);
    case 'constraints':
      return true; // Optional step
    case 'generation':
      return !!(data.generationSettings?.algorithm && data.generationSettings?.optimizationLevel);
    default:
      return false;
  }
};

export const validateStep = (stepId: WizardStepId, data: WizardData): string[] => {
  const errors: string[] = [];
  
  switch (stepId) {
    case 'basic':
      if (!data.basicInfo?.programName) errors.push('Program adı gereklidir');
      if (!data.basicInfo?.academicYear) errors.push('Akademik yıl gereklidir');
      if (!data.basicInfo?.semester) errors.push('Dönem seçimi gereklidir');
      break;
      
    case 'subjects':
      if (!data.subjects?.selectedSubjects || data.subjects.selectedSubjects.length === 0) {
        errors.push('En az bir ders seçmelisiniz');
      }
      break;
      
    case 'classes':
      if (!data.classes?.selectedClasses || data.classes.selectedClasses.length === 0) {
        errors.push('En az bir sınıf seçmelisiniz');
      }
      break;
      
    case 'classrooms':
      if (!data.classrooms?.selectedClassrooms || data.classrooms.selectedClassrooms.length === 0) {
        errors.push('En az bir derslik tanımlamalısınız');
      }
      break;
      
    case 'teachers':
      if (!data.teachers?.selectedTeachers || data.teachers.selectedTeachers.length === 0) {
        errors.push('En az bir öğretmen seçmelisiniz');
      }
      break;
      
    case 'generation':
      if (!data.generationSettings?.algorithm) errors.push('Algoritma seçimi gereklidir');
      if (!data.generationSettings?.optimizationLevel) errors.push('Optimizasyon seviyesi gereklidir');
      break;
  }
  
  return errors;
};