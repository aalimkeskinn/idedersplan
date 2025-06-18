import React, { useState, useEffect } from 'react';
import { Zap, Settings, Play, CheckCircle, AlertTriangle, Clock, BarChart3, RefreshCw } from 'lucide-react';
import { WizardData } from '../../types/wizard';
import { useToast } from '../../hooks/useToast';
import Button from '../UI/Button';
import Select from '../UI/Select';
import ErrorModal from '../UI/ErrorModal';

interface WizardStepGenerationProps {
  data: WizardData['generationSettings'];
  wizardData: WizardData;
  onUpdate: (data: WizardData['generationSettings']) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generationResult?: {
    success: boolean;
    schedules: any[];
    conflicts: string[];
    warnings: string[];
    errors: string[];
  };
}

const WizardStepGeneration: React.FC<WizardStepGenerationProps> = ({
  data,
  wizardData,
  onUpdate,
  onGenerate,
  isGenerating,
  generationResult
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);
  const { error, warning, info } = useToast();

  // Otomatik yeniden deneme mekanizması
  useEffect(() => {
    if (generationResult && !generationResult.success && generationResult.conflicts.length > 0) {
      if (retryCount < 3 && !isAutoRetrying) {
        setIsAutoRetrying(true);
        const timer = setTimeout(() => {
          console.log(`🔄 Çakışma tespit edildi, otomatik yeniden deneme #${retryCount + 1}...`);
          warning('⚠️ Çakışma Tespit Edildi', `Otomatik yeniden deneme #${retryCount + 1} başlatılıyor...`);
          setRetryCount(prev => prev + 1);
          onGenerate();
          setIsAutoRetrying(false);
        }, 1500);
        
        return () => clearTimeout(timer);
      } else if (retryCount >= 3) {
        // 3 deneme sonrası hala çakışma varsa, hata göster
        setErrorMessage(`Program oluşturma sırasında çakışmalar tespit edildi ve 3 deneme sonrası çözülemedi:\n\n${generationResult.conflicts.join('\n')}`);
        setShowErrorModal(true);
        error('❌ Program Oluşturulamadı', '3 deneme sonrası çakışmalar çözülemedi');
      }
    } else if (generationResult && generationResult.success) {
      // Başarılı olduğunda retry sayacını sıfırla
      setRetryCount(0);
      if (retryCount > 0) {
        info('✅ Program Başarıyla Oluşturuldu', `${retryCount} deneme sonrası çakışmalar çözüldü`);
      }
    }
  }, [generationResult, retryCount, isAutoRetrying, onGenerate, error, warning, info]);

  const algorithmOptions = [
    { 
      value: 'balanced', 
      label: 'Dengeli Dağılım',
      description: 'Öğretmen ve sınıf yüklerini eşit dağıtır'
    },
    { 
      value: 'compact', 
      label: 'Kompakt Program',
      description: 'Dersleri mümkün olduğunca sıkıştırır'
    },
    { 
      value: 'distributed', 
      label: 'Dağıtılmış Program',
      description: 'Dersleri hafta boyunca eşit dağıtır'
    }
  ];

  const optimizationOptions = [
    { 
      value: 'fast', 
      label: 'Hızlı (1-2 dakika)',
      description: 'Temel optimizasyon, hızlı sonuç'
    },
    { 
      value: 'balanced', 
      label: 'Dengeli (3-5 dakika)',
      description: 'İyi kalite ve makul süre'
    },
    { 
      value: 'thorough', 
      label: 'Kapsamlı (5-10 dakika)',
      description: 'En iyi kalite, uzun süre'
    }
  ];

  const handleChange = (field: keyof WizardData['generationSettings'], value: any) => {
    const updatedData = {
      ...data,
      [field]: value
    };
    onUpdate(updatedData);
  };

  const getValidationSummary = () => {
    const issues = [];
    const warnings = [];

    // Check basic requirements with safe access
    if (!wizardData.subjects?.selectedSubjects || wizardData.subjects.selectedSubjects.length === 0) {
      issues.push('Hiç ders seçilmemiş');
    }
    if (!wizardData.classes?.selectedClasses || wizardData.classes.selectedClasses.length === 0) {
      issues.push('Hiç sınıf seçilmemiş');
    }
    if (!wizardData.teachers?.selectedTeachers || wizardData.teachers.selectedTeachers.length === 0) {
      issues.push('Hiç öğretmen seçilmemiş');
    }
    if (!wizardData.classrooms?.length) {
      issues.push('Hiç derslik seçilmemiş');
    }

    // Check ratios with safe access
    const totalHours = wizardData.subjects?.subjectHours ? 
      Object.values(wizardData.subjects.subjectHours).reduce((sum, hours) => sum + hours, 0) : 0;
    const totalClasses = wizardData.classes?.selectedClasses?.length || 0;
    const totalTeachers = wizardData.teachers?.selectedTeachers?.length || 0;

    if (totalHours > 45) {
      warnings.push('Haftalık toplam ders saati çok yüksek (45+ saat)');
    }
    if (totalTeachers < totalClasses) {
      warnings.push('Öğretmen sayısı sınıf sayısından az');
    }

    return { issues, warnings };
  };

  const { issues, warnings } = getValidationSummary();
  const canGenerate = issues.length === 0;

  const getEstimatedTime = () => {
    const baseTime = {
      fast: 2,
      balanced: 4,
      thorough: 8
    }[currentData.optimizationLevel || 'balanced'];

    const subjectCount = wizardData.subjects?.selectedSubjects?.length || 0;
    const classCount = wizardData.classes?.selectedClasses?.length || 0;
    const teacherCount = wizardData.teachers?.selectedTeachers?.length || 0;
    
    const complexity = subjectCount * classCount * teacherCount;
    const multiplier = complexity > 100 ? 1.5 : complexity > 50 ? 1.2 : 1;
    
    return Math.round(baseTime * multiplier);
  };

  // CRITICAL: Initialize default values if not set
  const currentData = {
    algorithm: 'balanced',
    optimizationLevel: 'balanced',
    prioritizeTeacherPreferences: true,
    prioritizeClassPreferences: true,
    generateMultipleOptions: false,
    allowOverlaps: false,
    maxRetries: 3,
    ...data
  };

  const handleGenerateClick = () => {
    console.log('🚀 Program oluştur butonu tıklandı');
    console.log('📊 Wizard verisi:', {
      subjects: wizardData.subjects?.selectedSubjects?.length || 0,
      classes: wizardData.classes?.selectedClasses?.length || 0,
      teachers: wizardData.teachers?.selectedTeachers?.length || 0,
      classrooms: wizardData.classrooms?.length || 0,
      canGenerate,
      issues
    });
    
    if (canGenerate && onGenerate) {
      // Retry sayacını sıfırla
      setRetryCount(0);
      onGenerate();
    } else {
      console.warn('⚠️ Program oluşturulamıyor:', issues);
      setErrorMessage(`Program oluşturulamıyor:\n\n${issues.join('\n')}`);
      setShowErrorModal(true);
    }
  };

  const handleManualRetry = () => {
    if (canGenerate && onGenerate) {
      console.log('🔄 Manuel yeniden deneme başlatılıyor...');
      warning('🔄 Yeniden Deneme', 'Program oluşturma yeniden başlatılıyor...');
      setRetryCount(prev => prev + 1);
      onGenerate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Program Oluşturma ve Optimizasyon</h3>
        <p className="text-gray-600">
          Algoritma ayarlarını yapın ve otomatik program oluşturmayı başlatın
        </p>
      </div>

      {/* Validation Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Hazırlık Durumu
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {wizardData.subjects?.selectedSubjects?.length || 0}
            </div>
            <div className="text-xs text-blue-700">Ders</div>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">
              {wizardData.classes?.selectedClasses?.length || 0}
            </div>
            <div className="text-xs text-emerald-700">Sınıf</div>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">
              {wizardData.teachers?.selectedTeachers?.length || 0}
            </div>
            <div className="text-xs text-indigo-700">Öğretmen</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {wizardData.classrooms?.length || 0}
            </div>
            <div className="text-xs text-purple-700">Derslik</div>
          </div>
        </div>

        {/* Issues */}
        {issues.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-medium text-red-800 mb-1">Kritik Sorunlar:</h5>
                <ul className="text-sm text-red-700 space-y-1">
                  {issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-medium text-yellow-800 mb-1">Uyarılar:</h5>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Generation Results */}
        {generationResult && (
          <div className={`mb-4 p-3 border rounded-lg ${
            generationResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start space-x-2">
              {generationResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <h5 className={`font-medium mb-1 ${
                  generationResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {generationResult.success 
                    ? 'Program Başarıyla Oluşturuldu!' 
                    : 'Program Oluşturma Sorunları:'}
                </h5>
                
                {generationResult.success ? (
                  <div className="text-sm text-green-700">
                    <p>✅ {generationResult.schedules.length} program oluşturuldu</p>
                    {generationResult.warnings.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Uyarılar:</p>
                        <ul className="list-disc list-inside space-y-1 mt-1">
                          {generationResult.warnings.slice(0, 3).map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                          {generationResult.warnings.length > 3 && (
                            <li>...ve {generationResult.warnings.length - 3} uyarı daha</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {generationResult.conflicts.length > 0 && (
                      <div className="mt-1">
                        <p className="text-sm font-medium text-red-800">Çakışmalar:</p>
                        <ul className="text-sm text-red-700 list-disc list-inside space-y-1 mt-1">
                          {generationResult.conflicts.slice(0, 3).map((conflict, index) => (
                            <li key={index}>{conflict}</li>
                          ))}
                          {generationResult.conflicts.length > 3 && (
                            <li>...ve {generationResult.conflicts.length - 3} çakışma daha</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    {generationResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-red-800">Hatalar:</p>
                        <ul className="text-sm text-red-700 list-disc list-inside space-y-1 mt-1">
                          {generationResult.errors.slice(0, 3).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                          {generationResult.errors.length > 3 && (
                            <li>...ve {generationResult.errors.length - 3} hata daha</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    <div className="mt-3">
                      <Button
                        onClick={handleManualRetry}
                        icon={RefreshCw}
                        variant="primary"
                        size="sm"
                        disabled={isGenerating}
                      >
                        Yeniden Dene
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {canGenerate && !generationResult && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Tüm gereksinimler karşılandı! Program oluşturmaya hazır.</span>
            </div>
          </div>
        )}
      </div>

      {/* Algorithm Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2 text-purple-600" />
          Algoritma Ayarları
        </h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Program Türü
            </label>
            <div className="space-y-2">
              {algorithmOptions.map(option => (
                <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="algorithm"
                    value={option.value}
                    checked={currentData.algorithm === option.value}
                    onChange={(e) => handleChange('algorithm', e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Optimizasyon Seviyesi
            </label>
            <div className="space-y-2">
              {optimizationOptions.map(option => (
                <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="optimization"
                    value={option.value}
                    checked={currentData.optimizationLevel === option.value}
                    onChange={(e) => handleChange('optimizationLevel', e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showAdvanced ? 'Gelişmiş ayarları gizle' : 'Gelişmiş ayarları göster'}
            </button>
            
            {showAdvanced && (
              <div className="mt-4 space-y-3 p-3 bg-gray-50 rounded-lg">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={currentData.prioritizeTeacherPreferences || false}
                    onChange={(e) => handleChange('prioritizeTeacherPreferences', e.target.checked)}
                  />
                  <span className="text-sm">Öğretmen tercihlerini öncelikle</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={currentData.prioritizeClassPreferences || false}
                    onChange={(e) => handleChange('prioritizeClassPreferences', e.target.checked)}
                  />
                  <span className="text-sm">Sınıf tercihlerini öncelikle</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={currentData.generateMultipleOptions || false}
                    onChange={(e) => handleChange('generateMultipleOptions', e.target.checked)}
                  />
                  <span className="text-sm">Birden fazla seçenek oluştur</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={currentData.allowOverlaps || false}
                    onChange={(e) => handleChange('allowOverlaps', e.target.checked)}
                  />
                  <span className="text-sm">Çakışmalara izin ver (acil durumlar için)</span>
                </label>

                {/* Yeni: Maksimum yeniden deneme sayısı */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maksimum Yeniden Deneme Sayısı
                  </label>
                  <select
                    value={currentData.maxRetries || 3}
                    onChange={(e) => handleChange('maxRetries', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">1 deneme</option>
                    <option value="3">3 deneme</option>
                    <option value="5">5 deneme</option>
                    <option value="10">10 deneme</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Çakışma durumunda kaç kez yeniden deneneceğini belirler
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generation */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="text-center">
          <h4 className="font-semibold text-gray-900 mb-2">Program Oluşturmaya Hazır!</h4>
          <p className="text-sm text-gray-600 mb-4">
            Tahmini süre: <span className="font-medium text-purple-600">{getEstimatedTime()} dakika</span>
            {retryCount > 0 && (
              <span className="ml-2 text-yellow-600">
                (Deneme #{retryCount})
              </span>
            )}
          </p>
          
          {isGenerating ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <span className="text-purple-600 font-medium">
                  {isAutoRetrying 
                    ? `Çakışma tespit edildi, yeniden deneniyor (${retryCount}/3)...` 
                    : 'Program oluşturuluyor...'}
                </span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{ width: '45%' }}></div>
              </div>
              <p className="text-xs text-gray-600">
                Bu işlem birkaç dakika sürebilir. Lütfen sayfayı kapatmayın.
              </p>
            </div>
          ) : (
            <Button
              onClick={handleGenerateClick}
              icon={Play}
              variant="primary"
              size="lg"
              disabled={!canGenerate || isGenerating}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              🎯 Program Oluşturmayı Başlat
            </Button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <h4 className="font-medium mb-1">🤖 Otomatik Program Oluşturma:</h4>
            <ul className="space-y-1 text-xs">
              <li>• Sistem tüm kısıtlamaları ve tercihleri dikkate alır</li>
              <li>• Çakışmaları otomatik olarak tespit eder ve çözer</li>
              <li>• En optimal ders dağılımını hesaplar</li>
              <li>• Birden fazla alternatif program oluşturabilir</li>
              <li>• Sonuçları PDF olarak indirebilirsiniz</li>
              <li>• Haftalık ders saati 45'e kadar desteklenir</li>
              <li>• <strong>Çakışma durumunda otomatik olarak yeniden denenir</strong></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Program Oluşturma Hatası"
        message={errorMessage}
      />
    </div>
  );
};

export default WizardStepGeneration;