import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, ChevronRight, ChevronLeft, Save, Check, AlertTriangle, Info } from 'lucide-react';
import { WizardData, WIZARD_STEPS, WizardStepId, getStepIndex, isStepComplete, validateStep } from '../types/wizard';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import { Teacher, Class, Subject } from '../types';
import Button from '../components/UI/Button';
import WizardStepBasicInfo from '../components/Wizard/WizardStepBasicInfo';
import WizardStepSubjects from '../components/Wizard/WizardStepSubjects';
import WizardStepClasses from '../components/Wizard/WizardStepClasses';
import WizardStepClassrooms from '../components/Wizard/WizardStepClassrooms';
import WizardStepTeachers from '../components/Wizard/WizardStepTeachers';
import WizardStepConstraints from '../components/Wizard/WizardStepConstraints';
import WizardStepGeneration from '../components/Wizard/WizardStepGeneration';
import ConfirmationModal from '../components/UI/ConfirmationModal';
import { createSubjectTeacherMappings } from '../utils/subjectTeacherMapping';
import { createWeeklyHourTrackers } from '../utils/weeklyHourManager';

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
  const { data: templates, add: addTemplate, update: updateTemplate } = useFirestore<ScheduleTemplate>('schedule-templates');
  const { success, error, warning, info } = useToast();
  const { 
    confirmation, 
    showConfirmation, 
    hideConfirmation,
    confirmUnsavedChanges 
  } = useConfirmation();

  const [currentStep, setCurrentStep] = useState<WizardStepId>('basic');
  const [wizardData, setWizardData] = useState<WizardData>({
    basicInfo: {
      programName: '',
      academicYear: '2024/2025',
      semester: 'fall'
    },
    subjects: {
      selectedSubjects: [],
      subjectHours: {},
      subjectPriorities: {}
    },
    classes: {
      selectedClasses: [],
      classCapacities: {}
    },
    classrooms: {
      selectedClassrooms: [],
      classroomAssignments: {}
    },
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
      maxGenerationTime: 5,
      allowPartialSolution: true,
      prioritizeTeacherPreferences: true,
      prioritizeClassPreferences: true,
      generateMultipleOptions: false,
      allowOverlaps: false
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Check for templateId in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const templateId = urlParams.get('templateId');
    
    if (templateId && templates.length > 0) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setWizardData(template.wizardData);
        setEditingTemplateId(templateId);
        info('🔄 Şablon Yüklendi', `"${template.name}" şablonu düzenleme için yüklendi`);
      }
    }
  }, [location.search, templates]);

  // Update hasUnsavedChanges when wizardData changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [wizardData]);

  const handleStepChange = (newStep: WizardStepId) => {
    // Validate current step
    const errors = validateStep(currentStep, wizardData);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      error('❌ Doğrulama Hatası', `Lütfen aşağıdaki sorunları düzeltin:\n${errors.join('\n')}`);
      return;
    }
    
    setValidationErrors([]);
    setCurrentStep(newStep);
  };

  const handleNext = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex < WIZARD_STEPS.length - 1) {
      const nextStep = WIZARD_STEPS[currentIndex + 1].id;
      handleStepChange(nextStep);
    }
  };

  const handlePrevious = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex > 0) {
      const prevStep = WIZARD_STEPS[currentIndex - 1].id;
      handleStepChange(prevStep);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      // CRITICAL: Use programName or name for the template name
      const templateName = wizardData.basicInfo.programName || wizardData.basicInfo.name || 'Ders Programı';
      
      const templateData = {
        name: templateName,
        description: '',
        academicYear: wizardData.basicInfo.academicYear || '2024/2025',
        semester: wizardData.basicInfo.semester === 'fall' ? 'Güz' : 
                 wizardData.basicInfo.semester === 'spring' ? 'Bahar' : 'Yaz',
        wizardData,
        status: 'draft' as const,
        updatedAt: new Date()
      };

      if (editingTemplateId) {
        await updateTemplate(editingTemplateId, templateData);
        success('✅ Şablon Güncellendi', `"${templateData.name}" şablonu başarıyla güncellendi`);
      } else {
        await addTemplate(templateData as any);
        success('✅ Şablon Kaydedildi', `"${templateData.name}" şablonu başarıyla kaydedildi`);
      }

      setHasUnsavedChanges(false);
    } catch (err) {
      error('❌ Kayıt Hatası', 'Şablon kaydedilirken bir hata oluştu');
    }
  };

  const handleGenerate = async () => {
    // Validate generation step
    const errors = validateStep('generation', wizardData);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      error('❌ Doğrulama Hatası', `Lütfen aşağıdaki sorunları düzeltin:\n${errors.join('\n')}`);
      return;
    }

    setIsGenerating(true);
    setValidationErrors([]);

    try {
      console.log('🚀 Program oluşturma başlatılıyor...');
      
      // CRITICAL: Ders-öğretmen eşleştirmelerini oluştur
      const mappings = createSubjectTeacherMappings(wizardData, teachers, classes, subjects);
      console.log(`📊 ${mappings.length} ders-öğretmen eşleştirmesi oluşturuldu`);
      console.log(`✅ Geçerli eşleştirmeler: ${mappings.filter(m => m.isValid).length}`);
      
      // CRITICAL: Haftalık saat takipçilerini oluştur
      const hourTrackers = createWeeklyHourTrackers(wizardData, classes, subjects);
      console.log(`📊 ${hourTrackers.length} haftalık saat takipçisi oluşturuldu`);
      
      // Önce şablonu kaydet
      await handleSaveTemplate();
      
      // Sonra program oluşturma sayfasına yönlendir
      success('🎯 Hazırlık Tamamlandı', 'Program oluşturma için gerekli veriler hazırlandı');
      
      // Programı oluşturmak için schedules sayfasına yönlendir
      setTimeout(() => {
        navigate('/schedules?mode=auto&templateId=' + (editingTemplateId || 'new'));
      }, 1500);
      
    } catch (err) {
      console.error('❌ Program oluşturma hatası:', err);
      error('❌ Program Oluşturma Hatası', 'Program oluşturulurken bir hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateBasicInfo = (data: any) => {
    setWizardData(prev => ({
      ...prev,
      basicInfo: data
    }));
  };

  const handleUpdateSubjects = (data: any) => {
    setWizardData(prev => ({
      ...prev,
      subjects: data
    }));
  };

  const handleUpdateClasses = (data: any) => {
    setWizardData(prev => ({
      ...prev,
      classes: data
    }));
  };

  const handleUpdateClassrooms = (data: any) => {
    setWizardData(prev => ({
      ...prev,
      classrooms: data
    }));
  };

  const handleUpdateTeachers = (selectedTeachers: string[]) => {
    setWizardData(prev => ({
      ...prev,
      teachers: {
        ...prev.teachers,
        selectedTeachers
      }
    }));
  };

  const handleUpdateConstraints = (data: any) => {
    setWizardData(prev => ({
      ...prev,
      constraints: data
    }));
  };

  const handleUpdateGenerationSettings = (data: any) => {
    setWizardData(prev => ({
      ...prev,
      generationSettings: data
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <WizardStepBasicInfo
            data={wizardData.basicInfo}
            onUpdate={handleUpdateBasicInfo}
          />
        );
      case 'subjects':
        return (
          <WizardStepSubjects
            data={wizardData.subjects}
            onUpdate={handleUpdateSubjects}
          />
        );
      case 'classes':
        return (
          <WizardStepClasses
            data={wizardData}
            onUpdate={handleUpdateClasses}
            classes={classes}
          />
        );
      case 'classrooms':
        return (
          <WizardStepClassrooms
            data={wizardData}
            onUpdate={handleUpdateClassrooms}
          />
        );
      case 'teachers':
        return (
          <WizardStepTeachers
            selectedTeachers={wizardData.teachers?.selectedTeachers || []}
            onSelectedTeachersChange={handleUpdateTeachers}
          />
        );
      case 'constraints':
        return (
          <WizardStepConstraints
            data={wizardData}
            onUpdate={handleUpdateConstraints}
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
            onUpdate={handleUpdateGenerationSettings}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        );
      default:
        return null;
    }
  };

  const currentStepIndex = getStepIndex(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  return (
    <div className="container-mobile">
      {/* Header */}
      <div className="header-mobile">
        <div className="flex items-center">
          <Zap className="w-8 h-8 text-purple-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">Program Oluşturma Sihirbazı</h1>
            <p className="text-responsive-sm text-gray-600">Adım adım otomatik program oluşturun</p>
          </div>
        </div>
        <div className="button-group-mobile">
          <Button
            onClick={handleSaveTemplate}
            icon={Save}
            variant="secondary"
            disabled={isGenerating}
            className="w-full sm:w-auto"
          >
            {editingTemplateId ? 'Şablonu Güncelle' : 'Şablon Olarak Kaydet'}
          </Button>
        </div>
      </div>

      {/* Steps */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max">
          {WIZARD_STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            const isComplete = isStepComplete(step.id, wizardData);
            const isFuture = index > currentStepIndex;
            
            return (
              <div 
                key={step.id}
                className={`flex-1 min-w-[120px] ${index !== 0 ? 'ml-2' : ''}`}
              >
                <button
                  onClick={() => handleStepChange(step.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-purple-100 border-2 border-purple-300 text-purple-800'
                      : isComplete
                      ? 'bg-green-50 border border-green-200 text-green-800 hover:bg-green-100'
                      : isFuture
                      ? 'bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                  disabled={isFuture && !isComplete}
                >
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                      isActive
                        ? 'bg-purple-600 text-white'
                        : isComplete
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-white'
                    }`}>
                      {isComplete && !isActive ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{step.title}</div>
                      <div className="text-xs hidden sm:block">{step.description}</div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Doğrulama Hataları</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          onClick={handlePrevious}
          icon={ChevronLeft}
          variant="secondary"
          disabled={isFirstStep || isGenerating}
        >
          Önceki Adım
        </Button>
        
        {isLastStep ? (
          <Button
            onClick={handleGenerate}
            icon={Zap}
            variant="primary"
            disabled={isGenerating}
          >
            {isGenerating ? 'Program Oluşturuluyor...' : 'Program Oluştur'}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            icon={ChevronRight}
            variant="primary"
            disabled={isGenerating}
          >
            Sonraki Adım
          </Button>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div className="text-sm text-blue-700">
            <h4 className="font-medium mb-1">Sihirbaz Hakkında</h4>
            <p>
              Bu sihirbaz, ders programınızı otomatik olarak oluşturmanıza yardımcı olur.
              Tüm adımları tamamladıktan sonra "Program Oluştur" butonuna tıklayarak
              programınızı oluşturabilirsiniz.
            </p>
            <p className="mt-2">
              <strong>Mevcut Adım:</strong> {WIZARD_STEPS[currentStepIndex].title} - {WIZARD_STEPS[currentStepIndex].description}
            </p>
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default ScheduleWizard;