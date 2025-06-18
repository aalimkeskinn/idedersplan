import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useErrorModal } from '../hooks/useErrorModal';
import { Teacher, Class, Subject, Schedule } from '../types';
import { WizardData, WIZARD_STEPS, getStepIndex, isStepComplete, validateStep } from '../types/wizard';
import { generateSystematicSchedule } from '../utils/scheduleGeneration';
import Button from '../components/UI/Button';
import ErrorModal from '../components/UI/ErrorModal';

// Import wizard step components
import WizardStepBasicInfo from '../components/Wizard/WizardStepBasicInfo';
import WizardStepSubjects from '../components/Wizard/WizardStepSubjects';
import WizardStepClasses from '../components/Wizard/WizardStepClasses';
import WizardStepClassrooms from '../components/Wizard/WizardStepClassrooms';
import WizardStepTeachers from '../components/Wizard/WizardStepTeachers';
import WizardStepConstraints from '../components/Wizard/WizardStepConstraints';
import WizardStepGeneration from '../components/Wizard/WizardStepGeneration';

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

const ScheduleWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: classes } = useFirestore<Class>('classes');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { data: schedules, add: addSchedule } = useFirestore<Schedule>('schedules');
  const { data: templates, add: addTemplate, update: updateTemplate } = useFirestore<ScheduleTemplate>('schedule-templates');
  const { success, error, warning, info } = useToast();
  const { errorModal, showError, hideError } = useErrorModal();

  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  
  // CRITICAL: Initialize with proper default values
  const [wizardData, setWizardData] = useState<WizardData>({
    basicInfo: {
      programName: '',
      academicYear: '2024/2025',
      semester: 'fall',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-08-31')
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
      teacherWorkloads: {},
      teacherSubjects: {}
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
      optimizationLevel: 'balanced',
      maxGenerationTime: 10,
      allowPartialSolution: true,
      prioritizeTeacherPreferences: true,
      prioritizeClassPreferences: true,
      generateMultipleOptions: false,
      allowOverlaps: false
    }
  });

  // Check for template editing from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const templateId = urlParams.get('templateId');
    
    if (templateId && templates.length > 0) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        console.log('📝 Template yükleniyor:', template.name);
        setEditingTemplateId(templateId);
        setWizardData(template.wizardData);
        info('📝 Template Yüklendi', `${template.name} template'i düzenleme için yüklendi`);
      }
    }
  }, [location.search, templates]);

  const updateWizardData = (stepData: Partial<WizardData>) => {
    console.log('🔄 Wizard data güncelleniyor:', stepData);
    setWizardData(prev => ({
      ...prev,
      ...stepData
    }));
  };

  const canProceedToNext = () => {
    const currentStepId = WIZARD_STEPS[currentStep].id;
    return isStepComplete(currentStepId, wizardData);
  };

  const handleNext = () => {
    const currentStepId = WIZARD_STEPS[currentStep].id;
    const errors = validateStep(currentStepId, wizardData);
    
    if (errors.length > 0) {
      showError('⚠️ Eksik Bilgiler', errors.join('\n'));
      return;
    }

    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow going back to any previous step
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  // CRITICAL: Enhanced schedule generation with proper hour tracking
  const handleGenerateSchedule = async () => {
    console.log('🚀 Program oluşturma başlatıldı...');
    
    // Final validation
    const allErrors: string[] = [];
    WIZARD_STEPS.forEach(step => {
      const stepErrors = validateStep(step.id, wizardData);
      allErrors.push(...stepErrors);
    });

    if (allErrors.length > 0) {
      showError('❌ Program Oluşturulamıyor', `Aşağıdaki sorunları düzeltin:\n\n${allErrors.join('\n')}`);
      return;
    }

    // CRITICAL: Validate weekly hours before generation
    const totalSelectedHours = Object.values(wizardData.subjects?.subjectHours || {})
      .reduce((sum, hours) => sum + hours, 0);
    
    console.log('📊 Haftalık saat kontrolü:', {
      selectedSubjects: wizardData.subjects?.selectedSubjects?.length || 0,
      totalHours: totalSelectedHours,
      subjectHours: wizardData.subjects?.subjectHours
    });

    if (totalSelectedHours === 0) {
      showError('❌ Haftalık Saat Hatası', 'Hiçbir ders için haftalık saat ayarlanmamış. Lütfen dersler sekmesinde haftalık saatleri ayarlayın.');
      return;
    }

    if (totalSelectedHours < 20) {
      warning('⚠️ Düşük Saat Sayısı', `Toplam ${totalSelectedHours} saat seçildi. Tam bir program için en az 25-30 saat önerilir.`);
    }

    setIsGenerating(true);

    try {
      console.log('🔧 Sistematik program oluşturma başlatılıyor...', {
        wizardData: {
          subjects: wizardData.subjects,
          classes: wizardData.classes,
          teachers: wizardData.teachers,
          constraints: wizardData.constraints,
          generationSettings: wizardData.generationSettings
        }
      });

      // CRITICAL: Use the new systematic schedule generation
      const result = await generateSystematicSchedule(
        wizardData,
        teachers,
        classes,
        subjects
      );

      console.log('📊 Program oluşturma sonucu:', result);

      if (!result.success || result.schedules.length === 0) {
        const errorMessage = result.errors.length > 0 
          ? result.errors.join('\n')
          : 'Program oluş̧turulamadı. Lütfen seçimlerinizi kontrol edin.';
        
        showError('❌ Program Oluşturma Başarısız', errorMessage);
        setIsGenerating(false);
        return;
      }

      // Save schedules to Firestore
      console.log('💾 Programlar kaydediliyor...', {
        scheduleCount: result.schedules.length
      });

      for (const schedule of result.schedules) {
        await addSchedule(schedule);
      }

      // Save template
      const templateData: Omit<ScheduleTemplate, 'id' | 'createdAt'> = {
        name: wizardData.basicInfo?.programName || 'Ders Programı',
        description: 'Sihirbaz ile oluşturuldu',
        academicYear: wizardData.basicInfo?.academicYear || '2024/2025',
        semester: wizardData.basicInfo?.semester || 'fall',
        wizardData,
        updatedAt: new Date(),
        status: 'published'
      };

      if (editingTemplateId) {
        await updateTemplate(editingTemplateId, templateData);
        success('✅ Template Güncellendi', `${templateData.name} başarıyla güncellendi`);
      } else {
        await addTemplate(templateData as any);
        success('✅ Template Kaydedildi', `${templateData.name} başarıyla kaydedildi`);
      }

      // Show success message
      success(
        '✅ Program Oluşturuldu!', 
        `${result.schedules.length} sınıf için program başarıyla oluşturuldu.\n` +
        `Dolu slotlar: ${result.statistics.filledSlots}/${result.statistics.totalSlots} (${((result.statistics.filledSlots / result.statistics.totalSlots) * 100).toFixed(1)}%)`
      );

      // Navigate to schedules page
      navigate('/all-schedules');

    } catch (err) {
      console.error('❌ Program oluşturma hatası:', err);
      error('❌ Program Oluşturma Hatası', 'Beklenmeyen bir hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStepContent = () => {
    const currentStepId = WIZARD_STEPS[currentStep].id;
    
    switch (currentStepId) {
      case 'basic':
        return (
          <WizardStepBasicInfo
            data={wizardData.basicInfo || {}}
            onUpdate={(data) => updateWizardData({ basicInfo: data })}
          />
        );
      case 'subjects':
        return (
          <WizardStepSubjects
            data={wizardData.subjects || { selectedSubjects: [], subjectHours: {}, subjectPriorities: {} }}
            onUpdate={(data) => updateWizardData({ subjects: data })}
          />
        );
      case 'classes':
        return (
          <WizardStepClasses
            data={wizardData}
            onUpdate={(data) => updateWizardData(data)}
            classes={classes}
          />
        );
      case 'classrooms':
        return (
          <WizardStepClassrooms
            data={wizardData}
            onUpdate={(data) => updateWizardData(data)}
          />
        );
      case 'teachers':
        return (
          <WizardStepTeachers
            selectedTeachers={wizardData.teachers?.selectedTeachers || []}
            onSelectedTeachersChange={(teacherIds) => 
              updateWizardData({ 
                teachers: { 
                  ...wizardData.teachers, 
                  selectedTeachers: teacherIds 
                } 
              })
            }
          />
        );
      case 'constraints':
        return (
          <WizardStepConstraints
            data={wizardData}
            onUpdate={(data) => updateWizardData(data)}
            teachers={teachers}
            classes={classes}
            subjects={subjects}
          />
        );
      case 'generation':
        return (
          <WizardStepGeneration
            data={wizardData.generationSettings || {}}
            wizardData={wizardData}
            onUpdate={(data) => updateWizardData({ generationSettings: data })}
            onGenerate={handleGenerateSchedule}
            isGenerating={isGenerating}
          />
        );
      default:
        return <div>Bilinmeyen adım</div>;
    }
  };

  return (
    <div className="container-mobile">
      {/* Header */}
      <div className="header-mobile">
        <div className="flex items-center">
          <Zap className="w-8 h-8 text-purple-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">Program Oluşturma Sihirbazı</h1>
            <p className="text-responsive-sm text-gray-600">
              {editingTemplateId ? 'Mevcut programı düzenliyorsunuz' : 'Adım adım yeni program oluşturun'}
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max">
          {WIZARD_STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isClickable = index <= currentStep;
            
            return (
              <div 
                key={step.id}
                className={`flex-1 min-w-[120px] ${index !== 0 ? 'ml-2' : ''}`}
              >
                <button
                  onClick={() => isClickable && handleStepClick(index)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-purple-100 border-2 border-purple-300 text-purple-800'
                      : isCompleted
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-gray-50 border border-gray-200 text-gray-500'
                  } ${isClickable ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-70'}`}
                >
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                      isActive
                        ? 'bg-purple-500 text-white'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-white'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{step.title}</div>
                      <div className="text-xs">{step.description}</div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          onClick={handlePrevious}
          icon={ArrowLeft}
          variant="secondary"
          disabled={currentStep === 0}
        >
          Geri
        </Button>
        
        {currentStep < WIZARD_STEPS.length - 1 ? (
          <Button
            onClick={handleNext}
            icon={ArrowRight}
            variant="primary"
            disabled={!canProceedToNext()}
          >
            İleri
          </Button>
        ) : (
          <Button
            onClick={handleGenerateSchedule}
            icon={Zap}
            variant="primary"
            disabled={isGenerating}
          >
            {isGenerating ? 'Program Oluşturuluyor...' : 'Program Oluştur'}
          </Button>
        )}
      </div>

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

export default ScheduleWizard;