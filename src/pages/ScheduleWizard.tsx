import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Zap, ChevronRight, Save, ArrowLeft, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { WizardData, WizardStepId, WIZARD_STEPS, getStepIndex, isStepComplete, validateStep } from '../types/wizard';
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
import ErrorModal from '../components/UI/ErrorModal';
import { generateSystematicSchedule } from '../utils/scheduleGeneration';

const ScheduleWizard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: classes } = useFirestore<Class>('classes');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { data: schedules, add: addSchedule } = useFirestore('schedules');
  const { data: templates, add: addTemplate, update: updateTemplate } = useFirestore('schedule-templates');
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
      academicYear: '',
      semester: 'fall',
      startDate: undefined,
      endDate: undefined
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
    classrooms: [],
    teachers: {
      selectedTeachers: [],
      teacherWorkloads: {},
      teacherSubjects: {}
    },
    constraints: {
      timeConstraints: []
    },
    generationSettings: {
      algorithm: 'balanced',
      optimizationLevel: 'balanced',
      maxGenerationTime: 10,
      allowPartialSolution: false,
      prioritizeTeacherPreferences: true,
      prioritizeClassPreferences: true,
      generateMultipleOptions: false,
      allowOverlaps: false,
      maxRetries: 3
    }
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check for template ID in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const templateId = params.get('templateId');
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setWizardData(template.wizardData);
        setEditingTemplateId(templateId);
        info('✅ Şablon Yüklendi', `"${template.name}" şablonu düzenleme için yüklendi`);
      }
    }
  }, [location.search, templates, info]);

  // Mark changes as unsaved when wizardData changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [wizardData]);

  const handleStepUpdate = (stepId: WizardStepId, data: any) => {
    setWizardData(prev => ({
      ...prev,
      [stepId]: data
    }));
  };

  const handleNextStep = () => {
    const currentIndex = getStepIndex(currentStep);
    const nextStep = WIZARD_STEPS[currentIndex + 1]?.id;
    
    if (nextStep) {
      // Validate current step
      const validationErrors = validateStep(currentStep, wizardData);
      if (validationErrors.length > 0) {
        setErrorMessage(`Lütfen aşağıdaki sorunları düzeltin:\n\n${validationErrors.join('\n')}`);
        setShowErrorModal(true);
        return;
      }
      
      setCurrentStep(nextStep);
    }
  };

  const handlePrevStep = () => {
    const currentIndex = getStepIndex(currentStep);
    const prevStep = WIZARD_STEPS[currentIndex - 1]?.id;
    
    if (prevStep) {
      setCurrentStep(prevStep);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const templateData = {
        name: wizardData.basicInfo.programName || 'Adsız Program',
        description: '',
        academicYear: wizardData.basicInfo.academicYear || '',
        semester: wizardData.basicInfo.semester || 'fall',
        wizardData,
        status: 'draft' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        isPublic: false
      };

      if (editingTemplateId) {
        await updateTemplate(editingTemplateId, {
          ...templateData,
          updatedAt: new Date()
        });
        success('✅ Şablon Güncellendi', `"${templateData.name}" şablonu başarıyla güncellendi`);
      } else {
        await addTemplate(templateData);
        success('✅ Şablon Kaydedildi', `"${templateData.name}" şablonu başarıyla kaydedildi`);
      }
      
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Şablon kaydetme hatası:', err);
      error('❌ Kayıt Hatası', 'Şablon kaydedilirken bir hata oluştu');
    }
  };

  const handleGenerateSchedule = async () => {
    setIsGenerating(true);
    setGenerationResult(null);
    
    try {
      console.log('🚀 Program oluşturma başlatılıyor...');
      
      // IMPROVED: Gelişmiş program oluşturma algoritması
      const result = await generateSystematicSchedule(
        wizardData,
        teachers,
        classes,
        subjects
      );
      
      console.log('📊 Program oluşturma sonucu:', result);
      
      setGenerationResult({
        success: result.success,
        schedules: result.schedules,
        conflicts: result.context.conflicts,
        warnings: result.warnings,
        errors: result.errors
      });
      
      if (result.success) {
        // Programları kaydet
        for (const schedule of result.schedules) {
          await addSchedule(schedule);
        }
        
        success('✅ Program Oluşturuldu', `${result.schedules.length} program başarıyla oluşturuldu`);
        
        // Şablonu da kaydet
        await handleSaveTemplate();
        
        // Başarılı olduğunda ana sayfaya yönlendir
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        if (result.context.conflicts.length > 0) {
          warning('⚠️ Çakışmalar Tespit Edildi', 'Program oluşturulurken çakışmalar tespit edildi');
        } else if (result.errors.length > 0) {
          error('❌ Program Oluşturma Hatası', result.errors[0]);
        } else {
          error('❌ Program Oluşturma Hatası', 'Bilinmeyen bir hata oluştu');
        }
      }
    } catch (err) {
      console.error('Program oluşturma hatası:', err);
      error('❌ Program Oluşturma Hatası', 'Program oluşturulurken bir hata oluştu');
      
      setGenerationResult({
        success: false,
        schedules: [],
        conflicts: [],
        warnings: [],
        errors: [err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu']
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <WizardStepBasicInfo
            data={wizardData.basicInfo}
            onUpdate={(data) => handleStepUpdate('basicInfo', data)}
          />
        );
      case 'subjects':
        return (
          <WizardStepSubjects
            data={wizardData.subjects}
            onUpdate={(data) => handleStepUpdate('subjects', data)}
          />
        );
      case 'classes':
        return (
          <WizardStepClasses
            data={wizardData}
            onUpdate={(data) => handleStepUpdate('classes', data.classes)}
            classes={classes}
          />
        );
      case 'classrooms':
        return (
          <WizardStepClassrooms
            data={wizardData}
            onUpdate={(data) => setWizardData(prev => ({ ...prev, ...data }))}
          />
        );
      case 'teachers':
        return (
          <WizardStepTeachers
            selectedTeachers={wizardData.teachers?.selectedTeachers || []}
            onSelectedTeachersChange={(selectedTeachers) => 
              handleStepUpdate('teachers', { 
                ...wizardData.teachers, 
                selectedTeachers 
              })
            }
          />
        );
      case 'constraints':
        return (
          <WizardStepConstraints
            data={wizardData}
            onUpdate={(data) => setWizardData(prev => ({ ...prev, ...data }))}
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
            onUpdate={(data) => handleStepUpdate('generationSettings', data)}
            onGenerate={handleGenerateSchedule}
            isGenerating={isGenerating}
            generationResult={generationResult}
          />
        );
      default:
        return null;
    }
  };

  const handleNavigateAway = (to: string) => {
    if (hasUnsavedChanges) {
      confirmUnsavedChanges(() => {
        navigate(to);
      });
    } else {
      navigate(to);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Program Sihirbazı</h1>
            <p className="text-gray-600">Adım adım otomatik program oluşturun</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {hasUnsavedChanges && (
            <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Kaydedilmedi
            </span>
          )}
          <Button
            onClick={handleSaveTemplate}
            icon={Save}
            variant="secondary"
          >
            {editingTemplateId ? 'Güncelle' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {/* Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => {
            const stepIndex = getStepIndex(step.id);
            const currentIndex = getStepIndex(currentStep);
            const isActive = step.id === currentStep;
            const isCompleted = stepIndex < currentIndex || isStepComplete(step.id, wizardData);
            
            return (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`flex flex-col items-center cursor-pointer ${
                    index > 0 ? 'ml-4' : ''
                  }`}
                  onClick={() => setCurrentStep(step.id)}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${isActive 
                      ? 'bg-purple-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-100 text-green-600 border-2 border-green-600' 
                        : 'bg-gray-100 text-gray-400'
                    }
                  `}>
                    {isCompleted && !isActive ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className={`
                    text-xs mt-2 font-medium
                    ${isActive 
                      ? 'text-purple-600' 
                      : isCompleted 
                        ? 'text-green-600' 
                        : 'text-gray-400'
                    }
                  `}>
                    {step.title}
                  </span>
                </div>
                
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`
                    flex-1 h-0.5 mx-2
                    ${stepIndex < currentIndex ? 'bg-green-500' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          onClick={handlePrevStep}
          icon={ArrowLeft}
          variant="secondary"
          disabled={currentStep === 'basic'}
        >
          Önceki Adım
        </Button>
        
        {currentStep !== 'generation' ? (
          <Button
            onClick={handleNextStep}
            icon={ArrowRight}
            variant="primary"
            disabled={!isStepComplete(currentStep, wizardData)}
          >
            Sonraki Adım
          </Button>
        ) : (
          <Button
            onClick={() => handleNavigateAway('/')}
            icon={ChevronRight}
            variant="primary"
            disabled={isGenerating}
          >
            Ana Sayfaya Dön
          </Button>
        )}
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

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Hata"
        message={errorMessage}
      />
    </div>
  );
};

export default ScheduleWizard;