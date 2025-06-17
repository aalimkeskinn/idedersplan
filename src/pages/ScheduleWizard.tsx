import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Calendar, 
  Save, 
  Play,
  AlertTriangle,
  Clock,
  Users,
  Building,
  BookOpen,
  MapPin,
  Settings,
  Zap
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import Button from '../components/UI/Button';
import WizardStepBasicInfo from '../components/Wizard/WizardStepBasicInfo';
import WizardStepSubjects from '../components/Wizard/WizardStepSubjects';
import WizardStepClasses from '../components/Wizard/WizardStepClasses';
import WizardStepClassrooms from '../components/Wizard/WizardStepClassrooms';
import WizardStepTeachers from '../components/Wizard/WizardStepTeachers';
import WizardStepConstraints from '../components/Wizard/WizardStepConstraints';
import WizardStepGeneration from '../components/Wizard/WizardStepGeneration';
import { Teacher, Class, Subject, Schedule, DAYS, PERIODS } from '../types';

// Define wizard steps
const WIZARD_STEPS = [
  { id: 'basic-info', title: 'Temel Bilgiler', description: 'Program adı ve dönem bilgileri', icon: '📝' },
  { id: 'subjects', title: 'Dersler', description: 'Ders seçimi ve haftalık saatler', icon: '📚' },
  { id: 'classes', title: 'Sınıflar', description: 'Sınıf seçimi ve kapasiteler', icon: '🏫' },
  { id: 'classrooms', title: 'Derslikler', description: 'Derslik yönetimi ve atamalar', icon: '🚪' },
  { id: 'teachers', title: 'Öğretmenler', description: 'Öğretmen seçimi ve ders yükleri', icon: '👨‍🏫' },
  { id: 'constraints', title: 'Kısıtlamalar', description: 'Zaman kısıtlamaları ve kurallar', icon: '⏰' },
  { id: 'generation', title: 'Program Oluştur', description: 'Otomatik program oluşturma', icon: '⚡' }
];

// Define wizard data structure
interface WizardData {
  basicInfo: {
    name: string;
    academicYear: string;
    semester: string;
    startDate: string;
    endDate: string;
    description: string;
    institutionTitle: string;
    dailyHours: number;
    weekDays: number;
    weekendClasses: boolean;
  };
  subjects: {
    selectedSubjects: string[];
    subjectHours: { [subjectId: string]: number };
    subjectPriorities: { [subjectId: string]: 'high' | 'medium' | 'low' };
  };
  classes: {
    selectedClasses: string[];
    classCapacities: { [classId: string]: number };
    classPreferences: { [classId: string]: string[] };
  };
  classrooms: any[];
  teachers: {
    selectedTeachers: string[];
    teacherSubjects: { [teacherId: string]: string[] };
    teacherMaxHours: { [teacherId: string]: number };
    teacherPreferences: { [teacherId: string]: string[] };
  };
  constraints: {
    timeConstraints: any[];
    globalRules: {
      maxDailyHoursTeacher: number;
      maxDailyHoursClass: number;
      maxConsecutiveHours: number;
      avoidConsecutiveSameSubject: boolean;
      preferMorningHours: boolean;
      avoidFirstLastPeriod: boolean;
      lunchBreakRequired: boolean;
      lunchBreakDuration: number;
    };
  };
  generationSettings: {
    algorithm: 'balanced' | 'compact' | 'distributed';
    prioritizeTeacherPreferences: boolean;
    prioritizeClassPreferences: boolean;
    allowOverlaps: boolean;
    generateMultipleOptions: boolean;
    optimizationLevel: 'fast' | 'balanced' | 'thorough';
  };
}

// Define schedule template interface
interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  academicYear: string;
  semester: string;
  updatedAt: Date;
  wizardData: WizardData;
  generatedSchedules: any[];
  status: 'draft' | 'published' | 'archived';
}

const ScheduleWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: classes } = useFirestore<Class>('classes');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { add: addTemplate, update: updateTemplate, data: templates } = useFirestore<ScheduleTemplate>('schedule-templates');
  const { add: addSchedule, data: existingSchedules, remove: removeSchedule } = useFirestore<Schedule>('schedules');
  const { success, error, warning, info } = useToast();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [wizardData, setWizardData] = useState<WizardData>({
    basicInfo: {
      name: '',
      academicYear: '2024/2025',
      semester: '',
      startDate: '2024-09-01',
      endDate: '2025-08-31',
      description: '',
      institutionTitle: '',
      dailyHours: 8,
      weekDays: 5,
      weekendClasses: false
    },
    subjects: {
      selectedSubjects: [],
      subjectHours: {},
      subjectPriorities: {}
    },
    classes: {
      selectedClasses: [],
      classCapacities: {},
      classPreferences: {}
    },
    classrooms: [],
    teachers: {
      selectedTeachers: [],
      teacherSubjects: {},
      teacherMaxHours: {},
      teacherPreferences: {}
    },
    constraints: {
      timeConstraints: [],
      globalRules: {
        maxDailyHoursTeacher: 8,
        maxDailyHoursClass: 9,
        maxConsecutiveHours: 3,
        avoidConsecutiveSameSubject: true,
        preferMorningHours: true,
        avoidFirstLastPeriod: false,
        lunchBreakRequired: true,
        lunchBreakDuration: 1
      }
    },
    generationSettings: {
      algorithm: 'balanced',
      prioritizeTeacherPreferences: true,
      prioritizeClassPreferences: true,
      allowOverlaps: false,
      generateMultipleOptions: true,
      optimizationLevel: 'balanced'
    }
  });

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // CRITICAL: Enhanced template loading with better error handling
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const templateId = urlParams.get('templateId');
    
    if (templateId && templates.length > 0) {
      const template = templates.find(t => t.id === templateId);
      if (template && template.wizardData) {
        console.log('📝 ENHANCED Template yükleniyor:', {
          templateId,
          templateName: template.name,
          hasWizardData: !!template.wizardData,
          wizardDataKeys: Object.keys(template.wizardData || {})
        });
        
        setEditingTemplateId(templateId);
        
        // CRITICAL: Deep merge with defaults to ensure all fields exist
        const loadedData: WizardData = {
          basicInfo: {
            name: template.wizardData.basicInfo?.name || '',
            academicYear: template.wizardData.basicInfo?.academicYear || '2024/2025',
            semester: template.wizardData.basicInfo?.semester || '',
            startDate: template.wizardData.basicInfo?.startDate || '2024-09-01',
            endDate: template.wizardData.basicInfo?.endDate || '2025-08-31',
            description: template.wizardData.basicInfo?.description || '',
            institutionTitle: template.wizardData.basicInfo?.institutionTitle || '',
            dailyHours: template.wizardData.basicInfo?.dailyHours || 8,
            weekDays: template.wizardData.basicInfo?.weekDays || 5,
            weekendClasses: template.wizardData.basicInfo?.weekendClasses || false
          },
          subjects: {
            selectedSubjects: template.wizardData.subjects?.selectedSubjects || [],
            subjectHours: template.wizardData.subjects?.subjectHours || {},
            subjectPriorities: template.wizardData.subjects?.subjectPriorities || {}
          },
          classes: {
            selectedClasses: template.wizardData.classes?.selectedClasses || [],
            classCapacities: template.wizardData.classes?.classCapacities || {},
            classPreferences: template.wizardData.classes?.classPreferences || {}
          },
          classrooms: template.wizardData.classrooms || [],
          teachers: {
            selectedTeachers: template.wizardData.teachers?.selectedTeachers || [],
            teacherSubjects: template.wizardData.teachers?.teacherSubjects || {},
            teacherMaxHours: template.wizardData.teachers?.teacherMaxHours || {},
            teacherPreferences: template.wizardData.teachers?.teacherPreferences || {}
          },
          constraints: {
            timeConstraints: template.wizardData.constraints?.timeConstraints || [],
            globalRules: {
              maxDailyHoursTeacher: template.wizardData.constraints?.globalRules?.maxDailyHoursTeacher || 8,
              maxDailyHoursClass: template.wizardData.constraints?.globalRules?.maxDailyHoursClass || 9,
              maxConsecutiveHours: template.wizardData.constraints?.globalRules?.maxConsecutiveHours || 3,
              avoidConsecutiveSameSubject: template.wizardData.constraints?.globalRules?.avoidConsecutiveSameSubject ?? true,
              preferMorningHours: template.wizardData.constraints?.globalRules?.preferMorningHours ?? true,
              avoidFirstLastPeriod: template.wizardData.constraints?.globalRules?.avoidFirstLastPeriod ?? false,
              lunchBreakRequired: template.wizardData.constraints?.globalRules?.lunchBreakRequired ?? true,
              lunchBreakDuration: template.wizardData.constraints?.globalRules?.lunchBreakDuration || 1
            }
          },
          generationSettings: {
            algorithm: template.wizardData.generationSettings?.algorithm || 'balanced',
            prioritizeTeacherPreferences: template.wizardData.generationSettings?.prioritizeTeacherPreferences ?? true,
            prioritizeClassPreferences: template.wizardData.generationSettings?.prioritizeClassPreferences ?? true,
            allowOverlaps: template.wizardData.generationSettings?.allowOverlaps ?? false,
            generateMultipleOptions: template.wizardData.generationSettings?.generateMultipleOptions ?? true,
            optimizationLevel: template.wizardData.generationSettings?.optimizationLevel || 'balanced'
          }
        };
        
        console.log('✅ Template verisi yüklendi:', {
          basicInfoName: loadedData.basicInfo.name,
          subjectsCount: loadedData.subjects.selectedSubjects.length,
          classesCount: loadedData.classes.selectedClasses.length,
          teachersCount: loadedData.teachers.selectedTeachers.length,
          classroomsCount: loadedData.classrooms.length
        });
        
        setWizardData(loadedData);
        
        // Mark completed steps based on loaded data
        const completed = new Set<number>();
        if (loadedData.basicInfo?.name) completed.add(0);
        if (loadedData.subjects?.selectedSubjects?.length > 0) completed.add(1);
        if (loadedData.classes?.selectedClasses?.length > 0) completed.add(2);
        if (loadedData.classrooms?.length > 0) completed.add(3);
        if (loadedData.teachers?.selectedTeachers?.length > 0) completed.add(4);
        completed.add(5); // Constraints are optional
        if (loadedData.generationSettings?.algorithm) completed.add(6);
        
        setCompletedSteps(completed);
        
        success('✅ Şablon Yüklendi', `"${template.name}" şablonu düzenleme için yüklendi`);
      } else {
        console.warn('⚠️ Template bulunamadı veya wizardData eksik:', { templateId, template });
        warning('⚠️ Template Yüklenemedi', 'Şablon verisi bulunamadı veya bozuk');
      }
    }
  }, [location.search, templates, success, warning]);

  const currentStep = WIZARD_STEPS[currentStepIndex];

  // Validate current step
  const validateCurrentStep = (): boolean => {
    switch (currentStep.id) {
      case 'basic-info':
        return !!(wizardData.basicInfo.name && 
                 wizardData.basicInfo.academicYear);
      
      case 'subjects':
        return wizardData.subjects.selectedSubjects.length > 0;
      
      case 'classes':
        return wizardData.classes.selectedClasses.length > 0;
      
      case 'classrooms':
        return wizardData.classrooms.length > 0;
      
      case 'teachers':
        return wizardData.teachers.selectedTeachers.length > 0;
      
      case 'constraints':
        return true; // Constraints are optional
      
      case 'generation':
        return true; // Always valid for generation step
      
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCompletedSteps(prev => new Set([...prev, currentStepIndex]));
      if (currentStepIndex < WIZARD_STEPS.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    } else {
      warning('⚠️ Eksik Bilgi', 'Lütfen gerekli alanları doldurun');
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStepIndex || 
        (stepIndex === currentStepIndex + 1 && validateCurrentStep())) {
      setCurrentStepIndex(stepIndex);
    }
  };

  // CRITICAL: Enhanced save template function with better Firebase handling
  const handleSaveTemplate = async () => {
    if (!wizardData.basicInfo.name) {
      warning('⚠️ Program Adı Gerekli', 'Lütfen program adını girin');
      return;
    }

    setIsSaving(true);
    
    try {
      // CRITICAL: Create a complete template data object
      const templateData = {
        name: wizardData.basicInfo.name,
        description: wizardData.basicInfo.description || '',
        academicYear: wizardData.basicInfo.academicYear,
        semester: wizardData.basicInfo.semester,
        updatedAt: new Date(),
        wizardData: JSON.parse(JSON.stringify(wizardData)), // Deep clone to avoid reference issues
        generatedSchedules: [],
        status: 'published' as const
      };

      console.log('💾 ENHANCED Template kayıt işlemi başlatıldı:', {
        isEditing: !!editingTemplateId,
        templateId: editingTemplateId,
        templateName: templateData.name,
        dataSize: JSON.stringify(templateData).length,
        wizardDataKeys: Object.keys(templateData.wizardData)
      });

      let result;
      
      if (editingTemplateId) {
        // CRITICAL: Update existing template
        console.log('🔄 Mevcut template güncelleniyor:', editingTemplateId);
        result = await updateTemplate(editingTemplateId, templateData);
        
        if (result.success) {
          console.log('✅ Template güncelleme başarılı');
          success('✅ Şablon Güncellendi', `"${templateData.name}" başarıyla güncellendi`);
        } else {
          throw new Error(result.error || 'Güncelleme başarısız');
        }
      } else {
        // Create new template
        console.log('➕ Yeni template oluşturuluyor');
        result = await addTemplate(templateData);
        
        if (result.success) {
          console.log('✅ Yeni template oluşturma başarılı:', result.id);
          setEditingTemplateId(result.id || null);
          success('✅ Şablon Kaydedildi', `"${templateData.name}" başarıyla kaydedildi`);
        } else {
          throw new Error(result.error || 'Kayıt başarısız');
        }
      }
      
    } catch (err: any) {
      console.error('❌ ENHANCED Template kayıt hatası:', {
        error: err,
        message: err.message,
        isEditing: !!editingTemplateId,
        templateId: editingTemplateId
      });
      
      error('❌ Kayıt Hatası', `Şablon ${editingTemplateId ? 'güncellenirken' : 'kaydedilirken'} bir hata oluştu: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Enhanced schedule generation algorithm
  const generateScheduleForTeacher = (
    teacherId: string,
    selectedClasses: Class[],
    selectedSubjects: Subject[]
  ): Schedule['schedule'] => {
    console.log('🎯 Program oluşturuluyor:', { teacherId });
    
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) {
      console.error('❌ Öğretmen bulunamadı:', teacherId);
      return {};
    }

    console.log('👨‍🏫 Öğretmen bilgileri:', {
      name: teacher.name,
      branch: teacher.branch,
      level: teacher.level
    });

    // Initialize empty schedule
    const schedule: Schedule['schedule'] = {};
    DAYS.forEach(day => {
      schedule[day] = {};
      PERIODS.forEach(period => {
        schedule[day][period] = {};
      });
    });

    // Add fixed periods based on teacher level
    DAYS.forEach(day => {
      schedule[day]['prep'] = {
        classId: 'fixed-period',
        subjectId: 'fixed-prep'
      };

      if (teacher.level === 'Ortaokul') {
        schedule[day]['breakfast'] = {
          classId: 'fixed-period',
          subjectId: 'fixed-breakfast'
        };
      }

      const lunchPeriod = (teacher.level === 'İlkokul' || teacher.level === 'Anaokulu') ? '5' : '6';
      schedule[day][lunchPeriod] = {
        classId: 'fixed-period',
        subjectId: 'fixed-lunch'
      };

      schedule[day]['afternoon-breakfast'] = {
        classId: 'fixed-period',
        subjectId: 'fixed-afternoon-breakfast'
      };
    });

    const compatibleClasses = selectedClasses.filter(c => c.level === teacher.level);
    const compatibleSubjects = selectedSubjects.filter(s => 
      s.level === teacher.level && s.branch === teacher.branch
    );

    console.log('🔍 Uyumlu veriler:', {
      teacherLevel: teacher.level,
      teacherBranch: teacher.branch,
      compatibleClasses: compatibleClasses.map(c => c.name),
      compatibleSubjects: compatibleSubjects.map(s => s.name),
      totalClasses: compatibleClasses.length,
      totalSubjects: compatibleSubjects.length
    });

    if (compatibleClasses.length === 0 || compatibleSubjects.length === 0) {
      console.warn(`⚠️ ${teacher.name} için uyumlu sınıf/ders bulunamadı`);
      return schedule;
    }

    const availablePeriods = PERIODS.filter(period => {
      if ((teacher.level === 'İlkokul' || teacher.level === 'Anaokulu') && period === '5') return false;
      if (teacher.level === 'Ortaokul' && period === '6') return false;
      return true;
    });

    let assignedHours = 0;
    const targetHours = Math.floor(Math.random() * 11) + 15;

    for (let attempt = 0; attempt < targetHours * 3 && assignedHours < targetHours; attempt++) {
      const randomDay = DAYS[Math.floor(Math.random() * DAYS.length)];
      const randomPeriod = availablePeriods[Math.floor(Math.random() * availablePeriods.length)];
      
      if (!schedule[randomDay][randomPeriod].classId) {
        const randomClass = compatibleClasses[Math.floor(Math.random() * compatibleClasses.length)];
        const randomSubject = compatibleSubjects[Math.floor(Math.random() * compatibleSubjects.length)];
        
        schedule[randomDay][randomPeriod] = {
          classId: randomClass.id,
          subjectId: randomSubject.id
        };
        
        assignedHours++;
      }
    }

    console.log(`🎯 ${teacher.name} için ${assignedHours} saatlik program oluşturuldu`);
    return schedule;
  };

  // Enhanced schedule generation with better error handling
  const handleGenerateSchedule = async () => {
    if (!validateCurrentStep()) {
      warning('⚠️ Eksik Bilgi', 'Lütfen tüm adımları tamamlayın');
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('🚀 ENHANCED Program oluşturma başlatıldı:', {
        selectedTeachers: wizardData.teachers.selectedTeachers.length,
        selectedClasses: wizardData.classes.selectedClasses.length,
        selectedSubjects: wizardData.subjects.selectedSubjects.length,
        existingSchedules: existingSchedules.length
      });

      const selectedTeacherIds = wizardData.teachers.selectedTeachers;
      const selectedTeachers = teachers.filter((t: Teacher) => 
        selectedTeacherIds.includes(t.id)
      );
      const selectedClasses = classes.filter((c: Class) => 
        wizardData.classes.selectedClasses.includes(c.id)
      );
      const selectedSubjects = subjects.filter((s: Subject) => 
        wizardData.subjects.selectedSubjects.includes(s.id)
      );

      // --- YENİ EK: Artık seçili olmayan öğretmenlerin programlarını sil ---
      const removedTeacherSchedules = existingSchedules.filter((schedule: Schedule) =>
        !selectedTeacherIds.includes(schedule.teacherId)
      );
      for (const removedSchedule of removedTeacherSchedules) {
        try {
          await removeSchedule(removedSchedule.id);
          console.log(`🗑️ Çıkarılan öğretmenin programı silindi: ${removedSchedule.teacherId}`);
        } catch (err) {
          console.error(`❌ Çıkarılan öğretmenin programı silinemedi: ${removedSchedule.teacherId}`, err);
        }
      }
      // --- YENİ EK SONU ---

      // Clear existing schedules for selected teachers first
      const existingTeacherSchedules = existingSchedules.filter((schedule: Schedule) => 
        selectedTeachers.some((teacher: Teacher) => teacher.id === schedule.teacherId)
      );

      for (const existingSchedule of existingTeacherSchedules) {
        try {
          await removeSchedule(existingSchedule.id);
          console.log(`🗑️ Mevcut program silindi: ${existingSchedule.teacherId}`);
        } catch (err) {
          console.error(`❌ Program silinemedi: ${existingSchedule.teacherId}`, err);
        }
      }

      // Generate new schedules for each selected teacher
      let generatedCount = 0;
      
      for (const teacher of selectedTeachers) {
        try {
          console.log(`🎯 ${teacher.name} için program oluşturuluyor...`);
          
          const teacherSchedule = generateScheduleForTeacher(
            teacher.id,
            selectedClasses,
            selectedSubjects
          );

          let assignedHours = 0;
          DAYS.forEach(day => {
            PERIODS.forEach(period => {
              const slot = teacherSchedule[day]?.[period];
              if (slot?.classId && slot.classId !== 'fixed-period') {
                assignedHours++;
              }
            });
          });

          if (assignedHours === 0) {
            console.warn(`⚠️ ${teacher.name} için hiç ders atanamadı`);
            continue;
          }

          const scheduleData: Omit<Schedule, 'id' | 'createdAt'> = {
            teacherId: teacher.id,
            schedule: teacherSchedule,
            updatedAt: new Date()
          };

          const result = await addSchedule(scheduleData);
          if (result.success) {
            generatedCount++;
            console.log(`✅ ${teacher.name} programı oluşturuldu ve kaydedildi (${assignedHours} saat)`);
          } else {
            console.error(`❌ ${teacher.name} programı kaydedilemedi:`, result.error);
          }
        } catch (err) {
          console.error(`❌ ${teacher.name} programı oluşturulamadı:`, err);
        }
      }

      if (generatedCount > 0) {
        success('🎯 Program Oluşturuldu!', `${generatedCount} öğretmen için program başarıyla oluşturuldu ve kaydedildi`);
        
        // Save template after successful generation
        await handleSaveTemplate();
        
        // Navigate to all schedules page
        setTimeout(() => {
          navigate('/all-schedules');
        }, 2000);
      } else {
        error('❌ Program Oluşturulamadı', 'Hiçbir öğretmen için program oluşturulamadı');
      }
      
    } catch (err) {
      console.error('❌ Program oluşturma hatası:', err);
      error('❌ Oluşturma Hatası', 'Program oluşturulurken bir hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateWizardData = (stepId: string, stepData: any) => {
    console.log('🔄 Wizard data güncelleniyor:', { stepId, stepData });
    
    if (stepId === 'classrooms') {
      setWizardData(prev => ({
        ...prev,
        classrooms: stepData
      }));
    } else {
      setWizardData(prev => ({
        ...prev,
        [stepId]: {
          ...prev[stepId as keyof WizardData],
          ...stepData
        }
      }));
    }
  };

  const handleSelectedTeachersChange = (selectedTeacherIds: string[]) => {
    setWizardData(prev => ({
      ...prev,
      teachers: {
        ...prev.teachers,
        selectedTeachers: selectedTeacherIds
      }
    }));
  };

  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'basic-info': return Calendar;
      case 'subjects': return BookOpen;
      case 'classes': return Building;
      case 'classrooms': return MapPin;
      case 'teachers': return Users;
      case 'constraints': return Clock;
      case 'generation': return Zap;
      default: return Settings;
    }
  };

  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'basic-info':
        return (
          <WizardStepBasicInfo
            data={wizardData.basicInfo}
            onUpdate={(data) => updateWizardData('basicInfo', data)}
          />
        );
      
      case 'subjects':
        return (
          <WizardStepSubjects
            data={wizardData.subjects}
            onUpdate={(data) => updateWizardData('subjects', data)}
          />
        );
      
      case 'classes':
        return (
          <WizardStepClasses
            data={wizardData}
            onUpdate={(data) => {
              if (data.classes) {
                updateWizardData('classes', data.classes);
              }
            }}
            classes={classes}
          />
        );
      
      case 'classrooms':
        return (
          <WizardStepClassrooms
            data={wizardData}
            onUpdate={(data) => {
              if (data.classrooms) {
                updateWizardData('classrooms', data.classrooms);
              }
            }}
          />
        );
      
      case 'teachers':
        return (
          <WizardStepTeachers
            selectedTeachers={wizardData.teachers.selectedTeachers}
            onSelectedTeachersChange={handleSelectedTeachersChange}
          />
        );
      
      case 'constraints':
        return (
          <WizardStepConstraints
            data={wizardData}
            onUpdate={(data) => {
              if (data.constraints) {
                updateWizardData('constraints', data.constraints);
              }
            }}
            teachers={teachers}
            classes={classes}
            subjects={subjects}
          />
        );
      
      case 'generation':
        return (
          <WizardStepGeneration
            data={wizardData.generationSettings}
            wizardData={wizardData}
            onUpdate={(data) => updateWizardData('generationSettings', data)}
            onGenerate={handleGenerateSchedule}
            isGenerating={isGenerating}
          />
        );
      
      default:
        return <div>Bilinmeyen adım</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {editingTemplateId ? 'Program Düzenleme' : 'Program Oluşturma Sihirbazı'}
                </h1>
                <p className="text-sm text-gray-600">
                  {editingTemplateId ? 
                    `"${wizardData.basicInfo.name}" düzenleniyor - Adım ${currentStepIndex + 1} / ${WIZARD_STEPS.length}` : 
                    `Adım ${currentStepIndex + 1} / ${WIZARD_STEPS.length}`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleSaveTemplate}
                icon={Save}
                variant="secondary"
                disabled={isSaving || !wizardData.basicInfo.name}
              >
                {isSaving ? 'Kaydediliyor...' : editingTemplateId ? 'Güncelle' : 'Şablon Kaydet'}
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="secondary"
              >
                İptal
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Steps */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Adımlar</h3>
              <div className="space-y-3">
                {WIZARD_STEPS.map((step, index) => {
                  const StepIcon = getStepIcon(step.id);
                  const isCompleted = completedSteps.has(index);
                  const isCurrent = index === currentStepIndex;
                  const isAccessible = index <= currentStepIndex || 
                    (index === currentStepIndex + 1 && validateCurrentStep());

                  return (
                    <button
                      key={step.id}
                      onClick={() => handleStepClick(index)}
                      disabled={!isAccessible}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${
                        isCompleted
                          ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100'
                          : isCurrent
                          ? 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
                          : isAccessible
                          ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrent
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {isCompleted ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <StepIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{step.title}</p>
                          <p className="text-xs opacity-75 truncate">{step.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Progress */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>İlerleme</span>
                  <span>{Math.round((completedSteps.size / WIZARD_STEPS.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(completedSteps.size / WIZARD_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Step Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">{currentStep.icon}</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{currentStep.title}</h2>
                      <p className="text-gray-600">{currentStep.description}</p>
                    </div>
                  </div>
                  {!validateCurrentStep() && (
                    <div className="flex items-center text-amber-600">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">Eksik bilgi</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step Content */}
              <div className="p-6">
                {renderStepContent()}
              </div>

              {/* Navigation */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <Button
                    onClick={handlePrevious}
                    icon={ChevronLeft}
                    variant="secondary"
                    disabled={currentStepIndex === 0}
                  >
                    Önceki
                  </Button>

                  <div className="flex items-center space-x-3">
                    {currentStepIndex === WIZARD_STEPS.length - 1 ? (
                      <Button
                        onClick={handleGenerateSchedule}
                        icon={Play}
                        variant="primary"
                        disabled={!validateCurrentStep() || isGenerating}
                        size="lg"
                      >
                        {isGenerating ? 'Program Oluşturuluyor...' : 'Program Oluştur'}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        icon={ChevronRight}
                        variant="primary"
                        disabled={!validateCurrentStep()}
                      >
                        Sonraki
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleWizard;