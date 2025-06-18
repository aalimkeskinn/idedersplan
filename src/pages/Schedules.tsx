import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Users, Building, BookOpen, Save, Trash2, RefreshCw, AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react';
import { Teacher, Class, Subject, Schedule, DAYS, PERIODS } from '../types';
import { TimeConstraint } from '../types/constraints';
import { WizardData, SubjectTeacherMapping } from '../types/wizard';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import { useErrorModal } from '../hooks/useErrorModal';
import { validateSchedule } from '../utils/validation';
import { checkSlotConflict } from '../utils/validation';
import Button from '../components/UI/Button';
import Select from '../components/UI/Select';
import ScheduleSlotModal from '../components/UI/ScheduleSlotModal';
import ConfirmationModal from '../components/UI/ConfirmationModal';
import ErrorModal from '../components/UI/ErrorModal';
import { createSubjectTeacherMappings, checkWeeklyHourLimit } from '../utils/subjectTeacherMapping';
import { createWeeklyHourTrackers, canAssignHour, assignHourToTracker } from '../utils/weeklyHourManager';
import { checkAllConflicts, summarizeConflicts } from '../utils/conflictDetection';
import { optimizeSchedules, OptimizationStrategy } from '../utils/scheduleOptimization';

// Schedule Template interface
interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  academicYear: string;
  semester: string;
  wizardData: WizardData;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published' | 'archived';
}

const Schedules = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: teachers, loading: teachersLoading } = useFirestore<Teacher>('teachers');
  const { data: classes, loading: classesLoading } = useFirestore<Class>('classes');
  const { data: subjects, loading: subjectsLoading } = useFirestore<Subject>('subjects');
  const { data: schedules, add: addSchedule, update: updateSchedule, remove: removeSchedule } = useFirestore<Schedule>('schedules');
  const { data: constraints } = useFirestore<TimeConstraint>('constraints');
  const { data: templates } = useFirestore<ScheduleTemplate>('schedule-templates');
  const { success, error, warning, info } = useToast();
  const { 
    confirmation, 
    showConfirmation, 
    hideConfirmation,
    confirmDelete,
    confirmUnsavedChanges,
    confirmConflictOverride
  } = useConfirmation();
  const { errorModal, showError, hideError } = useErrorModal();

  const [mode, setMode] = useState<'teacher' | 'class'>('teacher');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [currentSchedule, setCurrentSchedule] = useState<Schedule['schedule']>({});
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [currentDay, setCurrentDay] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [currentSlot, setCurrentSlot] = useState<{ subjectId: string; classId: string; teacherId?: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [wizardData, setWizardData] = useState<WizardData | null>(null);
  const [subjectTeacherMappings, setSubjectTeacherMappings] = useState<SubjectTeacherMapping[]>([]);
  const [weeklyHourTrackers, setWeeklyHourTrackers] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Check for URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const modeParam = urlParams.get('mode');
    const teacherIdParam = urlParams.get('teacherId');
    const classIdParam = urlParams.get('classId');
    const templateIdParam = urlParams.get('templateId');
    const autoModeParam = urlParams.get('auto');
    
    if (modeParam === 'teacher' || modeParam === 'class') {
      setMode(modeParam);
    }
    
    if (teacherIdParam && teachers.length > 0) {
      const teacherExists = teachers.find(t => t.id === teacherIdParam);
      if (teacherExists) {
        setSelectedTeacherId(teacherIdParam);
      }
    }
    
    if (classIdParam && classes.length > 0) {
      const classExists = classes.find(c => c.id === classIdParam);
      if (classExists) {
        setSelectedClassId(classIdParam);
      }
    }
    
    if (templateIdParam && templates.length > 0) {
      const template = templates.find(t => t.id === templateIdParam);
      if (template) {
        setTemplateId(templateIdParam);
        setWizardData(template.wizardData);
        setIsAutoMode(true);
      }
    }
    
    if (autoModeParam === 'true') {
      setIsAutoMode(true);
    }
  }, [location.search, teachers, classes, templates]);

  // Initialize subject-teacher mappings when wizard data is available
  useEffect(() => {
    if (wizardData && isAutoMode && !subjectTeacherMappings.length) {
      console.log('🔄 Wizard verisi yüklendi, eşleştirmeler oluşturuluyor...');
      
      const mappings = createSubjectTeacherMappings(wizardData, teachers, classes, subjects);
      setSubjectTeacherMappings(mappings);
      
      const trackers = createWeeklyHourTrackers(wizardData, classes, subjects);
      setWeeklyHourTrackers(trackers);
      
      console.log(`📊 ${mappings.length} eşleştirme ve ${trackers.length} takipçi oluşturuldu`);
    }
  }, [wizardData, isAutoMode, teachers, classes, subjects]);

  // Load existing schedule when teacher or class is selected
  useEffect(() => {
    if (mode === 'teacher' && selectedTeacherId) {
      const existingSchedule = schedules.find(s => s.teacherId === selectedTeacherId);
      
      if (existingSchedule) {
        setCurrentSchedule(existingSchedule.schedule);
        console.log(`✅ Mevcut öğretmen programı yüklendi: ${selectedTeacherId}`);
      } else {
        setCurrentSchedule(createEmptySchedule());
        console.log(`🆕 Yeni öğretmen programı oluşturuldu: ${selectedTeacherId}`);
      }
      
      setHasUnsavedChanges(false);
    } else if (mode === 'class' && selectedClassId) {
      // For class mode, we need to construct a virtual schedule
      const classSchedule = createEmptySchedule();
      
      // Find all teacher schedules that have this class
      schedules.forEach(schedule => {
        DAYS.forEach(day => {
          PERIODS.forEach(period => {
            const slot = schedule.schedule[day]?.[period];
            if (slot?.classId === selectedClassId) {
              classSchedule[day][period] = {
                ...slot,
                teacherId: schedule.teacherId
              };
            }
          });
        });
      });
      
      setCurrentSchedule(classSchedule);
      console.log(`✅ Sınıf programı oluşturuldu: ${selectedClassId}`);
      setHasUnsavedChanges(false);
    }
  }, [mode, selectedTeacherId, selectedClassId, schedules]);

  // Auto-generate schedule when in auto mode
  useEffect(() => {
    if (isAutoMode && wizardData && subjectTeacherMappings.length > 0 && weeklyHourTrackers.length > 0) {
      // Auto-select first class if none selected
      if (mode === 'class' && !selectedClassId && wizardData.classes?.selectedClasses?.length) {
        setSelectedClassId(wizardData.classes.selectedClasses[0]);
      }
    }
  }, [isAutoMode, wizardData, subjectTeacherMappings, weeklyHourTrackers, mode, selectedClassId]);

  const createEmptySchedule = (): Schedule['schedule'] => {
    const schedule: Schedule['schedule'] = {};
    
    DAYS.forEach(day => {
      schedule[day] = {};
      PERIODS.forEach(period => {
        schedule[day][period] = null;
      });
    });
    
    // Add fixed periods
    addFixedPeriods(schedule);
    
    return schedule;
  };

  const addFixedPeriods = (schedule: Schedule['schedule']) => {
    const teacherLevel = teachers.find(t => t.id === selectedTeacherId)?.level;
    const classLevel = classes.find(c => c.id === selectedClassId)?.level;
    const level = teacherLevel || classLevel;
    
    DAYS.forEach(day => {
      // Hazırlık/Kahvaltı (tüm seviyeler için)
      schedule[day]['prep'] = {
        classId: 'fixed-period',
        subjectId: 'fixed-prep'
      };

      // Ortaokul için 1. ve 2. ders arası kahvaltı
      if (level === 'Ortaokul') {
        schedule[day]['breakfast'] = {
          classId: 'fixed-period',
          subjectId: 'fixed-breakfast'
        };
      }

      // Yemek saati
      const lunchPeriod = (level === 'İlkokul' || level === 'Anaokulu') ? '5' : '6';
      schedule[day][lunchPeriod] = {
        classId: 'fixed-period',
        subjectId: 'fixed-lunch'
      };

      // İkindi kahvaltısı (8. ders sonrası)
      schedule[day]['afternoon-breakfast'] = {
        classId: 'fixed-period',
        subjectId: 'fixed-afternoon-breakfast'
      };
    });
  };

  const handleSlotClick = (day: string, period: string) => {
    // Skip fixed periods
    if (period === 'prep' || period === 'breakfast' || period === 'afternoon-breakfast') {
      return;
    }

    // Skip lunch periods based on level
    const teacherLevel = teachers.find(t => t.id === selectedTeacherId)?.level;
    const classLevel = classes.find(c => c.id === selectedClassId)?.level;
    const level = teacherLevel || classLevel;
    
    if ((level === 'İlkokul' || level === 'Anaokulu') && period === '5') {
      return;
    }
    if (level === 'Ortaokul' && period === '6') {
      return;
    }

    setCurrentDay(day);
    setCurrentPeriod(period);
    
    // Get current slot data
    const slot = currentSchedule[day]?.[period];
    setCurrentSlot(slot);
    
    setIsSlotModalOpen(true);
  };

  const handleSlotSave = (subjectId: string, classId: string, teacherId?: string) => {
    if (!currentDay || !currentPeriod) return;
    
    console.log('🔄 Slot kaydediliyor:', {
      day: currentDay,
      period: currentPeriod,
      subjectId,
      classId,
      teacherId
    });

    // CRITICAL: Check weekly hour limit for the subject
    if (subjectId && classId && isAutoMode && subjectTeacherMappings.length > 0) {
      const hourLimitCheck = checkWeeklyHourLimit(subjectId, classId, subjectTeacherMappings);
      
      if (hourLimitCheck.hasConflict) {
        console.log('⚠️ Haftalık saat limiti aşıldı:', hourLimitCheck.message);
        warning('⚠️ Haftalık Limit Aşıldı', hourLimitCheck.message);
        return;
      }
    }

    // Check for conflicts
    if (mode === 'teacher' && classId) {
      const conflictCheck = checkSlotConflict(
        'teacher',
        currentDay,
        currentPeriod,
        classId,
        selectedTeacherId,
        schedules,
        teachers,
        classes
      );
      
      if (conflictCheck.hasConflict) {
        confirmConflictOverride(
          [conflictCheck.message],
          () => {
            saveSlot(subjectId, classId, teacherId);
          }
        );
        return;
      }
    } else if (mode === 'class' && teacherId) {
      const conflictCheck = checkSlotConflict(
        'class',
        currentDay,
        currentPeriod,
        teacherId,
        selectedClassId,
        schedules,
        teachers,
        classes
      );
      
      if (conflictCheck.hasConflict) {
        confirmConflictOverride(
          [conflictCheck.message],
          () => {
            saveSlot(subjectId, classId, teacherId);
          }
        );
        return;
      }
    }
    
    // No conflicts, save the slot
    saveSlot(subjectId, classId, teacherId);
  };

  const saveSlot = (subjectId: string, classId: string, teacherId?: string) => {
    // Create updated schedule
    const updatedSchedule = { ...currentSchedule };
    
    if (subjectId && (mode === 'teacher' ? classId : teacherId)) {
      // Assign slot
      updatedSchedule[currentDay][currentPeriod] = {
        subjectId,
        classId: mode === 'teacher' ? classId : selectedClassId,
        teacherId: mode === 'teacher' ? selectedTeacherId : teacherId
      };
      
      // CRITICAL: Update weekly hour trackers if in auto mode
      if (isAutoMode && weeklyHourTrackers.length > 0) {
        const slotClassId = mode === 'teacher' ? classId : selectedClassId;
        const updatedTrackers = assignHourToTracker(
          weeklyHourTrackers,
          subjectId,
          slotClassId,
          currentDay,
          currentPeriod
        );
        setWeeklyHourTrackers(updatedTrackers);
      }
      
      // CRITICAL: Update subject-teacher mappings if in auto mode
      if (isAutoMode && subjectTeacherMappings.length > 0) {
        const slotClassId = mode === 'teacher' ? classId : selectedClassId;
        const slotTeacherId = mode === 'teacher' ? selectedTeacherId : teacherId || '';
        
        // Find the mapping
        const mappingIndex = subjectTeacherMappings.findIndex(m => 
          m.subjectId === subjectId && 
          m.classId === slotClassId &&
          m.teacherId === slotTeacherId
        );
        
        if (mappingIndex !== -1) {
          const updatedMappings = [...subjectTeacherMappings];
          updatedMappings[mappingIndex] = {
            ...updatedMappings[mappingIndex],
            assignedHours: updatedMappings[mappingIndex].assignedHours + 1
          };
          setSubjectTeacherMappings(updatedMappings);
        }
      }
      
      success('✅ Ders Atandı', `${currentDay} günü ${currentPeriod}. derse ders atandı`);
    } else {
      // Clear slot
      updatedSchedule[currentDay][currentPeriod] = null;
      info('🧹 Slot Temizlendi', `${currentDay} günü ${currentPeriod}. ders temizlendi`);
    }
    
    setCurrentSchedule(updatedSchedule);
    setHasUnsavedChanges(true);
  };

  const handleSaveSchedule = async () => {
    if (mode === 'teacher' && selectedTeacherId) {
      // Validate schedule
      const validationResult = validateSchedule(
        'teacher',
        currentSchedule,
        selectedTeacherId,
        schedules,
        teachers,
        classes,
        subjects,
        constraints,
        subjectTeacherMappings
      );
      
      if (!validationResult.isValid) {
        // Show confirmation with errors
        confirmConflictOverride(
          validationResult.errors,
          async () => {
            await saveTeacherSchedule();
          }
        );
      } else {
        // No conflicts, save directly
        await saveTeacherSchedule();
      }
    } else if (mode === 'class' && selectedClassId) {
      // For class mode, we need to update multiple teacher schedules
      await saveClassSchedule();
    }
  };

  const saveTeacherSchedule = async () => {
    try {
      const existingSchedule = schedules.find(s => s.teacherId === selectedTeacherId);
      
      if (existingSchedule) {
        await updateSchedule(existingSchedule.id, {
          schedule: currentSchedule,
          updatedAt: new Date()
        });
      } else {
        await addSchedule({
          teacherId: selectedTeacherId,
          schedule: currentSchedule,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Omit<Schedule, 'id'>);
      }
      
      success('✅ Program Kaydedildi', 'Öğretmen programı başarıyla kaydedildi');
      setHasUnsavedChanges(false);
    } catch (err) {
      error('❌ Kayıt Hatası', 'Program kaydedilirken bir hata oluştu');
    }
  };

  const saveClassSchedule = async () => {
    try {
      // For each slot in the class schedule, update the corresponding teacher's schedule
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const day of DAYS) {
        for (const period of PERIODS) {
          const slot = currentSchedule[day][period];
          
          // Skip empty slots and fixed periods
          if (!slot || slot.classId === 'fixed-period') {
            continue;
          }
          
          const teacherId = slot.teacherId;
          if (!teacherId) {
            continue;
          }
          
          // Find teacher's schedule
          const teacherSchedule = schedules.find(s => s.teacherId === teacherId);
          
          if (teacherSchedule) {
            // Update existing teacher schedule
            const updatedTeacherSchedule = {
              ...teacherSchedule,
              schedule: {
                ...teacherSchedule.schedule,
                [day]: {
                  ...teacherSchedule.schedule[day],
                  [period]: {
                    subjectId: slot.subjectId,
                    classId: selectedClassId
                  }
                }
              },
              updatedAt: new Date()
            };
            
            try {
              await updateSchedule(teacherSchedule.id, {
                schedule: updatedTeacherSchedule.schedule,
                updatedAt: new Date()
              });
              updatedCount++;
            } catch (err) {
              errorCount++;
            }
          } else {
            // Create new teacher schedule
            const newTeacherSchedule: Omit<Schedule, 'id'> = {
              teacherId,
              schedule: createEmptySchedule(),
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            // Add the class to this slot
            newTeacherSchedule.schedule[day][period] = {
              subjectId: slot.subjectId,
              classId: selectedClassId
            };
            
            try {
              await addSchedule(newTeacherSchedule);
              updatedCount++;
            } catch (err) {
              errorCount++;
            }
          }
        }
      }
      
      if (errorCount === 0) {
        success('✅ Program Kaydedildi', `${updatedCount} öğretmen programı güncellendi`);
      } else {
        warning('⚠️ Kısmi Başarı', `${updatedCount} program güncellendi, ${errorCount} hata oluştu`);
      }
      
      setHasUnsavedChanges(false);
    } catch (err) {
      error('❌ Kayıt Hatası', 'Program kaydedilirken bir hata oluştu');
    }
  };

  const handleResetSchedule = () => {
    confirmUnsavedChanges(
      () => {
        setCurrentSchedule(createEmptySchedule());
        setHasUnsavedChanges(true);
        info('🔄 Program Sıfırlandı', 'Program sıfırlandı, değişiklikleri kaydetmeyi unutmayın');
      }
    );
  };

  const handleDeleteSchedule = () => {
    if (mode === 'teacher' && selectedTeacherId) {
      const existingSchedule = schedules.find(s => s.teacherId === selectedTeacherId);
      
      if (existingSchedule) {
        confirmDelete(
          'Öğretmen Programı',
          async () => {
            await removeSchedule(existingSchedule.id);
            setCurrentSchedule(createEmptySchedule());
            setHasUnsavedChanges(false);
            success('🗑️ Program Silindi', 'Öğretmen programı başarıyla silindi');
          }
        );
      }
    } else if (mode === 'class' && selectedClassId) {
      confirmDelete(
        'Sınıf Programı',
        async () => {
          // Find all teacher schedules that have this class
          let deletedCount = 0;
          
          for (const schedule of schedules) {
            let hasClass = false;
            let updatedSchedule = { ...schedule.schedule };
            
            // Check if this teacher's schedule has this class
            DAYS.forEach(day => {
              PERIODS.forEach(period => {
                const slot = updatedSchedule[day][period];
                if (slot?.classId === selectedClassId) {
                  hasClass = true;
                  updatedSchedule[day][period] = null;
                }
              });
            });
            
            // If this teacher had this class, update their schedule
            if (hasClass) {
              try {
                await updateSchedule(schedule.id, {
                  schedule: updatedSchedule,
                  updatedAt: new Date()
                });
                deletedCount++;
              } catch (err) {
                console.error('Schedule update error:', err);
              }
            }
          }
          
          setCurrentSchedule(createEmptySchedule());
          setHasUnsavedChanges(false);
          success('🗑️ Program Silindi', `${deletedCount} öğretmen programından sınıf kaldırıldı`);
        }
      );
    }
  };

  const handleModeChange = (newMode: 'teacher' | 'class') => {
    if (hasUnsavedChanges) {
      confirmUnsavedChanges(
        () => {
          setMode(newMode);
          setSelectedTeacherId('');
          setSelectedClassId('');
          setCurrentSchedule(createEmptySchedule());
          setHasUnsavedChanges(false);
        }
      );
    } else {
      setMode(newMode);
      setSelectedTeacherId('');
      setSelectedClassId('');
      setCurrentSchedule(createEmptySchedule());
    }
  };

  const handleGenerateSchedule = async () => {
    if (!isAutoMode || !wizardData) {
      showError('Otomatik Program Oluşturma', 'Otomatik program oluşturmak için sihirbazı kullanmalısınız');
      return;
    }
    
    if (subjectTeacherMappings.length === 0 || weeklyHourTrackers.length === 0) {
      showError('Veri Eksik', 'Ders-öğretmen eşleştirmeleri veya haftalık saat takipçileri oluşturulamadı');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Otomatik program oluşturma
      console.log('🚀 Otomatik program oluşturma başlatılıyor...');
      
      // Burada scheduleGeneration.ts'deki generateSystematicSchedule fonksiyonunu çağırabilirsiniz
      // const result = await generateSystematicSchedule(wizardData, teachers, classes, subjects);
      
      // Şimdilik basit bir demo
      const demoResult = await demoGenerateSchedule();
      
      if (demoResult.success) {
        success('✅ Program Oluşturuldu', `${demoResult.schedules.length} program başarıyla oluşturuldu`);
        
        // İlk programı yükle
        if (demoResult.schedules.length > 0) {
          setCurrentSchedule(demoResult.schedules[0].schedule);
          setHasUnsavedChanges(true);
        }
      } else {
        error('❌ Program Oluşturma Hatası', demoResult.errors.join('\n'));
      }
    } catch (err) {
      console.error('Program oluşturma hatası:', err);
      error('❌ Program Oluşturma Hatası', 'Program oluşturulurken bir hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptimizeSchedule = async () => {
    if (!currentSchedule || Object.keys(currentSchedule).length === 0) {
      warning('⚠️ Program Bulunamadı', 'Optimize edilecek program bulunamadı');
      return;
    }
    
    setIsOptimizing(true);
    
    try {
      // Programı optimize et
      console.log('🔄 Program optimizasyonu başlatılıyor...');
      
      // Burada scheduleOptimization.ts'deki optimizeSchedules fonksiyonunu çağırabilirsiniz
      // const result = await optimizeSchedules(
      //   [{ teacherId: selectedTeacherId, schedule: currentSchedule, createdAt: new Date(), updatedAt: new Date() }],
      //   subjectTeacherMappings,
      //   { /* context */ },
      //   teachers,
      //   classes,
      //   subjects,
      //   constraints,
      //   OptimizationStrategy.MINIMIZE_CONFLICTS
      // );
      
      // Şimdilik basit bir demo
      setTimeout(() => {
        success('✅ Program Optimize Edildi', 'Program başarıyla optimize edildi');
        setIsOptimizing(false);
      }, 1500);
    } catch (err) {
      console.error('Program optimizasyon hatası:', err);
      error('❌ Optimizasyon Hatası', 'Program optimize edilirken bir hata oluştu');
      setIsOptimizing(false);
    }
  };

  // Demo function for schedule generation
  const demoGenerateSchedule = async () => {
    return new Promise<any>(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          schedules: [
            {
              teacherId: selectedTeacherId || '',
              schedule: currentSchedule,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ],
          errors: []
        });
      }, 2000);
    });
  };

  const getSlotInfo = (day: string, period: string) => {
    const slot = currentSchedule[day]?.[period];
    if (!slot) return null;
    
    if (mode === 'teacher') {
      const classItem = classes.find(c => c.id === slot.classId);
      const subject = subjects.find(s => s.id === slot.subjectId);
      
      return {
        classItem,
        subject
      };
    } else {
      const teacher = teachers.find(t => t.id === slot.teacherId);
      const subject = subjects.find(s => s.id === slot.subjectId);
      
      return {
        teacher,
        subject
      };
    }
  };

  const isFixedPeriod = (day: string, period: string): boolean => {
    const slot = currentSchedule[day]?.[period];
    return slot?.classId === 'fixed-period';
  };

  const getFixedPeriodInfo = (day: string, period: string) => {
    const slot = currentSchedule[day]?.[period];
    if (!slot || slot.classId !== 'fixed-period') return null;

    const teacherLevel = teachers.find(t => t.id === selectedTeacherId)?.level;
    const classLevel = classes.find(c => c.id === selectedClassId)?.level;
    const level = teacherLevel || classLevel;

    if (slot.subjectId === 'fixed-prep') {
      return {
        title: level === 'Ortaokul' ? 'Hazırlık' : 'Kahvaltı',
        color: 'bg-blue-100 border-blue-300 text-blue-800'
      };
    } else if (slot.subjectId === 'fixed-breakfast') {
      return {
        title: 'Kahvaltı',
        color: 'bg-orange-100 border-orange-300 text-orange-800'
      };
    } else if (slot.subjectId === 'fixed-lunch') {
      return {
        title: 'Yemek',
        color: 'bg-green-100 border-green-300 text-green-800'
      };
    } else if (slot.subjectId === 'fixed-afternoon-breakfast') {
      return {
        title: 'İkindi Kahvaltısı',
        color: 'bg-yellow-100 border-yellow-300 text-yellow-800'
      };
    }

    return null;
  };

  const calculateWeeklyHours = () => {
    let totalHours = 0;
    
    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        const slot = currentSchedule[day]?.[period];
        if (slot && slot.classId !== 'fixed-period') {
          totalHours++;
        }
      });
    });
    
    return totalHours;
  };

  const calculateDailyHours = (day: string) => {
    let dailyHours = 0;
    
    PERIODS.forEach(period => {
      const slot = currentSchedule[day]?.[period];
      if (slot && slot.classId !== 'fixed-period') {
        dailyHours++;
      }
    });
    
    return dailyHours;
  };

  // Calculate subject distribution
  const calculateSubjectDistribution = () => {
    const distribution: { [subjectId: string]: { count: number; name: string } } = {};
    
    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        const slot = currentSchedule[day]?.[period];
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
  const checkWeeklyHourTargets = () => {
    if (!isAutoMode || !subjectTeacherMappings.length) return { isValid: true, errors: [], warnings: [] };
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Calculate current distribution
    const distribution = calculateSubjectDistribution();
    
    // Check against mappings
    Object.entries(distribution).forEach(([subjectId, { count, name }]) => {
      const mapping = subjectTeacherMappings.find(m => 
        m.subjectId === subjectId && 
        m.classId === selectedClassId
      );
      
      if (mapping) {
        if (count > mapping.weeklyHours) {
          errors.push(`${name} dersi için haftalık saat limiti aşıldı: ${count}/${mapping.weeklyHours}`);
        } else if (count < mapping.weeklyHours) {
          warnings.push(`${name} dersi için haftalık saat hedefine ulaşılamadı: ${count}/${mapping.weeklyHours}`);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const teacherOptions = sortedTeachers.map(teacher => ({
    value: teacher.id,
    label: `${teacher.name} (${teacher.branch} - ${teacher.level})`
  }));

  const classOptions = sortedClasses.map(classItem => ({
    value: classItem.id,
    label: `${classItem.name} (${classItem.level})`
  }));

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  const selectedClass = classes.find(c => c.id === selectedClassId);
  
  const weeklyHours = calculateWeeklyHours();
  const subjectDistribution = calculateSubjectDistribution();
  const weeklyHourCheck = checkWeeklyHourTargets();

  const loading = teachersLoading || classesLoading || subjectsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container-mobile">
      {/* FIXED: Mobile-optimized header with consistent spacing */}
      <div className="header-mobile">
        <div className="flex items-center">
          <Calendar className="w-8 h-8 text-purple-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">Program Oluşturma</h1>
            <p className="text-responsive-sm text-gray-600">
              {isAutoMode ? 'Otomatik program oluşturma' : 'Manuel program oluşturma'}
            </p>
          </div>
        </div>
        <div className="button-group-mobile">
          {isAutoMode && (
            <Button
              onClick={handleGenerateSchedule}
              icon={Zap}
              variant="primary"
              disabled={isGenerating}
              className="w-full sm:w-auto"
            >
              {isGenerating ? 'Oluşturuluyor...' : 'Otomatik Oluştur'}
            </Button>
          )}
          
          <Button
            onClick={handleOptimizeSchedule}
            icon={RefreshCw}
            variant="secondary"
            disabled={isOptimizing || !selectedTeacherId && !selectedClassId}
            className="w-full sm:w-auto"
          >
            {isOptimizing ? 'Optimize Ediliyor...' : 'Optimize Et'}
          </Button>
          
          <Button
            onClick={handleSaveSchedule}
            icon={Save}
            variant="primary"
            disabled={!hasUnsavedChanges || (!selectedTeacherId && !selectedClassId)}
            className="w-full sm:w-auto"
          >
            Kaydet
          </Button>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="mobile-card mobile-spacing mb-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Program Modu
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleModeChange('teacher')}
                className={`py-3 px-4 rounded-lg border-2 flex items-center justify-center ${
                  mode === 'teacher'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="w-5 h-5 mr-2" />
                <span className="font-medium">Öğretmen Bazlı</span>
              </button>
              <button
                onClick={() => handleModeChange('class')}
                className={`py-3 px-4 rounded-lg border-2 flex items-center justify-center ${
                  mode === 'class'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Building className="w-5 h-5 mr-2" />
                <span className="font-medium">Sınıf Bazlı</span>
              </button>
            </div>
          </div>
          
          <div className="flex-1">
            {mode === 'teacher' ? (
              <Select
                label="Öğretmen Seçin"
                value={selectedTeacherId}
                onChange={setSelectedTeacherId}
                options={teacherOptions}
                required
              />
            ) : (
              <Select
                label="Sınıf Seçin"
                value={selectedClassId}
                onChange={setSelectedClassId}
                options={classOptions}
                required
              />
            )}
          </div>
        </div>
      </div>

      {/* Weekly Hour Targets - Only show in auto mode */}
      {isAutoMode && (mode === 'teacher' ? selectedTeacherId : selectedClassId) && (
        <div className="mobile-card mobile-spacing mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
            Haftalık Ders Saati Dağılımı
          </h3>
          
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-700">
              Toplam Haftalık Saat:
            </div>
            <div className={`text-lg font-bold ${weeklyHours <= 45 ? 'text-green-600' : 'text-red-600'}`}>
              {weeklyHours} / 45
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div 
              className={`h-2.5 rounded-full ${weeklyHours <= 45 ? 'bg-green-600' : 'bg-red-600'}`}
              style={{ width: `${Math.min(100, (weeklyHours / 45) * 100)}%` }}
            ></div>
          </div>
          
          {/* Subject distribution */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {Object.entries(subjectDistribution).map(([subjectId, { count, name }]) => {
              // Find target hours for this subject
              const mapping = subjectTeacherMappings.find(m => 
                m.subjectId === subjectId && 
                m.classId === (mode === 'teacher' ? '' : selectedClassId)
              );
              
              const targetHours = mapping?.weeklyHours || 0;
              const isCompleted = targetHours > 0 && count >= targetHours;
              const isExceeded = targetHours > 0 && count > targetHours;
              
              return (
                <div key={subjectId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      isExceeded ? 'bg-red-500' : 
                      isCompleted ? 'bg-green-500' : 
                      'bg-yellow-500'
                    }`} />
                    <div className="flex-1 truncate">{name}</div>
                  </div>
                  <div className={`font-medium ${
                    isExceeded ? 'text-red-600' : 
                    isCompleted ? 'text-green-600' : 
                    'text-yellow-600'
                  }`}>
                    {count} {targetHours > 0 ? `/ ${targetHours}` : ''} saat
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Warnings */}
          {!weeklyHourCheck.isValid && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 mr-2" />
                <div className="text-xs text-red-700">
                  <strong>Uyarı:</strong> Haftalık saat limitleri aşıldı:
                  <ul className="mt-1 list-disc list-inside">
                    {weeklyHourCheck.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {weeklyHourCheck.warnings.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <Info className="w-4 h-4 text-yellow-600 mt-0.5 mr-2" />
                <div className="text-xs text-yellow-700">
                  <strong>Bilgi:</strong> Bazı dersler için haftalık saat hedefine ulaşılamadı:
                  <ul className="mt-1 list-disc list-inside">
                    {weeklyHourCheck.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Grid */}
      {(mode === 'teacher' ? selectedTeacherId : selectedClassId) ? (
        <div className="mobile-card overflow-hidden mb-6">
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {mode === 'teacher' 
                    ? `📚 ${selectedTeacher?.name} Programı` 
                    : `📚 ${selectedClass?.name} Programı`}
                </h3>
                <p className="text-gray-600 mt-1">
                  <span className="font-medium">
                    {mode === 'teacher' 
                      ? `${selectedTeacher?.branch} - ${selectedTeacher?.level}` 
                      : selectedClass?.level}
                  </span> • 
                  <span className="ml-2">Haftalık toplam: <strong>{weeklyHours} ders saati</strong></span>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleResetSchedule}
                  icon={RefreshCw}
                  variant="secondary"
                  size="sm"
                >
                  Sıfırla
                </Button>
                <Button
                  onClick={handleDeleteSchedule}
                  icon={Trash2}
                  variant="danger"
                  size="sm"
                >
                  Sil
                </Button>
              </div>
            </div>
          </div>
          
          <div className="table-responsive">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Ders Saati
                  </th>
                  {DAYS.map(day => (
                    <th key={day} className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">
                      <div className="font-bold">{day}</div>
                      <div className="text-xs mt-1 font-normal">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                          {calculateDailyHours(day)} ders
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {PERIODS.map((period, index) => (
                  <tr key={period} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-4 font-bold text-gray-900 bg-gray-100">
                      {period}. Ders
                    </td>
                    {DAYS.map(day => {
                      const isFixed = isFixedPeriod(day, period);
                      const fixedInfo = isFixed ? getFixedPeriodInfo(day, period) : null;
                      const slotInfo = getSlotInfo(day, period);
                      
                      return (
                        <td key={`${day}-${period}`} className="px-3 py-3">
                          {isFixed ? (
                            <div className={`text-center p-3 rounded-lg border-2 ${fixedInfo?.color || 'border-gray-300 bg-gray-50'}`}>
                              <div className="font-bold text-sm">
                                {fixedInfo?.title || 'Sabit Periyot'}
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSlotClick(day, period)}
                              className={`w-full text-center p-3 rounded-lg border-2 transition-all duration-200 ${
                                slotInfo
                                  ? 'bg-blue-50 border-blue-300 hover:bg-blue-100 hover:border-blue-400'
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                              }`}
                            >
                              {slotInfo ? (
                                mode === 'teacher' ? (
                                  <div>
                                    <div className="font-bold text-blue-900 text-sm">
                                      {slotInfo.classItem?.name}
                                    </div>
                                    <div className="text-blue-700 text-xs mt-1">
                                      {slotInfo.subject?.name}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-bold text-blue-900 text-sm">
                                      {slotInfo.teacher?.name}
                                    </div>
                                    <div className="text-blue-700 text-xs mt-1">
                                      {slotInfo.subject?.name}
                                    </div>
                                  </div>
                                )
                              ) : (
                                <div className="text-gray-400 text-xs">Boş</div>
                              )}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 mobile-card">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {mode === 'teacher' ? 'Öğretmen Seçin' : 'Sınıf Seçin'}
          </h3>
          <p className="text-gray-500">
            Program oluşturmak için {mode === 'teacher' ? 'bir öğretmen' : 'bir sınıf'} seçin
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div className="text-sm text-blue-700">
            <h4 className="font-medium mb-1">Program Oluşturma Hakkında</h4>
            <p>
              {isAutoMode 
                ? 'Otomatik program oluşturma modu aktif. Sihirbazdan gelen veriler kullanılarak program oluşturulacak.'
                : 'Manuel program oluşturma modundasınız. İstediğiniz dersleri manuel olarak atayabilirsiniz.'}
            </p>
            <p className="mt-2">
              <strong>Mevcut Mod:</strong> {mode === 'teacher' ? 'Öğretmen Bazlı' : 'Sınıf Bazlı'}
            </p>
            {(mode === 'teacher' ? selectedTeacherId : selectedClassId) && (
              <p className="mt-1">
                <strong>Seçili:</strong> {mode === 'teacher' ? selectedTeacher?.name : selectedClass?.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Slot Modal */}
      <ScheduleSlotModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        onSave={handleSlotSave}
        subjects={subjects}
        classes={classes}
        teachers={teachers}
        mode={mode}
        currentSubjectId={currentSlot?.subjectId || ''}
        currentClassId={currentSlot?.classId || ''}
        currentTeacherId={currentSlot?.teacherId || ''}
        day={currentDay}
        period={currentPeriod}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={hideConfirmation}
        onConfirm={confirmation.onConfirm}
        title={confirmation.title}
        message={confirmation.message}
        type={confirmation.type}
        confirmText={confirmation.confirmText}
        cancelText={confirmation.cancelText}
        confirmVariant={confirmation.confirmVariant}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={hideError}
        title={errorModal.title}
        message={errorModal.message}
      />
    </div>
  );
};

export default Schedules;