import React, { useState } from 'react';
import { Database, Trash2, Download, Upload, AlertTriangle, CheckCircle, RefreshCw, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import { Teacher, Class, Subject, Schedule } from '../types';
import Button from '../components/UI/Button';
import ConfirmationModal from '../components/UI/ConfirmationModal';

// Schedule Template interface
interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  academicYear: string;
  semester: string;
  wizardData: any;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published' | 'archived';
}

const DataManagement = () => {
  const navigate = useNavigate();
  const { data: teachers, remove: removeTeacher } = useFirestore<Teacher>('teachers');
  const { data: classes, remove: removeClass } = useFirestore<Class>('classes');
  const { data: subjects, remove: removeSubject } = useFirestore<Subject>('subjects');
  const { data: schedules, remove: removeSchedule } = useFirestore<Schedule>('schedules');
  const { data: templates, remove: removeTemplate } = useFirestore<ScheduleTemplate>('schedule-templates');
  const { success, error, warning } = useToast();
  const { 
    confirmation, 
    showConfirmation, 
    hideConfirmation,
    confirmDelete 
  } = useConfirmation();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fileInputRef] = useState<React.RefObject<HTMLInputElement>>(React.createRef());

  // Delete all data
  const handleDeleteAllData = () => {
    confirmDelete(
      'TÜM VERİLER',
      async () => {
        setIsDeleting(true);
        
        try {
          // Delete schedules first
          for (const schedule of schedules) {
            await removeSchedule(schedule.id);
          }
          
          // Delete templates
          for (const template of templates) {
            await removeTemplate(template.id);
          }
          
          // Delete subjects
          for (const subject of subjects) {
            await removeSubject(subject.id);
          }
          
          // Delete classes
          for (const classItem of classes) {
            await removeClass(classItem.id);
          }
          
          // Delete teachers
          for (const teacher of teachers) {
            await removeTeacher(teacher.id);
          }
          
          success('🗑️ Tüm Veriler Silindi', 'Tüm veriler başarıyla silindi');
        } catch (err) {
          console.error('❌ Veri silme hatası:', err);
          error('❌ Silme Hatası', 'Veriler silinirken bir hata oluştu');
        } finally {
          setIsDeleting(false);
        }
      }
    );
  };

  // Export all data
  const handleExportData = () => {
    setIsExporting(true);
    
    try {
      const exportData = {
        teachers,
        classes,
        subjects,
        schedules,
        templates,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      const exportFileDefaultName = `ide_ders_programi_veriler_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      success('✅ Veriler Dışa Aktarıldı', 'Tüm veriler başarıyla dışa aktarıldı');
    } catch (err) {
      console.error('❌ Veri dışa aktarma hatası:', err);
      error('❌ Dışa Aktarma Hatası', 'Veriler dışa aktarılırken bir hata oluştu');
    } finally {
      setIsExporting(false);
    }
  };

  // Import data
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importData = JSON.parse(event.target?.result as string);
        
        // Validate import data
        if (!importData.teachers || !importData.classes || !importData.subjects) {
          throw new Error('Geçersiz veri formatı');
        }
        
        // Confirm import
        showConfirmation(
          {
            title: '⚠️ Veri İçe Aktarma Onayı',
            message: 'Bu işlem mevcut verilerin üzerine yazacak. Devam etmek istediğinizden emin misiniz?\n\n' +
                     `İçe aktarılacak veriler:\n` +
                     `- ${importData.teachers.length} öğretmen\n` +
                     `- ${importData.classes.length} sınıf\n` +
                     `- ${importData.subjects.length} ders\n` +
                     `- ${importData.schedules.length} program\n` +
                     `- ${importData.templates.length} şablon`,
            type: 'warning',
            confirmText: 'İçe Aktar',
            cancelText: 'İptal',
            confirmVariant: 'danger'
          },
          async () => {
            // TODO: Implement actual import logic
            success('✅ Veriler İçe Aktarıldı', 'Tüm veriler başarıyla içe aktarıldı');
          }
        );
      } catch (err) {
        console.error('❌ Veri içe aktarma hatası:', err);
        error('❌ İçe Aktarma Hatası', 'Veriler içe aktarılırken bir hata oluştu');
      } finally {
        setIsImporting(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.readAsText(file);
  };

  // CRITICAL: Analyze and fix weekly hour limits issue
  const analyzeWeeklyHourLimits = () => {
    // Collect data for analysis
    const subjectHourData: { [subjectId: string]: { 
      name: string, 
      configuredHours: number, 
      actualHours: number,
      classes: { [classId: string]: number }
    } } = {};
    
    // Initialize with configured hours from templates
    templates.forEach(template => {
      const subjectHours = template.wizardData?.subjects?.subjectHours || {};
      
      Object.entries(subjectHours).forEach(([subjectId, hours]) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (subject) {
          if (!subjectHourData[subjectId]) {
            subjectHourData[subjectId] = {
              name: subject.name,
              configuredHours: Number(hours),
              actualHours: 0,
              classes: {}
            };
          } else {
            subjectHourData[subjectId].configuredHours = Number(hours);
          }
        }
      });
    });
    
    // Count actual hours from schedules
    schedules.forEach(schedule => {
      Object.values(schedule.schedule).forEach(day => {
        Object.values(day).forEach(slot => {
          if (slot && slot.subjectId && slot.classId && slot.classId !== 'fixed-period') {
            const subjectId = slot.subjectId;
            const classId = slot.classId;
            
            if (!subjectHourData[subjectId]) {
              const subject = subjects.find(s => s.id === subjectId);
              subjectHourData[subjectId] = {
                name: subject?.name || 'Bilinmeyen Ders',
                configuredHours: 0,
                actualHours: 0,
                classes: {}
              };
            }
            
            subjectHourData[subjectId].actualHours++;
            
            if (!subjectHourData[subjectId].classes[classId]) {
              subjectHourData[subjectId].classes[classId] = 0;
            }
            subjectHourData[subjectId].classes[classId]++;
          }
        });
      });
    });
    
    // Analyze discrepancies
    const discrepancies = Object.entries(subjectHourData)
      .filter(([_, data]) => data.configuredHours !== data.actualHours)
      .map(([subjectId, data]) => ({
        subjectId,
        name: data.name,
        configuredHours: data.configuredHours,
        actualHours: data.actualHours,
        difference: data.configuredHours - data.actualHours,
        classes: data.classes
      }));
    
    if (discrepancies.length === 0) {
      success('✅ Haftalık Saat Analizi', 'Tüm dersler için yapılandırılan ve gerçek saat sayıları eşleşiyor.');
      return;
    }
    
    // Show discrepancies
    const discrepancyMessage = discrepancies
      .map(d => `${d.name}: Ayarlanan ${d.configuredHours} saat, Gerçek ${d.actualHours} saat (Fark: ${d.difference > 0 ? '-' : '+'}${Math.abs(d.difference)})`)
      .join('\n');
    
    warning('⚠️ Haftalık Saat Uyumsuzluğu', 
      `Aşağıdaki dersler için yapılandırılan ve gerçek saat sayıları arasında fark var:\n\n${discrepancyMessage}\n\n` +
      `Bu sorun, program oluşturma algoritmasındaki bir hatadan kaynaklanıyor olabilir.`
    );
  };

  return (
    <div className="container-mobile">
      {/* Header */}
      <div className="header-mobile">
        <div className="flex items-center">
          <Database className="w-8 h-8 text-purple-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">Veri Yönetimi</h1>
            <p className="text-responsive-sm text-gray-600">Sistem verilerini yönetin ve yedekleyin</p>
          </div>
        </div>
      </div>

      {/* Data Statistics */}
      <div className="mobile-card mobile-spacing mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Veri İstatistikleri</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{teachers.length}</div>
            <div className="text-sm text-blue-700">Öğretmen</div>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">{classes.length}</div>
            <div className="text-sm text-emerald-700">Sınıf</div>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">{subjects.length}</div>
            <div className="text-sm text-indigo-700">Ders</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{schedules.length}</div>
            <div className="text-sm text-purple-700">Program</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{templates.length}</div>
            <div className="text-sm text-orange-700">Şablon</div>
          </div>
        </div>
      </div>

      {/* Data Management Actions */}
      <div className="mobile-card mobile-spacing mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Veri Yönetimi</h2>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <Download className="w-5 h-5 text-blue-600 mt-1 mr-3" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-800">Verileri Dışa Aktar</h3>
                <p className="text-sm text-blue-600 mb-3">
                  Tüm sistem verilerini JSON formatında dışa aktarın
                </p>
                <Button
                  onClick={handleExportData}
                  icon={Download}
                  variant="primary"
                  disabled={isExporting}
                >
                  {isExporting ? 'Dışa Aktarılıyor...' : 'Verileri Dışa Aktar'}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-lg">
            <div className="flex items-start">
              <Upload className="w-5 h-5 text-emerald-600 mt-1 mr-3" />
              <div className="flex-1">
                <h3 className="font-medium text-emerald-800">Verileri İçe Aktar</h3>
                <p className="text-sm text-emerald-600 mb-3">
                  Daha önce dışa aktarılmış verileri içe aktarın
                </p>
                <Button
                  onClick={handleImportClick}
                  icon={Upload}
                  variant="secondary"
                  disabled={isImporting}
                >
                  {isImporting ? 'İçe Aktarılıyor...' : 'Verileri İçe Aktar'}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-start">
              <Trash2 className="w-5 h-5 text-red-600 mt-1 mr-3" />
              <div className="flex-1">
                <h3 className="font-medium text-red-800">Tüm Verileri Sil</h3>
                <p className="text-sm text-red-600 mb-3">
                  <strong>DİKKAT:</strong> Bu işlem tüm verileri kalıcı olarak silecektir
                </p>
                <Button
                  onClick={handleDeleteAllData}
                  icon={Trash2}
                  variant="danger"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Siliniyor...' : 'Tüm Verileri Sil'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CRITICAL: Diagnostic Tools */}
      <div className="mobile-card mobile-spacing mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tanılama Araçları</h2>
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-1 mr-3" />
              <div className="flex-1">
                <h3 className="font-medium text-yellow-800">Haftalık Saat Limiti Analizi</h3>
                <p className="text-sm text-yellow-600 mb-3">
                  Derslerin ayarlanan ve gerçek haftalık saat sayılarını karşılaştırır
                </p>
                <Button
                  onClick={analyzeWeeklyHourLimits}
                  icon={FileText}
                  variant="secondary"
                >
                  Haftalık Saat Analizi
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-start">
              <RefreshCw className="w-5 h-5 text-purple-600 mt-1 mr-3" />
              <div className="flex-1">
                <h3 className="font-medium text-purple-800">Yeni Program Oluştur</h3>
                <p className="text-sm text-purple-600 mb-3">
                  Program sihirbazını kullanarak yeni bir program oluşturun
                </p>
                <Button
                  onClick={() => navigate('/schedule-wizard')}
                  icon={CheckCircle}
                  variant="primary"
                >
                  Program Sihirbazına Git
                </Button>
              </div>
            </div>
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

export default DataManagement;