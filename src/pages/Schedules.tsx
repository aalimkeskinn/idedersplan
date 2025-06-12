import React, { useState, useEffect } from 'react';
import { Calendar, Save, RotateCcw, Users, Building, ArrowLeftRight, Clock } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Teacher, Class, Subject, Schedule, DAYS, PERIODS, getTimeForPeriod, formatTimeRange } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useErrorModal } from '../hooks/useErrorModal';
import { useConfirmation } from '../hooks/useConfirmation';
import { validateSchedule, checkSlotConflict } from '../utils/validation';
import Button from '../components/UI/Button';
import Select from '../components/UI/Select';
import ScheduleSlotModal from '../components/UI/ScheduleSlotModal';
import ConfirmationModal from '../components/UI/ConfirmationModal';
import ErrorModal from '../components/UI/ErrorModal';

type ScheduleMode = 'teacher' | 'class';

const Schedules = () => {
  const location = useLocation();
  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: classes } = useFirestore<Class>('classes');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { data: schedules, add, update } = useFirestore<Schedule>('schedules');
  const { success, warning, info } = useToast();
  const { errorModal, showError, hideError } = useErrorModal();
  const { 
    confirmation, 
    hideConfirmation, 
    confirmReset, 
    confirmUnsavedChanges
  } = useConfirmation();

  const [mode, setMode] = useState<ScheduleMode>('teacher');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [currentSchedule, setCurrentSchedule] = useState<Schedule['schedule']>({});
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; period: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  // Check URL parameters for mode and pre-selection
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const urlMode = urlParams.get('mode') as ScheduleMode;
    const urlClassId = urlParams.get('classId');
    const urlTeacherId = urlParams.get('teacherId');

    console.log('🔗 URL parametreleri kontrol ediliyor:', {
      urlMode,
      urlClassId,
      urlTeacherId,
      classesLoaded: classes.length > 0,
      teachersLoaded: teachers.length > 0
    });

    // Set mode from URL
    if (urlMode && (urlMode === 'teacher' || urlMode === 'class')) {
      setMode(urlMode);
      info('🔄 Mod Ayarlandı', `${urlMode === 'teacher' ? 'Öğretmen' : 'Sınıf'} bazlı program oluşturma modu aktif`);
    }

    // Pre-select class if specified in URL
    if (urlMode === 'class' && urlClassId && classes.length > 0) {
      const classExists = classes.find(c => c.id === urlClassId);
      if (classExists) {
        setSelectedClassId(urlClassId);
        info('🎯 Sınıf Seçildi', `${classExists.name} sınıfı otomatik olarak seçildi`);
      }
    }

    // Pre-select teacher if specified in URL
    if (urlMode === 'teacher' && urlTeacherId && teachers.length > 0) {
      const teacherExists = teachers.find(t => t.id === urlTeacherId);
      if (teacherExists) {
        setSelectedTeacherId(urlTeacherId);
        info('🎯 Öğretmen Seçildi', `${teacherExists.name} öğretmeni otomatik olarak seçildi`);
      }
    }
  }, [location.search, classes, teachers, info]);

  // Track unsaved changes
  useEffect(() => {
    const weeklyHours = calculateWeeklyHours();
    setHasUnsavedChanges(weeklyHours > 0);
  }, [currentSchedule]);

  // Reset form when mode changes
  useEffect(() => {
    // Don't reset if we're setting from URL parameters
    const urlParams = new URLSearchParams(location.search);
    const urlMode = urlParams.get('mode');
    
    if (!urlMode) {
      setSelectedTeacherId('');
      setSelectedClassId('');
      setSelectedTeacher(null);
      setSelectedClass(null);
      setCurrentSchedule({});
      setHasUnsavedChanges(false);
    }
  }, [mode, location.search]);

  // Teacher mode logic
  useEffect(() => {
    if (mode === 'teacher' && selectedTeacherId) {
      const teacher = teachers.find(t => t.id === selectedTeacherId);
      setSelectedTeacher(teacher || null);
      
      const existingSchedule = schedules.find(s => s.teacherId === selectedTeacherId);
      if (existingSchedule) {
        setCurrentSchedule(existingSchedule.schedule);
      } else {
        // Initialize with fixed periods for new schedule
        const initialSchedule = initializeScheduleWithFixedPeriods(teacher?.level);
        setCurrentSchedule(initialSchedule);
      }
    }
  }, [selectedTeacherId, teachers, schedules, mode]);

  // Class mode logic
  useEffect(() => {
    if (mode === 'class' && selectedClassId) {
      const classItem = classes.find(c => c.id === selectedClassId);
      setSelectedClass(classItem || null);
      
      // Build class schedule from all teacher schedules
      const classSchedule: Schedule['schedule'] = {};
      
      schedules.forEach(schedule => {
        Object.entries(schedule.schedule).forEach(([day, daySchedule]) => {
          Object.entries(daySchedule).forEach(([period, slot]) => {
            if (slot?.classId === selectedClassId) {
              if (!classSchedule[day]) classSchedule[day] = {};
              classSchedule[day][period] = {
                subjectId: slot.subjectId,
                classId: slot.classId,
                teacherId: schedule.teacherId
              };
            }
          });
        });
      });
      
      // Add fixed periods for class schedule
      const scheduleWithFixed = addFixedPeriodsToSchedule(classSchedule, classItem?.level);
      setCurrentSchedule(scheduleWithFixed);
    }
  }, [selectedClassId, classes, schedules, mode]);

  // Initialize schedule with fixed periods (preparation, lunch, breakfast, and afternoon breakfast)
  const initializeScheduleWithFixedPeriods = (level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): Schedule['schedule'] => {
    const schedule: Schedule['schedule'] = {};
    
    DAYS.forEach(day => {
      schedule[day] = {};
      
      // Add fixed preparation period before 1st class
      if (level === 'İlkokul' || level === 'Anaokulu') {
        // İlkokul: 08:30-08:50 Kahvaltı
        schedule[day]['prep'] = {
          subjectId: 'fixed-breakfast',
          classId: 'fixed-period'
        };
      } else if (level === 'Ortaokul') {
        // Ortaokul: 08:30-08:40 Hazırlık
        schedule[day]['prep'] = {
          subjectId: 'fixed-prep',
          classId: 'fixed-period'
        };
        
        // NEW: Add breakfast between 1st and 2nd period for middle school
        schedule[day]['breakfast'] = {
          subjectId: 'fixed-breakfast',
          classId: 'fixed-period'
        };
      }
      
      // Add fixed lunch period
      if (level === 'İlkokul' || level === 'Anaokulu') {
        // İlkokul: 5. ders 11:50-12:25 Yemek
        schedule[day]['5'] = {
          subjectId: 'fixed-lunch',
          classId: 'fixed-period'
        };
      } else if (level === 'Ortaokul') {
        // Ortaokul: 6. ders 12:30-13:05 Yemek
        schedule[day]['6'] = {
          subjectId: 'fixed-lunch',
          classId: 'fixed-period'
        };
      }
      
      // Add fixed afternoon breakfast between 8th and 9th period
      schedule[day]['afternoon-breakfast'] = {
        subjectId: 'fixed-afternoon-breakfast',
        classId: 'fixed-period'
      };
    });
    
    return schedule;
  };

  // Add fixed periods to existing schedule
  const addFixedPeriodsToSchedule = (
    existingSchedule: Schedule['schedule'], 
    level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'
  ): Schedule['schedule'] => {
    const schedule = { ...existingSchedule };
    
    DAYS.forEach(day => {
      if (!schedule[day]) schedule[day] = {};
      
      // Add fixed preparation period if not exists
      if (!schedule[day]['prep']) {
        if (level === 'İlkokul' || level === 'Anaokulu') {
          schedule[day]['prep'] = {
            subjectId: 'fixed-breakfast',
            classId: 'fixed-period'
          };
        } else if (level === 'Ortaokul') {
          schedule[day]['prep'] = {
            subjectId: 'fixed-prep',
            classId: 'fixed-period'
          };
        }
      }
      
      // NEW: Add breakfast between 1st and 2nd period for middle school
      if (level === 'Ortaokul' && !schedule[day]['breakfast']) {
        schedule[day]['breakfast'] = {
          subjectId: 'fixed-breakfast',
          classId: 'fixed-period'
        };
      }
      
      // Add fixed lunch period if not exists
      const lunchPeriod = (level === 'İlkokul' || level === 'Anaokulu') ? '5' : '6';
      if (!schedule[day][lunchPeriod]) {
        schedule[day][lunchPeriod] = {
          subjectId: 'fixed-lunch',
          classId: 'fixed-period'
        };
      }
      
      // Add fixed afternoon breakfast if not exists
      if (!schedule[day]['afternoon-breakfast']) {
        schedule[day]['afternoon-breakfast'] = {
          subjectId: 'fixed-afternoon-breakfast',
          classId: 'fixed-period'
        };
      }
    });
    
    return schedule;
  };

  const getFilteredClasses = () => {
    if (mode === 'teacher' && selectedTeacher) {
      return classes.filter(c => c.level === selectedTeacher.level);
    }
    return classes;
  };

  const getFilteredSubjects = () => {
    if (mode === 'teacher' && selectedTeacher) {
      return subjects.filter(s => 
        s.level === selectedTeacher.level && 
        s.branch === selectedTeacher.branch
      );
    }
    if (mode === 'class' && selectedClass) {
      return subjects.filter(s => s.level === selectedClass.level);
    }
    return subjects;
  };

  const getFilteredTeachers = () => {
    if (mode === 'class' && selectedClass) {
      return teachers.filter(t => t.level === selectedClass.level);
    }
    return teachers;
  };

  // Check if a period is fixed (preparation, lunch, breakfast, or afternoon breakfast)
  const isFixedPeriod = (day: string, period: string): boolean => {
    const slot = currentSchedule[day]?.[period];
    return slot?.classId === 'fixed-period';
  };

  // Get fixed period display info with correct text
  const getFixedPeriodInfo = (day: string, period: string, level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul') => {
    const slot = currentSchedule[day]?.[period];
    if (!slot || slot.classId !== 'fixed-period') return null;

    if (slot.subjectId === 'fixed-prep') {
      return {
        title: 'Hazırlık',
        subtitle: level === 'Ortaokul' ? '08:30-08:40' : '08:30-08:50',
        color: 'bg-blue-100 border-blue-300 text-blue-800'
      };
    } else if (slot.subjectId === 'fixed-breakfast') {
      return {
        title: 'Kahvaltı',
        subtitle: level === 'Ortaokul' ? '09:15-09:35' : '08:30-08:50',
        color: 'bg-orange-100 border-orange-300 text-orange-800'
      };
    } else if (slot.subjectId === 'fixed-lunch') {
      return {
        title: 'Yemek',
        subtitle: level === 'İlkokul' || level === 'Anaokul' ? '11:50-12:25' : '12:30-13:05',
        color: 'bg-green-100 border-green-300 text-green-800'
      };
    } else if (slot.subjectId === 'fixed-afternoon-breakfast') {
      return {
        title: 'İkindi Kahvaltısı',
        subtitle: '14:35-14:45',
        color: 'bg-yellow-100 border-yellow-300 text-yellow-800'
      };
    }

    return null;
  };

  const handleSlotClick = (day: string, period: string) => {
    // Don't allow editing fixed periods
    if (isFixedPeriod(day, period)) {
      const slot = currentSchedule[day]?.[period];
      let message = 'Bu saat sabitlenmiştir';
      
      if (slot?.subjectId === 'fixed-prep') {
        message = 'Bu saat hazırlık saati olarak sabitlenmiştir';
      } else if (slot?.subjectId === 'fixed-breakfast') {
        message = 'Bu saat kahvaltı saati olarak sabitlenmiştir';
      } else if (slot?.subjectId === 'fixed-lunch') {
        message = 'Bu saat yemek saati olarak sabitlenmiştir';
      } else if (slot?.subjectId === 'fixed-afternoon-breakfast') {
        message = 'Bu saat ikindi kahvaltısı olarak sabitlenmiştir';
      }
      
      info('🔒 Sabit Ders Saati', message);
      return;
    }

    setSelectedSlot({ day, period });
    setModalOpen(true);
  };

  const handleSlotSave = (subjectId: string, classId: string, teacherId?: string) => {
    if (!selectedSlot) return;

    const { day, period } = selectedSlot;
    
    console.log('💾 Slot kaydetme işlemi başlatıldı:', {
      mode,
      day,
      period,
      subjectId,
      classId,
      teacherId,
      selectedTeacherId,
      selectedClassId
    });
    
    if (mode === 'teacher') {
      // Teacher mode: assign class to teacher's schedule
      if (!classId) {
        // Clear the slot
        setCurrentSchedule(prev => {
          const newSchedule = { ...prev };
          if (newSchedule[day]) {
            delete newSchedule[day][period];
            if (Object.keys(newSchedule[day]).length === 0) {
              delete newSchedule[day];
            }
          }
          return newSchedule;
        });
        success('🧹 Slot Temizlendi', 'Ders saati başarıyla temizlendi');
        return;
      }

      // REAL-TIME CONFLICT CHECK
      console.log('🔍 Teacher mode çakışma kontrolü yapılıyor...');
      const conflictCheck = checkSlotConflict(
        'teacher',
        day,
        period,
        classId,
        selectedTeacherId,
        schedules,
        teachers,
        classes
      );
      
      console.log('📊 Çakışma kontrolü sonucu:', conflictCheck);
      
      if (conflictCheck.hasConflict) {
        console.log('❌ Çakışma tespit edildi, ERROR MODAL gösteriliyor');
        showError('❌ Çakışma Tespit Edildi!', conflictCheck.message);
        return;
      }
      
      // Set the slot
      setCurrentSchedule(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          [period]: {
            subjectId,
            classId
          }
        }
      }));
      
      const className = classes.find(c => c.id === classId)?.name || 'Sınıf';
      success('✅ Ders Atandı', `${className} ${day} günü ${period}. derse atandı`);
      
    } else {
      // Class mode: assign teacher to class's schedule
      if (!teacherId) {
        // Clear the slot
        setCurrentSchedule(prev => {
          const newSchedule = { ...prev };
          if (newSchedule[day]) {
            delete newSchedule[day][period];
            if (Object.keys(newSchedule[day]).length === 0) {
              delete newSchedule[day];
            }
          }
          return newSchedule;
        });
        success('🧹 Slot Temizlendi', 'Ders saati başarıyla temizlendi');
        return;
      }

      // REAL-TIME CONFLICT CHECK
      console.log('🔍 Class mode çakışma kontrolü yapılıyor...');
      const conflictCheck = checkSlotConflict(
        'class',
        day,
        period,
        teacherId,
        selectedClassId,
        schedules,
        teachers,
        classes
      );
      
      console.log('📊 Çakışma kontrolü sonucu:', conflictCheck);
      
      if (conflictCheck.hasConflict) {
        console.log('❌ Çakışma tespit edildi, ERROR MODAL gösteriliyor');
        showError('❌ Çakışma Tespit Edildi!', conflictCheck.message);
        return;
      }
      
      // Set the slot
      setCurrentSchedule(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          [period]: {
            subjectId,
            classId: selectedClassId,
            teacherId
          }
        }
      }));
      
      const teacherName = teachers.find(t => t.id === teacherId)?.name || 'Öğretmen';
      success('✅ Ders Atandı', `${teacherName} ${day} günü ${period}. derse atandı`);
    }
  };

  const calculateWeeklyHours = () => {
    let totalHours = 0;
    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        const slot = currentSchedule[day]?.[period];
        // Don't count fixed periods in weekly hours
        if (slot && slot.classId !== 'fixed-period') {
          if (mode === 'teacher' && slot.classId) {
            totalHours++;
          } else if (mode === 'class' && slot.teacherId) {
            totalHours++;
          }
        }
      });
    });
    return totalHours;
  };

  const calculateDailyHours = (day: string) => {
    let dailyHours = 0;
    PERIODS.forEach(period => {
      const slot = currentSchedule[day]?.[period];
      // Don't count fixed periods in daily hours
      if (slot && slot.classId !== 'fixed-period') {
        if (mode === 'teacher' && slot.classId) {
          dailyHours++;
        } else if (mode === 'class' && slot.teacherId) {
          dailyHours++;
        }
      }
    });
    return dailyHours;
  };

  const saveSchedule = async () => {
    if (mode === 'teacher' && !selectedTeacherId) {
      showError('⚠️ Seçim Gerekli', 'Lütfen bir öğretmen seçin');
      return;
    }
    if (mode === 'class' && !selectedClassId) {
      showError('⚠️ Seçim Gerekli', 'Lütfen bir sınıf seçin');
      return;
    }

    console.log('💾 Program kaydetme işlemi başlatıldı');

    // COMPREHENSIVE VALIDATION
    const validation = validateSchedule(
      mode,
      currentSchedule,
      mode === 'teacher' ? selectedTeacherId : selectedClassId,
      schedules,
      teachers,
      classes,
      subjects
    );

    console.log('📊 Doğrulama sonuçları:', validation);

    if (!validation.isValid) {
      console.log('❌ Doğrulama başarısız, ERROR MODAL gösteriliyor');
      showError('🚫 Program Kaydedilemedi!', `Aşağıdaki sorunları düzeltin:\n\n${validation.errors.join('\n')}`);
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      warning('⚠️ Uyarılar', validation.warnings.join('\n'));
    }

    try {
      if (mode === 'teacher') {
        // Save teacher schedule
        const existingSchedule = schedules.find(s => s.teacherId === selectedTeacherId);
        
        if (existingSchedule) {
          await update(existingSchedule.id, {
            schedule: currentSchedule,
            updatedAt: new Date()
          });
        } else {
          await add({
            teacherId: selectedTeacherId,
            schedule: currentSchedule
          } as Omit<Schedule, 'id' | 'createdAt'>);
        }
        
        success('✅ Program Kaydedildi!', `${selectedTeacher?.name || 'Öğretmen'} için program başarıyla kaydedildi`);
      } else {
        // Save class schedule by updating multiple teacher schedules
        const teacherScheduleUpdates: { [teacherId: string]: { schedule: Schedule['schedule'], scheduleId?: string } } = {};
        
        // First, remove this class from all existing schedules
        for (const schedule of schedules) {
          const updatedSchedule = { ...schedule.schedule };
          let hasChanges = false;
          
          Object.keys(updatedSchedule).forEach(day => {
            Object.keys(updatedSchedule[day]).forEach(period => {
              if (updatedSchedule[day][period]?.classId === selectedClassId) {
                delete updatedSchedule[day][period];
                hasChanges = true;
              }
            });
            if (Object.keys(updatedSchedule[day]).length === 0) {
              delete updatedSchedule[day];
            }
          });
          
          if (hasChanges) {
            teacherScheduleUpdates[schedule.teacherId] = {
              schedule: updatedSchedule,
              scheduleId: schedule.id
            };
          }
        }
        
        // Then, add new assignments
        Object.entries(currentSchedule).forEach(([day, daySchedule]) => {
          Object.entries(daySchedule).forEach(([period, slot]) => {
            if (slot?.teacherId && slot.classId !== 'fixed-period') {
              if (!teacherScheduleUpdates[slot.teacherId]) {
                const existingSchedule = schedules.find(s => s.teacherId === slot.teacherId);
                teacherScheduleUpdates[slot.teacherId] = {
                  schedule: existingSchedule ? { ...existingSchedule.schedule } : {},
                  scheduleId: existingSchedule?.id
                };
              }
              
              if (!teacherScheduleUpdates[slot.teacherId].schedule[day]) {
                teacherScheduleUpdates[slot.teacherId].schedule[day] = {};
              }
              
              teacherScheduleUpdates[slot.teacherId].schedule[day][period] = {
                subjectId: slot.subjectId,
                classId: selectedClassId
              };
            }
          });
        });
        
        // Update all affected teacher schedules
        for (const [teacherId, { schedule: updatedSchedule, scheduleId }] of Object.entries(teacherScheduleUpdates)) {
          if (scheduleId) {
            await update(scheduleId, {
              schedule: updatedSchedule,
              updatedAt: new Date()
            });
          } else {
            await add({
              teacherId,
              schedule: updatedSchedule
            } as Omit<Schedule, 'id' | 'createdAt'>);
          }
        }
        
        success('✅ Program Kaydedildi!', `${selectedClass?.name || 'Sınıf'} için program başarıyla kaydedildi`);
      }
      
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Kayıt hatası:', err);
      showError('❌ Kayıt Hatası', 'Program kaydedilirken bir hata oluştu');
    }
  };

  const resetSchedule = () => {
    confirmReset(() => {
      if (mode === 'teacher' && selectedTeacher) {
        const initialSchedule = initializeScheduleWithFixedPeriods(selectedTeacher.level);
        setCurrentSchedule(initialSchedule);
      } else if (mode === 'class' && selectedClass) {
        const initialSchedule = initializeScheduleWithFixedPeriods(selectedClass.level);
        setCurrentSchedule(initialSchedule);
      } else {
        setCurrentSchedule({});
      }
      setHasUnsavedChanges(false);
      success('🔄 Program Sıfırlandı', 'Tüm değişiklikler temizlendi (sabit saatler korundu)');
    });
  };

  const switchMode = (newMode: ScheduleMode) => {
    if (hasUnsavedChanges) {
      confirmUnsavedChanges(() => {
        setMode(newMode);
        // Clear URL parameters when switching modes manually
        window.history.replaceState({}, '', '/schedules');
        warning('🔄 Mod Değiştirildi', `${newMode === 'teacher' ? 'Öğretmen' : 'Sınıf'} bazlı program oluşturma moduna geçildi`);
      });
    } else {
      setMode(newMode);
      // Clear URL parameters when switching modes manually
      window.history.replaceState({}, '', '/schedules');
      info('🔄 Mod Değiştirildi', `${newMode === 'teacher' ? 'Öğretmen' : 'Sınıf'} bazlı program oluşturma moduna geçildi`);
    }
  };

  const teacherOptions = sortedTeachers.map(teacher => ({
    value: teacher.id,
    label: `${teacher.name} (${teacher.branch} - ${teacher.level})`
  }));

  const classOptions = sortedClasses.map(classItem => ({
    value: classItem.id,
    label: `${classItem.name} (${classItem.level})`
  }));

  const getSlotDisplay = (day: string, period: string) => {
    const slot = currentSchedule[day]?.[period];
    if (!slot) return null;

    // Handle fixed periods
    if (slot.classId === 'fixed-period') {
      const entity = mode === 'teacher' ? selectedTeacher : selectedClass;
      return getFixedPeriodInfo(day, period, entity?.level);
    }

    if (mode === 'teacher') {
      // Show class name for teacher mode
      if (!slot.classId) return null;
      const classItem = classes.find(c => c.id === slot.classId);
      return classItem ? { 
        primary: classItem.name, 
        secondary: null,
        color: 'bg-blue-50 border-blue-300 text-blue-900'
      } : null;
    } else {
      // Show teacher name for class mode
      if (!slot.teacherId) return null;
      const teacher = teachers.find(t => t.id === slot.teacherId);
      return teacher ? { 
        primary: teacher.name, 
        secondary: teacher.branch,
        color: 'bg-emerald-50 border-emerald-300 text-emerald-900'
      } : null;
    }
  };

  // Zaman bilgisini al
  const getTimeInfo = (period: string) => {
    const entity = mode === 'teacher' ? selectedTeacher : selectedClass;
    const level = entity?.level;
    const timePeriod = getTimeForPeriod(period, level);
    
    if (timePeriod) {
      return formatTimeRange(timePeriod.startTime, timePeriod.endTime);
    }
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Calendar className="w-8 h-8 text-purple-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Program Oluşturucu</h1>
            <p className="text-gray-600">
              {mode === 'teacher' ? 'Öğretmen bazlı' : 'Sınıf bazlı'} ders programları düzenleyin
              {hasUnsavedChanges && (
                <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                  Kaydedilmemiş değişiklikler
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-center mb-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => switchMode('teacher')}
              className={`flex items-center px-4 py-2 rounded-md transition-all duration-200 ${
                mode === 'teacher'
                  ? 'bg-white text-purple-700 shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Öğretmen Bazlı
            </button>
            <button
              onClick={() => switchMode('class')}
              className={`flex items-center px-4 py-2 rounded-md transition-all duration-200 ${
                mode === 'class'
                  ? 'bg-white text-purple-700 shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building className="w-4 h-4 mr-2" />
              Sınıf Bazlı
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Selection - 4 columns */}
          <div className="lg:col-span-4">
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
          
          {/* Weekly Hours Info - 4 columns */}
          <div className="lg:col-span-4">
            {(selectedTeacher || selectedClass) && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Haftalık Ders Saati</div>
                <div className={`text-lg font-bold ${calculateWeeklyHours() > 30 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {calculateWeeklyHours()}/30 saat
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {mode === 'teacher' ? 'Öğretmen programı' : 'Sınıf programı'}
                  {hasUnsavedChanges && (
                    <span className="ml-2 text-yellow-600">• Kaydedilmedi</span>
                  )}
                </div>
                {/* Zaman dilimi bilgisi */}
                <div className="text-xs text-blue-600 mt-1 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {(selectedTeacher || selectedClass)?.level === 'Ortaokul' ? 'Ortaokul Saatleri' : 'Genel Saatler'}
                </div>
                <div className="text-xs text-green-600 mt-1">🔒 Yemek • 🥐 Kahvaltı</div>
              </div>
            )}
          </div>
          
          {/* Action Buttons - 4 columns */}
          <div className="lg:col-span-4">
            {(selectedTeacher || selectedClass) && (
              <div className="flex justify-end space-x-2">
                <Button
                  onClick={resetSchedule}
                  icon={RotateCcw}
                  variant="secondary"
                  size="md"
                  disabled={!hasUnsavedChanges}
                >
                  Sıfırla
                </Button>
                <Button
                  onClick={saveSchedule}
                  icon={Save}
                  variant="primary"
                  size="md"
                  disabled={!hasUnsavedChanges}
                >
                  Kaydet
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {(selectedTeacher || selectedClass) && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  {mode === 'teacher' 
                    ? `${selectedTeacher?.name} - ${selectedTeacher?.branch} (${selectedTeacher?.level}) Ders Programı`
                    : `${selectedClass?.name} (${selectedClass?.level}) Sınıf Ders Programı`
                  }
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {mode === 'teacher' 
                    ? 'Ders saatlerine tıklayarak sınıf atayabilirsiniz'
                    : 'Ders saatlerine tıklayarak öğretmen atayabilirsiniz'
                  }
                  <span className="ml-2 text-blue-600">
                    • {(selectedTeacher || selectedClass)?.level === 'Ortaokul' ? 'Ortaokul zaman dilimi' : 'Genel zaman dilimi'}
                  </span>
                  <span className="ml-2 text-green-600">
                    • 🔒 Yemek • 🥐 Kahvaltı
                  </span>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${mode === 'teacher' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                <span className="text-sm font-medium text-gray-700">
                  {mode === 'teacher' ? 'Öğretmen Modu' : 'Sınıf Modu'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ders Saati
                  </th>
                  {DAYS.map(day => (
                    <th key={day} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      <div>{day}</div>
                      <div className="text-xs mt-1 font-normal">
                        <span className={calculateDailyHours(day) > 9 ? 'text-red-600' : 'text-green-600'}>
                          {calculateDailyHours(day)}/9 saat
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Preparation Period */}
                <tr className="bg-blue-50">
                  <td className="px-4 py-3 font-medium text-gray-900 bg-blue-100">
                    <div className="text-center">
                      <div className="font-bold text-lg text-blue-800">
                        {/* FIXED: Show correct label based on level */}
                        {(selectedTeacher || selectedClass)?.level === 'Ortaokul' ? 'Hazırlık' : 'Kahvaltı'}
                      </div>
                      <div className="text-xs text-blue-600 mt-1 flex items-center justify-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {(selectedTeacher || selectedClass)?.level === 'Ortaokul' ? '08:30-08:40' : '08:30-08:50'}
                      </div>
                    </div>
                  </td>
                  {DAYS.map(day => {
                    const entity = mode === 'teacher' ? selectedTeacher : selectedClass;
                    const fixedInfo = getFixedPeriodInfo(day, 'prep', entity?.level);
                    
                    return (
                      <td key={`${day}-prep`} className="px-2 py-2">
                        <div className={`w-full min-h-[80px] p-3 rounded-lg border-2 ${fixedInfo?.color || 'bg-blue-100 border-blue-300'} cursor-not-allowed`}>
                          <div className="text-center">
                            <div className="font-medium text-lg">
                              {fixedInfo?.title || ((selectedTeacher || selectedClass)?.level === 'Ortaokul' ? 'Hazırlık' : 'Kahvaltı')}
                            </div>
                            <div className="text-xs mt-1">
                              {fixedInfo?.subtitle || '🔒 Sabit'}
                            </div>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {PERIODS.map((period, index) => {
                  const timeInfo = getTimeInfo(period);
                  const isLunchPeriod = (
                    ((selectedTeacher || selectedClass)?.level === 'İlkokul' || (selectedTeacher || selectedClass)?.level === 'Anaokulu') && period === '5'
                  ) || (
                    (selectedTeacher || selectedClass)?.level === 'Ortaokul' && period === '6'
                  );
                  
                  // Show breakfast between 1st and 2nd period for middle school
                  const showBreakfastAfter = (selectedTeacher || selectedClass)?.level === 'Ortaokul' && period === '1';
                  
                  // Show afternoon breakfast after 8th period
                  const showAfternoonBreakAfter = period === '8';
                  
                  return (
                    <React.Fragment key={period}>
                      <tr className={isLunchPeriod ? 'bg-green-50' : ''}>
                        <td className={`px-4 py-3 font-medium text-gray-900 ${isLunchPeriod ? 'bg-green-100' : 'bg-gray-50'}`}>
                          <div className="text-center">
                            <div className={`font-bold text-lg ${isLunchPeriod ? 'text-green-800' : ''}`}>
                              {isLunchPeriod ? 'Yemek' : `${period}. Ders`}
                            </div>
                            {timeInfo && (
                              <div className={`text-xs mt-1 flex items-center justify-center ${isLunchPeriod ? 'text-green-600' : 'text-blue-600'}`}>
                                <Clock className="w-3 h-3 mr-1" />
                                {timeInfo}
                              </div>
                            )}
                            {isLunchPeriod && (
                              <div className="text-xs text-green-600 mt-1">🔒 Yemek</div>
                            )}
                          </div>
                        </td>
                        {DAYS.map(day => {
                          const slotDisplay = getSlotDisplay(day, period);
                          const isFixed = isFixedPeriod(day, period);
                          
                          return (
                            <td key={`${day}-${period}`} className="px-2 py-2">
                              <button
                                onClick={() => handleSlotClick(day, period)}
                                disabled={isFixed}
                                className={`w-full min-h-[80px] p-3 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                  isFixed
                                    ? `${slotDisplay?.color || 'bg-green-100 border-green-300'} cursor-not-allowed`
                                    : slotDisplay 
                                    ? `${slotDisplay.color} hover:opacity-80` 
                                    : 'border-gray-300 bg-gray-50 border-dashed hover:border-purple-400 hover:bg-purple-50'
                                }`}
                              >
                                {slotDisplay ? (
                                  <div className="text-center">
                                    <div className="font-medium text-lg">
                                      {slotDisplay.primary}
                                    </div>
                                    {slotDisplay.secondary && (
                                      <div className="text-xs mt-1">
                                        {slotDisplay.secondary}
                                      </div>
                                    )}
                                    {isFixed && (
                                      <div className="text-xs mt-1">🔒 Sabit</div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-xs">
                                    {mode === 'teacher' ? 'Sınıf Ekle' : 'Öğretmen Ekle'}
                                  </div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>

                      {/* NEW: Breakfast between 1st and 2nd period for middle school */}
                      {showBreakfastAfter && (
                        <tr className="bg-orange-50">
                          <td className="px-4 py-3 font-medium text-gray-900 bg-orange-100">
                            <div className="text-center">
                              <div className="font-bold text-lg text-orange-800">Kahvaltı</div>
                              <div className="text-xs text-orange-600 mt-1 flex items-center justify-center">
                                <Clock className="w-3 h-3 mr-1" />
                                09:15-09:35
                              </div>
                            </div>
                          </td>
                          {DAYS.map(day => {
                            const entity = mode === 'teacher' ? selectedTeacher : selectedClass;
                            const fixedInfo = getFixedPeriodInfo(day, 'breakfast', entity?.level);
                            
                            return (
                              <td key={`${day}-breakfast`} className="px-2 py-2">
                                <div className={`w-full min-h-[80px] p-3 rounded-lg border-2 ${fixedInfo?.color || 'bg-orange-100 border-orange-300'} cursor-not-allowed`}>
                                  <div className="text-center">
                                    <div className="font-medium text-lg">
                                      {fixedInfo?.title || 'Kahvaltı'}
                                    </div>
                                    <div className="text-xs mt-1">
                                      {fixedInfo?.subtitle || '🔒 Sabit'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      )}

                      {/* İkindi Kahvaltısı 8. ders sonrasında */}
                      {showAfternoonBreakAfter && (
                        <tr className="bg-yellow-50">
                          <td className="px-4 py-3 font-medium text-gray-900 bg-yellow-100">
                            <div className="text-center">
                              <div className="font-bold text-lg text-yellow-800">İkindi Kahvaltısı</div>
                              <div className="text-xs text-yellow-600 mt-1 flex items-center justify-center">
                                <Clock className="w-3 h-3 mr-1" />
                                14:35-14:45
                              </div>
                            </div>
                          </td>
                          {DAYS.map(day => {
                            const entity = mode === 'teacher' ? selectedTeacher : selectedClass;
                            const fixedInfo = getFixedPeriodInfo(day, 'afternoon-breakfast', entity?.level);
                            
                            return (
                              <td key={`${day}-afternoon-breakfast`} className="px-2 py-2">
                                <div className={`w-full min-h-[80px] p-3 rounded-lg border-2 ${fixedInfo?.color || 'bg-yellow-100 border-yellow-300'} cursor-not-allowed`}>
                                  <div className="text-center">
                                    <div className="font-medium text-lg">
                                      {fixedInfo?.title || 'İkindi Kahvaltısı'}
                                    </div>
                                    <div className="text-xs mt-1">
                                      {fixedInfo?.subtitle || '🔒 Sabit'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedTeacher && !selectedClass && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="flex justify-center mb-4">
            {mode === 'teacher' ? (
              <Users className="w-16 h-16 text-gray-300" />
            ) : (
              <Building className="w-16 h-16 text-gray-300" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {mode === 'teacher' ? 'Öğretmen Seçin' : 'Sınıf Seçin'}
          </h3>
          <p className="text-gray-500 mb-4">
            Program oluşturmak için {mode === 'teacher' ? 'bir öğretmen' : 'bir sınıf'} seçin
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <h4 className="text-sm font-medium text-blue-800 mb-2">🔒 Otomatik Sabit Saatler:</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• <strong>Hazırlık:</strong> Ortaokul 08:30-08:40</p>
              <p>• <strong>Kahvaltı:</strong> İlkokul/Anaokul 08:30-08:50, Ortaokul 09:15-09:35</p>
              <p>• <strong>Yemek:</strong> İlkokul 5. ders (11:50-12:25), Ortaokul 6. ders (12:30-13:05)</p>
              <p>• <strong>İkindi Kahvaltısı:</strong> 8. ders sonrası (14:35-14:45)</p>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 mt-4">
            <ArrowLeftRight className="w-4 h-4" />
            <span>Üstteki butonlarla mod değiştirebilirsiniz</span>
          </div>
        </div>
      )}

      <ScheduleSlotModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSlotSave}
        subjects={getFilteredSubjects()}
        classes={mode === 'teacher' ? getFilteredClasses() : []}
        teachers={mode === 'class' ? getFilteredTeachers() : []}
        mode={mode}
        currentSubjectId={selectedSlot ? currentSchedule[selectedSlot.day]?.[selectedSlot.period]?.subjectId : ''}
        currentClassId={selectedSlot ? currentSchedule[selectedSlot.day]?.[selectedSlot.period]?.classId : ''}
        currentTeacherId={selectedSlot ? currentSchedule[selectedSlot.day]?.[selectedSlot.period]?.teacherId : ''}
        day={selectedSlot?.day || ''}
        period={selectedSlot?.period || ''}
      />

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

      {/* ERROR MODAL - KESINLIKLE GÖRÜNÜR */}
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