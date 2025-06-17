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
import { useNavigate } from 'react-router-dom';
import { WizardData, ScheduleTemplate, WizardStepId, WIZARD_STEPS } from '../types/wizard';
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

const ScheduleWizard = () => {
  const navigate = useNavigate();
  const { add: addTemplate, update: updateTemplate } = useFirestore<ScheduleTemplate>('schedule-templates');
  const { success, error, warning } = useToast();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>({
    basicInfo: {
      name: '',
      academicYear: '2024/2025',
      semester: 'Güz',
      startDate: '',
      endDate: '',
      description: ''
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
    classrooms: {
      selectedClassrooms: [],
      classroomCapacities: {},
      classroomTypes: {},
      classroomEquipment: {}
    },
    teachers: {
      selectedTeachers: [],
      teacherSubjects: {},
      teacherMaxHours: {},
      teacherPreferences: {}
    },
    constraints: {
      timeConstraints: [],
      globalRules: {
        maxDailyHours: 8,
        maxConsecutiveHours: 3,
        lunchBreakRequired: true,
        weekendScheduling: false
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

  const currentStep = WIZARD_STEPS[currentStepIndex];

  // Validate current step
  const validateCurrentStep = (): boolean => {
    switch (currentStep.id) {
      case 'basic-info':
        return !!(wizardData.basicInfo.name && 
                 wizardData.basicInfo.academicYear && 
                 wizardData.basicInfo.semester);
      
      case 'subjects':
        return wizardData.subjects.selectedSubjects.length > 0;
      
      case 'classes':
        return wizardData.classes.selectedClasses.length > 0;
      
      case 'classrooms':
        return wizardData.classrooms.selectedClassrooms.length > 0;
      
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
    // Allow going to previous completed steps or next step if current is valid
    if (stepIndex <= currentStepIndex || 
        (stepIndex === currentStepIndex + 1 && validateCurrentStep())) {
      setCurrentStepIndex(stepIndex);
    }
  };

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
      const template: Omit<ScheduleTemplate, 'id' | 'createdAt'> = {
        name: wizardData.basicInfo.name,
        description: wizardData.basicInfo.description || '',
        academicYear: wizardData.basicInfo.academicYear,
        semester: wizardData.basicInfo.semester,
        updatedAt: new Date(),
        wizardData,
        generatedSchedules: [],
        status: 'draft'
      };

      await addTemplate(template);
      success('✅ Şablon Kaydedildi', 'Program şablonu başarıyla kaydedildi');
    } catch (err) {
      error('❌ Kayıt Hatası', 'Şablon kaydedilirken bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!validateCurrentStep()) {
      warning('⚠️ Eksik Bilgi', 'Lütfen tüm adımları tamamlayın');
      return;
    }

    setIsGenerating(true);
    try {
      // TODO: Implement schedule generation algorithm
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate generation
      
      success('🎯 Program Oluşturuldu', 'Ders programı başarıyla oluşturuldu');
      navigate('/all-schedules');
    } catch (err) {
      error('❌ Oluşturma Hatası', 'Program oluşturulurken bir hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateWizardData = (stepData: Partial<WizardData>) => {
    setWizardData(prev => ({
      ...prev,
      ...stepData
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

  const getStepColor = (stepIndex: number) => {
    if (completedSteps.has(stepIndex)) {
      return 'bg-green-500 text-white border-green-500';
    } else if (stepIndex === currentStepIndex) {
      return 'bg-blue-500 text-white border-blue-500';
    } else if (stepIndex < currentStepIndex) {
      return 'bg-gray-300 text-gray-600 border-gray-300';
    } else {
      return 'bg-white text-gray-400 border-gray-300';
    }
  };

  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'basic-info':
        return (
          <WizardStepBasicInfo
            data={wizardData.basicInfo}
            onUpdate={(data) => updateWizardData({ basicInfo: data })}
          />
        );
      
      case 'subjects':
        return (
          <WizardStepSubjects
            data={wizardData.subjects}
            onUpdate={(data) => updateWizardData({ subjects: data })}
          />
        );
      
      case 'classes':
        return (
          <WizardStepClasses
            data={wizardData.classes}
            onUpdate={(data) => updateWizardData({ classes: data })}
          />
        );
      
      case 'classrooms':
        return (
          <WizardStepClassrooms
            data={wizardData.classrooms}
            onUpdate={(data) => updateWizardData({ classrooms: data })}
          />
        );
      
      case 'teachers':
        return (
          <WizardStepTeachers
            data={wizardData.teachers}
            subjects={wizardData.subjects}
            onUpdate={(data) => updateWizardData({ teachers: data })}
          />
        );
      
      case 'constraints':
        return (
          <WizardStepConstraints
            data={wizardData.constraints}
            teachers={wizardData.teachers}
            classes={wizardData.classes}
            onUpdate={(data) => updateWizardData({ constraints: data })}
          />
        );
      
      case 'generation':
        return (
          <WizardStepGeneration
            data={wizardData.generationSettings}
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Program Oluşturma Sihirbazı</h1>
                <p className="text-sm text-gray-600">Adım {currentStepIndex + 1} / {WIZARD_STEPS.length}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleSaveTemplate}
                icon={Save}
                variant="secondary"
                disabled={isSaving || !wizardData.basicInfo.name}
              >
                {isSaving ? 'Kaydediliyor...' : 'Şablon Kaydet'}
              </Button>
              <Button
                onClick={() => navigate('/schedules')}
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