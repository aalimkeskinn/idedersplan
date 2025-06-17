import React, { useState, useRef, useEffect } from 'react';
import { 
  Database, 
  Users, 
  Building, 
  BookOpen, 
  Calendar, 
  Trash2, 
  Plus, 
  Edit,
  AlertTriangle,
  BarChart3,
  Settings,
  Download,
  Upload,
  MapPin,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Info,
  ArrowRight,
  Layers,
  Shield,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import { useErrorModal } from '../hooks/useErrorModal';
import { Teacher, Class, Subject, Schedule, EDUCATION_LEVELS } from '../types';
import Button from '../components/UI/Button';
import ConfirmationModal from '../components/UI/ConfirmationModal';
import ErrorModal from '../components/UI/ErrorModal';
import Modal from '../components/UI/Modal';
import Select from '../components/UI/Select';
import DOMPurify from 'dompurify';

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

// Classroom interface
interface Classroom {
  id: string;
  name: string;
  type: string;
  capacity: number;
  floor: string;
  building: string;
  equipment: string[];
  shortName?: string;
  color?: string;
}

// Excel import interface
interface ExcelTeacherData {
  firstName: string;
  lastName: string;
  branch: string;
  level?: string;
}

const DataManagement = () => {
  const navigate = useNavigate();
  const { data: teachers, add: addTeacher, update: updateTeacher, remove: removeTeacher } = useFirestore<Teacher>('teachers');
  const { data: classes, remove: removeClass } = useFirestore<Class>('classes');
  const { data: subjects, add: addSubject, remove: removeSubject } = useFirestore<Subject>('subjects');
  const { data: schedules, remove: removeSchedule } = useFirestore<Schedule>('schedules');
  const { data: templates, remove: removeTemplate } = useFirestore<ScheduleTemplate>('schedule-templates');
  const { data: classrooms, remove: removeClassroom } = useFirestore<Classroom>('classrooms');
  const { success, error, warning, info } = useToast();
  const { 
    confirmation, 
    showConfirmation, 
    hideConfirmation,
    confirmDelete 
  } = useConfirmation();
  const { errorModal, showError, hideError } = useErrorModal();

  const [isDeletingTeachers, setIsDeletingTeachers] = useState(false);
  const [isDeletingClasses, setIsDeletingClasses] = useState(false);
  const [isDeletingSubjects, setIsDeletingSubjects] = useState(false);
  const [isDeletingSchedules, setIsDeletingSchedules] = useState(false);
  const [isDeletingTemplates, setIsDeletingTemplates] = useState(false);
  const [isDeletingClassrooms, setIsDeletingClassrooms] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  
  // Excel import states
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelTeacherData[]>([]);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [importLevel, setImportLevel] = useState('İlkokul');
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    added: number;
    skipped: number;
    failed: number;
    total: number;
  }>({
    added: 0,
    skipped: 0,
    failed: 0,
    total: 0
  });
  const [showImportResults, setShowImportResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete all teachers
  const handleDeleteAllTeachers = () => {
    if (teachers.length === 0) {
      warning('⚠️ Silinecek Öğretmen Yok', 'Sistemde silinecek öğretmen bulunamadı');
      return;
    }

    confirmDelete(
      `${teachers.length} Öğretmen`,
      async () => {
        setIsDeletingTeachers(true);
        
        try {
          let deletedCount = 0;
          
          for (const teacher of teachers) {
            try {
              await removeTeacher(teacher.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Öğretmen silinemedi: ${teacher.name}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Öğretmenler Silindi', `${deletedCount} öğretmen başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir öğretmen silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Öğretmenler silinirken bir hata oluştu');
        } finally {
          setIsDeletingTeachers(false);
        }
      }
    );
  };

  // Delete all classes
  const handleDeleteAllClasses = () => {
    if (classes.length === 0) {
      warning('⚠️ Silinecek Sınıf Yok', 'Sistemde silinecek sınıf bulunamadı');
      return;
    }

    confirmDelete(
      `${classes.length} Sınıf`,
      async () => {
        setIsDeletingClasses(true);
        
        try {
          let deletedCount = 0;
          
          for (const classItem of classes) {
            try {
              await removeClass(classItem.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Sınıf silinemedi: ${classItem.name}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Sınıflar Silindi', `${deletedCount} sınıf başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir sınıf silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Sınıflar silinirken bir hata oluştu');
        } finally {
          setIsDeletingClasses(false);
        }
      }
    );
  };

  // Delete all subjects
  const handleDeleteAllSubjects = () => {
    if (subjects.length === 0) {
      warning('⚠️ Silinecek Ders Yok', 'Sistemde silinecek ders bulunamadı');
      return;
    }

    confirmDelete(
      `${subjects.length} Ders`,
      async () => {
        setIsDeletingSubjects(true);
        
        try {
          let deletedCount = 0;
          
          for (const subject of subjects) {
            try {
              await removeSubject(subject.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Ders silinemedi: ${subject.name}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Dersler Silindi', `${deletedCount} ders başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir ders silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Dersler silinirken bir hata oluştu');
        } finally {
          setIsDeletingSubjects(false);
        }
      }
    );
  };

  // Delete all schedules
  const handleDeleteAllSchedules = () => {
    if (schedules.length === 0) {
      warning('⚠️ Silinecek Program Yok', 'Sistemde silinecek program bulunamadı');
      return;
    }

    confirmDelete(
      `${schedules.length} Program`,
      async () => {
        setIsDeletingSchedules(true);
        
        try {
          let deletedCount = 0;
          
          for (const schedule of schedules) {
            try {
              await removeSchedule(schedule.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Program silinemedi: ${schedule.id}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Programlar Silindi', `${deletedCount} program başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir program silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Programlar silinirken bir hata oluştu');
        } finally {
          setIsDeletingSchedules(false);
        }
      }
    );
  };

  // Delete all templates
  const handleDeleteAllTemplates = () => {
    if (templates.length === 0) {
      warning('⚠️ Silinecek Şablon Yok', 'Sistemde silinecek şablon bulunamadı');
      return;
    }

    confirmDelete(
      `${templates.length} Program Şablonu`,
      async () => {
        setIsDeletingTemplates(true);
        
        try {
          let deletedCount = 0;
          
          for (const template of templates) {
            try {
              await removeTemplate(template.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Şablon silinemedi: ${template.name}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Şablonlar Silindi', `${deletedCount} şablon başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir şablon silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Şablonlar silinirken bir hata oluştu');
        } finally {
          setIsDeletingTemplates(false);
        }
      }
    );
  };

  // Delete all classrooms
  const handleDeleteAllClassrooms = () => {
    if (classrooms.length === 0) {
      warning('⚠️ Silinecek Derslik Yok', 'Sistemde silinecek derslik bulunamadı');
      return;
    }

    confirmDelete(
      `${classrooms.length} Derslik`,
      async () => {
        setIsDeletingClassrooms(true);
        
        try {
          let deletedCount = 0;
          
          for (const classroom of classrooms) {
            try {
              await removeClassroom(classroom.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Derslik silinemedi: ${classroom.name}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Derslikler Silindi', `${deletedCount} derslik başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir derslik silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Derslikler silinirken bir hata oluştu');
        } finally {
          setIsDeletingClassrooms(false);
        }
      }
    );
  };

  // Delete all data
  const handleDeleteAllData = () => {
    const totalItems = teachers.length + classes.length + subjects.length + schedules.length + templates.length + classrooms.length;
    
    if (totalItems === 0) {
      warning('⚠️ Silinecek Veri Yok', 'Sistemde silinecek veri bulunamadı');
      return;
    }

    confirmDelete(
      `Tüm Veriler (${totalItems} öğe)`,
      async () => {
        setIsDeletingAll(true);
        
        try {
          let deletedCount = 0;
          
          // Delete schedules first
          for (const schedule of schedules) {
            try {
              await removeSchedule(schedule.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Program silinemedi: ${schedule.id}`, err);
            }
          }

          // Delete templates
          for (const template of templates) {
            try {
              await removeTemplate(template.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Şablon silinemedi: ${template.name}`, err);
            }
          }

          // Delete teachers
          for (const teacher of teachers) {
            try {
              await removeTeacher(teacher.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Öğretmen silinemedi: ${teacher.name}`, err);
            }
          }

          // Delete classes
          for (const classItem of classes) {
            try {
              await removeClass(classItem.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Sınıf silinemedi: ${classItem.name}`, err);
            }
          }

          // Delete subjects
          for (const subject of subjects) {
            try {
              await removeSubject(subject.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Ders silinemedi: ${subject.name}`, err);
            }
          }

          // Delete classrooms
          for (const classroom of classrooms) {
            try {
              await removeClassroom(classroom.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Derslik silinemedi: ${classroom.name}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Tüm Veriler Silindi', `${deletedCount} öğe başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir veri silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Veriler silinirken bir hata oluştu');
        } finally {
          setIsDeletingAll(false);
        }
      }
    );
  };

  // Edit template
  const handleEditTemplate = (templateId: string) => {
    navigate(`/schedule-wizard?templateId=${templateId}`);
  };

  // Delete template
  const handleDeleteTemplate = (template: ScheduleTemplate) => {
    confirmDelete(
      template.name,
      async () => {
        try {
          await removeTemplate(template.id);
          success('🗑️ Şablon Silindi', `${template.name} başarıyla silindi`);
        } catch (err) {
          error('❌ Silme Hatası', 'Şablon silinirken bir hata oluştu');
        }
      }
    );
  };

  // Excel file handling
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExcelFile(file);
      parseExcelFile(file);
    }
  };

  const parseExcelFile = async (file: File) => {
    try {
      setIsProcessingExcel(true);
      
      // Read file as text
      const text = await file.text();
      
      // Parse CSV (assuming tab-separated values from Excel)
      const rows = text.split('\n');
      const headers = rows[0].split('\t');
      
      // Find column indices
      const firstNameIndex = headers.findIndex(h => h.trim().toLowerCase() === 'adi');
      const lastNameIndex = headers.findIndex(h => h.trim().toLowerCase() === 'soyadi');
      const branchIndex = headers.findIndex(h => h.trim().toLowerCase() === 'görevi');
      
      if (firstNameIndex === -1 || lastNameIndex === -1 || branchIndex === -1) {
        throw new Error('Gerekli sütunlar bulunamadı. Excel dosyasında "ADI", "SOYADI" ve "GÖREVİ" sütunları olmalıdır.');
      }
      
      // Parse data rows
      const parsedData: ExcelTeacherData[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].split('\t');
        if (cells.length >= Math.max(firstNameIndex, lastNameIndex, branchIndex) + 1) {
          const firstName = cells[firstNameIndex]?.trim() || '';
          const lastName = cells[lastNameIndex]?.trim() || '';
          const branch = cells[branchIndex]?.trim() || '';
          
          if (firstName && lastName && branch) {
            parsedData.push({
              firstName,
              lastName,
              branch
            });
          }
        }
      }
      
      setExcelData(parsedData);
      
      if (parsedData.length === 0) {
        throw new Error('Geçerli veri bulunamadı. Lütfen dosya formatını kontrol edin.');
      }
      
      info('Excel Dosyası Yüklendi', `${parsedData.length} öğretmen verisi bulundu. İçe aktarmak için seviye seçin ve "İçe Aktar" butonuna tıklayın.`);
      
    } catch (err: any) {
      error('❌ Excel Okuma Hatası', err.message || 'Excel dosyası okunurken bir hata oluştu');
      setExcelData([]);
      setExcelFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsProcessingExcel(false);
    }
  };

  const handleImportExcel = async () => {
    if (!excelFile || excelData.length === 0) {
      warning('⚠️ Dosya Seçilmedi', 'Lütfen önce bir Excel dosyası seçin');
      return;
    }
    
    setIsProcessingExcel(true);
    setImportProgress(0);
    
    const results = {
      added: 0,
      skipped: 0,
      failed: 0,
      total: excelData.length
    };
    
    try {
      // Process each teacher
      for (let i = 0; i < excelData.length; i++) {
        const teacherData = excelData[i];
        const fullName = `${teacherData.firstName} ${teacherData.lastName}`.trim();
        const branch = teacherData.branch;
        
        // Check if teacher already exists
        const existingTeacher = teachers.find(t => 
          t.name.toLowerCase() === fullName.toLowerCase() && 
          t.branch.toLowerCase() === branch.toLowerCase()
        );
        
        if (existingTeacher) {
          console.log(`⚠️ Öğretmen zaten mevcut: ${fullName}`);
          results.skipped++;
        } else {
          try {
            // Add teacher
            await addTeacher({
              name: fullName,
              branch: branch,
              level: importLevel as 'Anaokulu' | 'İlkokul' | 'Ortaokul'
            } as Omit<Teacher, 'id' | 'createdAt'>);
            
            // Check if subject exists for this branch
            const existingSubject = subjects.find(s => 
              s.branch.toLowerCase() === branch.toLowerCase() && 
              s.level === importLevel
            );
            
            // If subject doesn't exist, create it
            if (!existingSubject) {
              await addSubject({
                name: branch,
                branch: branch,
                level: importLevel as 'Anaokulu' | 'İlkokul' | 'Ortaokul',
                weeklyHours: 4 // Default weekly hours
              } as Omit<Subject, 'id' | 'createdAt'>);
            }
            
            results.added++;
          } catch (err) {
            console.error(`❌ Öğretmen eklenemedi: ${fullName}`, err);
            results.failed++;
          }
        }
        
        // Update progress
        setImportProgress(Math.round(((i + 1) / excelData.length) * 100));
      }
      
      setImportResults(results);
      setShowImportResults(true);
      
      if (results.added > 0) {
        success('✅ İçe Aktarma Tamamlandı', `${results.added} öğretmen başarıyla eklendi, ${results.skipped} öğretmen atlandı, ${results.failed} öğretmen eklenemedi`);
      } else if (results.skipped > 0) {
        warning('⚠️ İçe Aktarma Tamamlandı', `Tüm öğretmenler zaten mevcut. ${results.skipped} öğretmen atlandı`);
      } else {
        error('❌ İçe Aktarma Hatası', 'Hiçbir öğretmen eklenemedi');
      }
      
    } catch (err) {
      console.error('❌ İçe aktarma hatası:', err);
      error('❌ İçe Aktarma Hatası', 'Veriler içe aktarılırken bir hata oluştu');
    } finally {
      setIsProcessingExcel(false);
    }
  };

  const resetExcelImport = () => {
    setExcelFile(null);
    setExcelData([]);
    setImportProgress(0);
    setShowImportResults(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const totalDataCount = teachers.length + classes.length + subjects.length + schedules.length + templates.length + classrooms.length;
  const sortedTemplates = [...templates].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <div className="bg-white p-2 rounded-lg shadow-md">
                <Database className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-bold text-white">Veri Yönetimi</h1>
                <p className="text-sm text-blue-100">Sistem verilerini yönetin ve temizleyin</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => navigate('/')}
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                Ana Sayfaya Dön
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Layers className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-gray-900">Sistem Genel Bakış</h2>
                <p className="text-sm text-gray-600">Tüm veri varlıklarınızın durumu</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-purple-50 px-4 py-2 rounded-lg">
              <span className="font-semibold">{totalDataCount}</span> veri öğesi
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="ml-3 font-semibold text-blue-800">Öğretmenler</h3>
                </div>
                <span className="text-2xl font-bold text-blue-600">{teachers.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/teachers')}
                  variant="secondary"
                  size="sm"
                  className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Yönet
                </Button>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setIsExcelModalOpen(true)}
                    icon={FileSpreadsheet}
                    variant="secondary"
                    size="sm"
                    className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    Excel İçe Aktar
                  </Button>
                  {teachers.length > 0 && (
                    <Button
                      onClick={handleDeleteAllTeachers}
                      icon={Trash2}
                      variant="danger"
                      size="sm"
                      disabled={isDeletingTeachers}
                    >
                      {isDeletingTeachers ? 'Siliniyor...' : 'Tümünü Sil'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-emerald-500 rounded-lg">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="ml-3 font-semibold text-emerald-800">Sınıflar</h3>
                </div>
                <span className="text-2xl font-bold text-emerald-600">{classes.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/classes')}
                  variant="secondary"
                  size="sm"
                  className="bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                >
                  Yönet
                </Button>
                {classes.length > 0 && (
                  <Button
                    onClick={handleDeleteAllClasses}
                    icon={Trash2}
                    variant="danger"
                    size="sm"
                    disabled={isDeletingClasses}
                  >
                    {isDeletingClasses ? 'Siliniyor...' : 'Tümünü Sil'}
                  </Button>
                )}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-5 border border-indigo-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-500 rounded-lg">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="ml-3 font-semibold text-indigo-800">Dersler</h3>
                </div>
                <span className="text-2xl font-bold text-indigo-600">{subjects.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/subjects')}
                  variant="secondary"
                  size="sm"
                  className="bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  Yönet
                </Button>
                {subjects.length > 0 && (
                  <Button
                    onClick={handleDeleteAllSubjects}
                    icon={Trash2}
                    variant="danger"
                    size="sm"
                    disabled={isDeletingSubjects}
                  >
                    {isDeletingSubjects ? 'Siliniyor...' : 'Tümünü Sil'}
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="ml-3 font-semibold text-purple-800">Programlar</h3>
                </div>
                <span className="text-2xl font-bold text-purple-600">{schedules.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/all-schedules')}
                  variant="secondary"
                  size="sm"
                  className="bg-white text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  Yönet
                </Button>
                {schedules.length > 0 && (
                  <Button
                    onClick={handleDeleteAllSchedules}
                    icon={Trash2}
                    variant="danger"
                    size="sm"
                    disabled={isDeletingSchedules}
                  >
                    {isDeletingSchedules ? 'Siliniyor...' : 'Tümünü Sil'}
                  </Button>
                )}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="ml-3 font-semibold text-orange-800">Şablonlar</h3>
                </div>
                <span className="text-2xl font-bold text-orange-600">{templates.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/schedule-wizard')}
                  variant="secondary"
                  size="sm"
                  className="bg-white text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  Yeni Oluştur
                </Button>
                {templates.length > 0 && (
                  <Button
                    onClick={handleDeleteAllTemplates}
                    icon={Trash2}
                    variant="danger"
                    size="sm"
                    disabled={isDeletingTemplates}
                  >
                    {isDeletingTemplates ? 'Siliniyor...' : 'Tümünü Sil'}
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-5 border border-teal-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-teal-500 rounded-lg">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="ml-3 font-semibold text-teal-800">Derslikler</h3>
                </div>
                <span className="text-2xl font-bold text-teal-600">{classrooms.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/classrooms')}
                  variant="secondary"
                  size="sm"
                  className="bg-white text-teal-600 border-teal-200 hover:bg-teal-50"
                >
                  Yönet
                </Button>
                {classrooms.length > 0 && (
                  <Button
                    onClick={handleDeleteAllClassrooms}
                    icon={Trash2}
                    variant="danger"
                    size="sm"
                    disabled={isDeletingClassrooms}
                  >
                    {isDeletingClassrooms ? 'Siliniyor...' : 'Tümünü Sil'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Program Templates Section */}
        {templates.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-bold text-gray-900">Program Şablonları</h2>
                  <p className="text-sm text-gray-600">Oluşturduğunuz program şablonları</p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/schedule-wizard')}
                icon={Plus}
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                Yeni Program
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="group bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {template.academicYear} {template.semester} Dönemi
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEditTemplate(template.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                        title="Düzenle"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {template.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      template.status === 'published' ? 'bg-green-100 text-green-800' :
                      template.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {template.status === 'published' ? 'Yayınlandı' :
                       template.status === 'draft' ? 'Taslak' : 'Arşivlendi'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(template.updatedAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>Son güncelleme: {new Date(template.updatedAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <Button
                        onClick={() => handleEditTemplate(template.id)}
                        variant="secondary"
                        size="sm"
                        className="bg-white text-orange-600 border-orange-200 hover:bg-orange-50"
                      >
                        Düzenle
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classrooms Section */}
        {classrooms.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-3 bg-teal-100 rounded-lg">
                  <MapPin className="w-6 h-6 text-teal-600" />
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-bold text-gray-900">Derslikler</h2>
                  <p className="text-sm text-gray-600">Okul derslikleri ve özellikleri</p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/classrooms')}
                icon={Plus}
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
              >
                Yeni Derslik
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classrooms.slice(0, 6).map((classroom) => (
                <div
                  key={classroom.id}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{classroom.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        classroom.type === 'normal' ? 'bg-blue-100 text-blue-800' :
                        classroom.type === 'laboratory' ? 'bg-purple-100 text-purple-800' :
                        classroom.type === 'workshop' ? 'bg-orange-100 text-orange-800' :
                        classroom.type === 'gym' ? 'bg-green-100 text-green-800' :
                        classroom.type === 'library' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {classroom.type === 'normal' ? 'Normal Sınıf' :
                         classroom.type === 'laboratory' ? 'Laboratuvar' :
                         classroom.type === 'workshop' ? 'Atölye' :
                         classroom.type === 'gym' ? 'Spor Salonu' :
                         classroom.type === 'library' ? 'Kütüphane' :
                         classroom.type === 'computer' ? 'Bilgisayar Sınıfı' :
                         classroom.type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => navigate('/classrooms')}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                        title="Düzenle"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => confirmDelete(
                          classroom.name,
                          async () => {
                            try {
                              await removeClassroom(classroom.id);
                              success('🗑️ Derslik Silindi', `${classroom.name} başarıyla silindi`);
                            } catch (err) {
                              error('❌ Silme Hatası', 'Derslik silinirken bir hata oluştu');
                            }
                          }
                        )}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Kapasite:</span>
                      <span className="font-medium">{classroom.capacity} kişi</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Konum:</span>
                      <span className="font-medium">{classroom.building} - {classroom.floor}. Kat</span>
                    </div>
                    {classroom.equipment && classroom.equipment.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500">Ekipmanlar:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {classroom.equipment.map((eq) => (
                            <span key={eq} className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              {eq}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* View All Button */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <Button
                      onClick={() => navigate('/classrooms')}
                      variant="secondary"
                      size="sm"
                      className="w-full bg-white text-teal-600 border-teal-200 hover:bg-teal-50"
                    >
                      <div className="flex items-center justify-center">
                        <span>Tüm Derslikleri Görüntüle</span>
                        <ArrowRight className="ml-2 w-3 h-3" />
                      </div>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {classrooms.length > 6 && (
              <div className="mt-4 text-center">
                <Button
                  onClick={() => navigate('/classrooms')}
                  variant="secondary"
                  className="bg-white text-teal-600 border-teal-200 hover:bg-teal-50"
                >
                  <div className="flex items-center">
                    <span>Tüm Derslikleri Görüntüle</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </div>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Bulk Data Management */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-gray-900">Toplu Veri Yönetimi</h2>
                <p className="text-sm text-gray-600">Veri yedekleme ve geri yükleme işlemleri</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <h3 className="ml-3 font-semibold text-blue-900">Veri Yedekleme</h3>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                Tüm sistem verilerinizi yedekleyin ve dışa aktarın. Bu işlem tüm öğretmen, sınıf, ders ve program verilerinizi içerir.
              </p>
              <Button
                variant="primary"
                icon={Download}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                disabled
              >
                Tüm Verileri Yedekle (Yakında)
              </Button>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <h3 className="ml-3 font-semibold text-green-900">Veri Geri Yükleme</h3>
              </div>
              <p className="text-sm text-green-700 mb-4">
                Önceden yedeklediğiniz verileri sisteme geri yükleyin. Bu işlem mevcut verilerinizin üzerine yazacaktır.
              </p>
              <Button
                variant="primary"
                icon={Upload}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                disabled
              >
                Verileri Geri Yükle (Yakında)
              </Button>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-gray-900">Sistem Sağlığı</h2>
                <p className="text-sm text-gray-600">Sistem durumu ve bakım işlemleri</p>
              </div>
            </div>
            <Button
              variant="secondary"
              icon={RefreshCw}
              className="bg-white text-green-600 border-green-200 hover:bg-green-50"
              size="sm"
            >
              Yenile
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-green-500 rounded-full">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">Veri Bütünlüğü</span>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Sağlıklı
                </span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-green-500 rounded-full">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">Firebase Bağlantısı</span>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Bağlı
                </span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-green-500 rounded-full">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">Sistem Performansı</span>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  İyi
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Sistem Bilgisi</h3>
                <p className="text-xs text-blue-700 mt-1">
                  Sistem sağlıklı çalışıyor. Tüm veriler düzenli olarak Firebase'e kaydediliyor ve senkronize ediliyor.
                  Herhangi bir bakım işlemi gerekmiyor.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-md border border-red-200 p-6">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-bold text-red-900">Tehlikeli Bölge</h2>
              <p className="text-sm text-red-700">Bu bölümdeki işlemler geri alınamaz</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-5 bg-white rounded-xl border border-red-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-red-900">Tüm Verileri Sil</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Bu işlem tüm öğretmen, sınıf, ders, program ve şablon verilerinizi kalıcı olarak silecektir. Bu işlem geri alınamaz!
                  </p>
                </div>
                <Button
                  onClick={handleDeleteAllData}
                  icon={Trash2}
                  variant="danger"
                  disabled={isDeletingAll || totalDataCount === 0}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                >
                  {isDeletingAll ? 'Siliniyor...' : `Tüm Verileri Sil (${totalDataCount})`}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Button
                onClick={handleDeleteAllTeachers}
                icon={Trash2}
                variant="danger"
                disabled={isDeletingTeachers || teachers.length === 0}
                className="w-full"
              >
                {isDeletingTeachers ? 'Siliniyor...' : `Öğretmenler (${teachers.length})`}
              </Button>
              
              <Button
                onClick={handleDeleteAllClasses}
                icon={Trash2}
                variant="danger"
                disabled={isDeletingClasses || classes.length === 0}
                className="w-full"
              >
                {isDeletingClasses ? 'Siliniyor...' : `Sınıflar (${classes.length})`}
              </Button>
              
              <Button
                onClick={handleDeleteAllSubjects}
                icon={Trash2}
                variant="danger"
                disabled={isDeletingSubjects || subjects.length === 0}
                className="w-full"
              >
                {isDeletingSubjects ? 'Siliniyor...' : `Dersler (${subjects.length})`}
              </Button>
              
              <Button
                onClick={handleDeleteAllSchedules}
                icon={Trash2}
                variant="danger"
                disabled={isDeletingSchedules || schedules.length === 0}
                className="w-full"
              >
                {isDeletingSchedules ? 'Siliniyor...' : `Programlar (${schedules.length})`}
              </Button>
              
              <Button
                onClick={handleDeleteAllTemplates}
                icon={Trash2}
                variant="danger"
                disabled={isDeletingTemplates || templates.length === 0}
                className="w-full"
              >
                {isDeletingTemplates ? 'Siliniyor...' : `Şablonlar (${templates.length})`}
              </Button>

              <Button
                onClick={handleDeleteAllClassrooms}
                icon={Trash2}
                variant="danger"
                disabled={isDeletingClassrooms || classrooms.length === 0}
                className="w-full"
              >
                {isDeletingClassrooms ? 'Siliniyor...' : `Derslikler (${classrooms.length})`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Excel Import Modal */}
      <Modal
        isOpen={isExcelModalOpen}
        onClose={() => {
          setIsExcelModalOpen(false);
          resetExcelImport();
        }}
        title="Excel'den Öğretmen İçe Aktarma"
        size="lg"
      >
        <div className="space-y-6">
          {!showImportResults ? (
            <>
              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Excel Dosyası Seçin
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileSpreadsheet className="w-10 h-10 mb-3 text-blue-500" />
                      <p className="mb-2 text-sm text-blue-700">
                        <span className="font-semibold">Dosya seçmek için tıklayın</span> veya sürükleyip bırakın
                      </p>
                      <p className="text-xs text-blue-600">
                        Excel (.xlsx, .xls) veya CSV dosyaları
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls,.csv,.txt"
                      onChange={handleExcelFileChange}
                      ref={fileInputRef}
                      disabled={isProcessingExcel}
                    />
                  </label>
                </div>
              </div>

              {/* Preview and Settings */}
              {excelData.length > 0 && (
                <>
                  <div className="mb-4">
                    <Select
                      label="Öğretmen Seviyesi"
                      value={importLevel}
                      onChange={setImportLevel}
                      options={EDUCATION_LEVELS.map(level => ({
                        value: level,
                        label: level
                      }))}
                      required
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Tüm öğretmenler için varsayılan seviye. Excel'de seviye bilgisi yoksa bu kullanılacak.
                    </p>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">
                      Önizleme ({excelData.length} öğretmen)
                    </h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ad
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Soyad
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Branş
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Seviye
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {excelData.slice(0, 5).map((teacher, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {DOMPurify.sanitize(teacher.firstName)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {DOMPurify.sanitize(teacher.lastName)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {DOMPurify.sanitize(teacher.branch)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {importLevel}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {excelData.length > 5 && (
                        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
                          ... ve {excelData.length - 5} öğretmen daha
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">İçe Aktarma Bilgisi</h4>
                        <ul className="mt-1 text-xs text-blue-700 space-y-1">
                          <li>• Tüm öğretmenler için seviye: <strong>{importLevel}</strong></li>
                          <li>• Zaten mevcut olan öğretmenler atlanacak</li>
                          <li>• Her branş için otomatik ders kaydı oluşturulacak</li>
                          <li>• Toplam {excelData.length} öğretmen içe aktarılacak</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      onClick={() => {
                        setIsExcelModalOpen(false);
                        resetExcelImport();
                      }}
                      variant="secondary"
                    >
                      İptal
                    </Button>
                    <Button
                      onClick={handleImportExcel}
                      variant="primary"
                      disabled={isProcessingExcel || excelData.length === 0}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    >
                      {isProcessingExcel ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
                    </Button>
                  </div>
                </>
              )}

              {/* Processing Indicator */}
              {isProcessingExcel && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">İşleniyor...</span>
                    <span className="text-sm text-gray-600">{importProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Import Results */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">İçe Aktarma Tamamlandı</h3>
                <p className="text-gray-600">
                  Excel dosyasından öğretmen verileri başarıyla içe aktarıldı
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">{importResults.added}</div>
                  <div className="text-sm text-green-800">Eklenen</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600 mb-1">{importResults.skipped}</div>
                  <div className="text-sm text-yellow-800">Atlanan</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600 mb-1">{importResults.failed}</div>
                  <div className="text-sm text-red-800">Başarısız</div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">İşlem Özeti</h4>
                    <ul className="mt-1 text-xs text-blue-700 space-y-1">
                      <li>• Toplam {importResults.total} öğretmen işlendi</li>
                      <li>• {importResults.added} yeni öğretmen eklendi</li>
                      <li>• {importResults.skipped} öğretmen zaten mevcut olduğu için atlandı</li>
                      <li>• {importResults.failed} öğretmen eklenirken hata oluştu</li>
                      <li>• Tüm öğretmenler için seviye: <strong>{importLevel}</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => {
                    setIsExcelModalOpen(false);
                    resetExcelImport();
                  }}
                  variant="primary"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  Tamam
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

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

export default DataManagement;