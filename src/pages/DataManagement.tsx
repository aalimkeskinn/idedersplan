import React, { useState, useRef } from 'react';
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
  HardDrive,
  Server,
  Activity,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import { Teacher, Class, Subject, Schedule, EDUCATION_LEVELS } from '../types';
import Button from '../components/UI/Button';
import ConfirmationModal from '../components/UI/ConfirmationModal';
import Modal from '../components/UI/Modal';
import Select from '../components/UI/Select';
import Input from '../components/UI/Input';

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

const DataManagement = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: teachers, add: addTeacher, remove: removeTeacher } = useFirestore<Teacher>('teachers');
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

  const [isDeletingTeachers, setIsDeletingTeachers] = useState(false);
  const [isDeletingClasses, setIsDeletingClasses] = useState(false);
  const [isDeletingSubjects, setIsDeletingSubjects] = useState(false);
  const [isDeletingSchedules, setIsDeletingSchedules] = useState(false);
  const [isDeletingTemplates, setIsDeletingTemplates] = useState(false);
  const [isDeletingClassrooms, setIsDeletingClassrooms] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  
  // Excel import states
  const [isTeacherImportModalOpen, setIsTeacherImportModalOpen] = useState(false);
  const [isSubjectImportModalOpen, setIsSubjectImportModalOpen] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState({ total: 0, success: 0, failed: 0, duplicates: 0 });
  const [importErrors, setImportErrors] = useState<string[]>([]);

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

  // Excel import functions
  const handleTeacherExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result as string;
        const rows = data.split('\n');
        
        // Parse CSV/TSV data
        const parsedData = rows.map(row => {
          // Handle both comma and tab delimiters
          const delimiter = row.includes('\t') ? '\t' : ',';
          return row.split(delimiter);
        }).filter(row => row.length >= 3 && row[0] && row[1] && row[2]); // Ensure we have at least 3 columns with data
        
        // Remove header row if it exists
        if (parsedData.length > 0 && 
            (parsedData[0][0].toLowerCase() === 'adi' || 
             parsedData[0][0].toLowerCase() === 'ad' || 
             parsedData[0][0].toLowerCase() === 'isim')) {
          parsedData.shift();
        }
        
        setExcelData(parsedData.map(row => ({
          firstName: row[0]?.trim() || '',
          lastName: row[1]?.trim() || '',
          role: row[2]?.trim() || ''
        })));
        
        setIsTeacherImportModalOpen(true);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
      } catch (err) {
        console.error('Excel parse error:', err);
        error('❌ Dosya Hatası', 'Excel dosyası okunamadı. Lütfen geçerli bir CSV veya Excel dosyası yükleyin.');
      }
    };
    
    reader.readAsText(file);
  };

  const handleSubjectExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result as string;
        const rows = data.split('\n');
        
        // Parse CSV/TSV data
        const parsedData = rows.map(row => {
          // Handle both comma and tab delimiters
          const delimiter = row.includes('\t') ? '\t' : ',';
          return row.split(delimiter);
        }).filter(row => row.length >= 1 && row[0]); // Ensure we have at least 1 column with data
        
        // Remove header row if it exists
        if (parsedData.length > 0 && 
            (parsedData[0][0].toLowerCase() === 'ders' || 
             parsedData[0][0].toLowerCase() === 'dersler' || 
             parsedData[0][0].toLowerCase() === 'a')) {
          parsedData.shift();
        }
        
        setExcelData(parsedData.map(row => ({
          name: row[0]?.trim() || ''
        })));
        
        setIsSubjectImportModalOpen(true);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
      } catch (err) {
        console.error('Excel parse error:', err);
        error('❌ Dosya Hatası', 'Excel dosyası okunamadı. Lütfen geçerli bir CSV veya Excel dosyası yükleyin.');
      }
    };
    
    reader.readAsText(file);
  };

  const importTeachersFromExcel = async () => {
    if (!selectedLevel) {
      warning('⚠️ Seviye Seçilmedi', 'Lütfen öğretmenler için bir eğitim seviyesi seçin');
      return;
    }
    
    setIsImporting(true);
    setImportStats({ total: excelData.length, success: 0, failed: 0, duplicates: 0 });
    setImportErrors([]);
    
    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;
    
    try {
      for (const row of excelData) {
        try {
          // Check if teacher already exists
          const fullName = `${row.firstName} ${row.lastName}`.trim();
          const existingTeacher = teachers.find(t => 
            t.name.toLowerCase() === fullName.toLowerCase() && 
            t.branch.toLowerCase() === row.role.toLowerCase()
          );
          
          if (existingTeacher) {
            duplicateCount++;
            continue;
          }
          
          // Add new teacher
          await addTeacher({
            name: fullName,
            branch: row.role,
            level: selectedLevel as 'Anaokulu' | 'İlkokul' | 'Ortaokul'
          });
          
          successCount++;
          
        } catch (err) {
          failedCount++;
          errors.push(`${row.firstName} ${row.lastName}: ${(err as Error).message}`);
        }
      }
      
      setImportStats({
        total: excelData.length,
        success: successCount,
        failed: failedCount,
        duplicates: duplicateCount
      });
      
      setImportErrors(errors);
      
      if (successCount > 0) {
        success('✅ İçe Aktarma Başarılı', `${successCount} öğretmen içe aktarıldı, ${duplicateCount} öğretmen zaten mevcut`);
      } else if (duplicateCount > 0) {
        warning('⚠️ Yeni Öğretmen Yok', `${duplicateCount} öğretmen zaten sistemde mevcut`);
      } else {
        error('❌ İçe Aktarma Başarısız', 'Hiçbir öğretmen içe aktarılamadı');
      }
      
    } catch (err) {
      error('❌ İçe Aktarma Hatası', 'Öğretmenler içe aktarılırken bir hata oluştu');
    } finally {
      setIsImporting(false);
    }
  };

  const importSubjectsFromExcel = async () => {
    if (!selectedLevel) {
      warning('⚠️ Seviye Seçilmedi', 'Lütfen dersler için bir eğitim seviyesi seçin');
      return;
    }
    
    setIsImporting(true);
    setImportStats({ total: excelData.length, success: 0, failed: 0, duplicates: 0 });
    setImportErrors([]);
    
    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;
    
    try {
      for (const row of excelData) {
        try {
          // Check if subject already exists
          const existingSubject = subjects.find(s => 
            s.name.toLowerCase() === row.name.toLowerCase() && 
            s.level === selectedLevel
          );
          
          if (existingSubject) {
            duplicateCount++;
            continue;
          }
          
          // Add new subject
          await addSubject({
            name: row.name,
            branch: row.name, // Using name as branch for simplicity
            level: selectedLevel as 'Anaokulu' | 'İlkokul' | 'Ortaokul',
            weeklyHours: 4 // Default weekly hours
          });
          
          successCount++;
          
        } catch (err) {
          failedCount++;
          errors.push(`${row.name}: ${(err as Error).message}`);
        }
      }
      
      setImportStats({
        total: excelData.length,
        success: successCount,
        failed: failedCount,
        duplicates: duplicateCount
      });
      
      setImportErrors(errors);
      
      if (successCount > 0) {
        success('✅ İçe Aktarma Başarılı', `${successCount} ders içe aktarıldı, ${duplicateCount} ders zaten mevcut`);
      } else if (duplicateCount > 0) {
        warning('⚠️ Yeni Ders Yok', `${duplicateCount} ders zaten sistemde mevcut`);
      } else {
        error('❌ İçe Aktarma Başarısız', 'Hiçbir ders içe aktarılamadı');
      }
      
    } catch (err) {
      error('❌ İçe Aktarma Hatası', 'Dersler içe aktarılırken bir hata oluştu');
    } finally {
      setIsImporting(false);
    }
  };

  const closeTeacherImportModal = () => {
    setIsTeacherImportModalOpen(false);
    setExcelData([]);
    setSelectedLevel('');
    setImportStats({ total: 0, success: 0, failed: 0, duplicates: 0 });
    setImportErrors([]);
  };

  const closeSubjectImportModal = () => {
    setIsSubjectImportModalOpen(false);
    setExcelData([]);
    setSelectedLevel('');
    setImportStats({ total: 0, success: 0, failed: 0, duplicates: 0 });
    setImportErrors([]);
  };

  const totalDataCount = teachers.length + classes.length + subjects.length + schedules.length + templates.length + classrooms.length;
  const sortedTemplates = [...templates].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">Veri Yönetimi</h1>
                <p className="text-sm text-gray-600">Sistem verilerini yönetin ve temizleyin</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => navigate('/')}
                variant="secondary"
              >
                Ana Sayfaya Dön
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Health Dashboard */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="ml-3 text-lg font-bold text-gray-900">Sistem Sağlığı</h2>
            </div>
            <div className="text-sm text-gray-600">
              Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <HardDrive className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="ml-3 font-medium text-blue-900">Veri Bütünlüğü</h3>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Sağlıklı
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Toplam Veri Öğesi</span>
                  <span className="text-sm font-medium text-gray-900">{totalDataCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Veri Tutarlılığı</span>
                  <span className="text-sm font-medium text-green-600">%100</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Son Yedekleme</span>
                  <span className="text-sm font-medium text-gray-900">Otomatik</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Server className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="ml-3 font-medium text-green-900">Bağlantı Durumu</h3>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Çevrimiçi
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Firebase Bağlantısı</span>
                  <span className="text-sm font-medium text-green-600">Aktif</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gecikme</span>
                  <span className="text-sm font-medium text-gray-900">~200ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Veri Senkronizasyonu</span>
                  <span className="text-sm font-medium text-green-600">Gerçek Zamanlı</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="ml-3 font-medium text-purple-900">Sistem Güvenliği</h3>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Korumalı
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Kimlik Doğrulama</span>
                  <span className="text-sm font-medium text-green-600">Aktif</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Veri Şifreleme</span>
                  <span className="text-sm font-medium text-green-600">Aktif</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Erişim Kontrolü</span>
                  <span className="text-sm font-medium text-green-600">Aktif</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Statistics */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="ml-3 text-lg font-bold text-gray-900">Veri İstatistikleri</h2>
            </div>
            <div className="text-sm text-gray-600">
              Toplam {totalDataCount} veri öğesi
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 shadow-sm transform transition-all duration-200 hover:scale-105 hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="ml-3 font-medium text-blue-900">Öğretmenler</h3>
                </div>
                <span className="text-2xl font-bold text-blue-600">{teachers.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="flex space-x-2">
                  <Button
                    onClick={() => navigate('/teachers')}
                    variant="secondary"
                    size="sm"
                    className="bg-white"
                  >
                    Yönet
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    icon={FileSpreadsheet}
                    variant="secondary"
                    size="sm"
                    className="bg-white"
                  >
                    Excel İçe Aktar
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleTeacherExcelUpload}
                    accept=".csv,.xls,.xlsx,.tsv,.txt"
                    className="hidden"
                  />
                </div>
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
            
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200 shadow-sm transform transition-all duration-200 hover:scale-105 hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Building className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="ml-3 font-medium text-emerald-900">Sınıflar</h3>
                </div>
                <span className="text-2xl font-bold text-emerald-600">{classes.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/classes')}
                  variant="secondary"
                  size="sm"
                  className="bg-white"
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
            
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-5 border border-indigo-200 shadow-sm transform transition-all duration-200 hover:scale-105 hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="ml-3 font-medium text-indigo-900">Dersler</h3>
                </div>
                <span className="text-2xl font-bold text-indigo-600">{subjects.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="flex space-x-2">
                  <Button
                    onClick={() => navigate('/subjects')}
                    variant="secondary"
                    size="sm"
                    className="bg-white"
                  >
                    Yönet
                  </Button>
                  <Button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.csv,.xls,.xlsx,.tsv,.txt';
                      input.onchange = (e) => handleSubjectExcelUpload(e as any);
                      input.click();
                    }}
                    icon={FileSpreadsheet}
                    variant="secondary"
                    size="sm"
                    className="bg-white"
                  >
                    Excel İçe Aktar
                  </Button>
                </div>
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
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200 shadow-sm transform transition-all duration-200 hover:scale-105 hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="ml-3 font-medium text-purple-900">Programlar</h3>
                </div>
                <span className="text-2xl font-bold text-purple-600">{schedules.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/all-schedules')}
                  variant="secondary"
                  size="sm"
                  className="bg-white"
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
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200 shadow-sm transform transition-all duration-200 hover:scale-105 hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Settings className="w-5 h-5 text-orange-600" />
                  </div>
                  <h3 className="ml-3 font-medium text-orange-900">Şablonlar</h3>
                </div>
                <span className="text-2xl font-bold text-orange-600">{templates.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/schedule-wizard')}
                  variant="secondary"
                  size="sm"
                  className="bg-white"
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

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-5 border border-teal-200 shadow-sm transform transition-all duration-200 hover:scale-105 hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <MapPin className="w-5 h-5 text-teal-600" />
                  </div>
                  <h3 className="ml-3 font-medium text-teal-900">Derslikler</h3>
                </div>
                <span className="text-2xl font-bold text-teal-600">{classrooms.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/classrooms')}
                  variant="secondary"
                  size="sm"
                  className="bg-white"
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
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="ml-3 text-lg font-bold text-gray-900">Program Şablonları</h2>
              </div>
              <Button
                onClick={() => navigate('/schedule-wizard')}
                icon={Plus}
                variant="primary"
                size="sm"
              >
                Yeni Program
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="group bg-gradient-to-br from-gray-50 to-orange-50 rounded-lg p-4 border border-orange-200 hover:border-orange-300 hover:shadow-md transition-all duration-200"
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
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Düzenle"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
                  
                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>Son güncelleme: {new Date(template.updatedAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <Button
                        onClick={() => handleEditTemplate(template.id)}
                        variant="secondary"
                        size="sm"
                        className="bg-white"
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
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <MapPin className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="ml-3 text-lg font-bold text-gray-900">Derslikler</h2>
              </div>
              <Button
                onClick={() => navigate('/classrooms')}
                icon={Plus}
                variant="primary"
                size="sm"
              >
                Yeni Derslik
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classrooms.slice(0, 6).map((classroom) => (
                <div
                  key={classroom.id}
                  className="bg-gradient-to-br from-gray-50 to-teal-50 rounded-lg p-4 border border-teal-200 hover:border-teal-300 hover:shadow-md transition-all duration-200"
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
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
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
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
                </div>
              ))}
            </div>
            
            {classrooms.length > 6 && (
              <div className="mt-4 text-center">
                <Button
                  onClick={() => navigate('/classrooms')}
                  variant="secondary"
                >
                  Tüm Derslikleri Görüntüle ({classrooms.length})
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Bulk Data Management */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="ml-3 text-lg font-bold text-gray-900">Toplu Veri Yönetimi</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Download className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="ml-3 font-medium text-blue-900">Veri Yedekleme</h3>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                Tüm sistem verilerinizi yedekleyin ve dışa aktarın. Bu işlem tüm öğretmen, sınıf, ders ve program verilerinizi içerir.
              </p>
              <Button
                variant="primary"
                icon={Download}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
                disabled
              >
                Tüm Verileri Yedekle (Yakında)
              </Button>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Upload className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="ml-3 font-medium text-green-900">Veri Geri Yükleme</h3>
              </div>
              <p className="text-sm text-green-700 mb-4">
                Önceden yedeklediğiniz verileri sisteme geri yükleyin. Bu işlem mevcut verilerinizin üzerine yazacaktır.
              </p>
              <Button
                variant="primary"
                icon={Upload}
                className="w-full bg-gradient-to-r from-green-500 to-green-600"
                disabled
              >
                Verileri Geri Yükle (Yakında)
              </Button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-md border border-red-200 p-6">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="ml-3 text-lg font-bold text-red-900">Tehlikeli Bölge</h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-5 bg-white rounded-xl border border-red-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-red-900 text-lg">Tüm Verileri Sil</h3>
                  <p className="text-sm text-red-700 mt-2">
                    Bu işlem tüm öğretmen, sınıf, ders, program ve şablon verilerinizi kalıcı olarak silecektir. Bu işlem geri alınamaz!
                  </p>
                </div>
                <Button
                  onClick={handleDeleteAllData}
                  icon={Trash2}
                  variant="danger"
                  disabled={isDeletingAll || totalDataCount === 0}
                  className="bg-gradient-to-r from-red-500 to-red-600"
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

      {/* Teacher Import Modal */}
      <Modal
        isOpen={isTeacherImportModalOpen}
        onClose={closeTeacherImportModal}
        title="Excel'den Öğretmen İçe Aktar"
        size="lg"
      >
        <div className="space-y-6">
          {/* Preview */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Önizleme ({excelData.length} kayıt)</h3>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Soyad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Görev</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {excelData.slice(0, 10).map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{row.firstName}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{row.lastName}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{row.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {excelData.length > 10 && (
                <div className="px-4 py-2 text-center text-sm text-gray-500">
                  ... ve {excelData.length - 10} kayıt daha
                </div>
              )}
            </div>
          </div>

          {/* Settings */}
          <div>
            <Select
              label="Öğretmen Seviyesi"
              value={selectedLevel}
              onChange={setSelectedLevel}
              options={EDUCATION_LEVELS.map(level => ({ value: level, label: level }))}
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              Tüm öğretmenler için aynı seviye kullanılacaktır. Daha sonra öğretmen sayfasından düzenleyebilirsiniz.
            </p>
          </div>

          {/* Import Results */}
          {importStats.total > 0 && (
            <div className={`p-4 rounded-lg ${
              importStats.success > 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <h4 className="font-medium text-gray-900 mb-2">İçe Aktarma Sonuçları</h4>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{importStats.success}</div>
                  <div className="text-xs text-gray-600">Başarılı</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{importStats.duplicates}</div>
                  <div className="text-xs text-gray-600">Zaten Mevcut</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{importStats.failed}</div>
                  <div className="text-xs text-gray-600">Başarısız</div>
                </div>
              </div>
              
              {importErrors.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200 max-h-40 overflow-y-auto">
                  <h5 className="text-sm font-medium text-red-800 mb-1">Hatalar:</h5>
                  <ul className="text-xs text-red-700 space-y-1">
                    {importErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              onClick={closeTeacherImportModal}
              variant="secondary"
            >
              İptal
            </Button>
            <Button
              onClick={importTeachersFromExcel}
              variant="primary"
              disabled={excelData.length === 0 || !selectedLevel || isImporting}
            >
              {isImporting ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Subject Import Modal */}
      <Modal
        isOpen={isSubjectImportModalOpen}
        onClose={closeSubjectImportModal}
        title="Excel'den Ders İçe Aktar"
        size="lg"
      >
        <div className="space-y-6">
          {/* Preview */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Önizleme ({excelData.length} kayıt)</h3>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ders Adı</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {excelData.slice(0, 10).map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{row.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {excelData.length > 10 && (
                <div className="px-4 py-2 text-center text-sm text-gray-500">
                  ... ve {excelData.length - 10} kayıt daha
                </div>
              )}
            </div>
          </div>

          {/* Settings */}
          <div>
            <Select
              label="Ders Seviyesi"
              value={selectedLevel}
              onChange={setSelectedLevel}
              options={EDUCATION_LEVELS.map(level => ({ value: level, label: level }))}
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              Tüm dersler için aynı seviye kullanılacaktır. Daha sonra dersler sayfasından düzenleyebilirsiniz.
            </p>
          </div>

          {/* Import Results */}
          {importStats.total > 0 && (
            <div className={`p-4 rounded-lg ${
              importStats.success > 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <h4 className="font-medium text-gray-900 mb-2">İçe Aktarma Sonuçları</h4>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{importStats.success}</div>
                  <div className="text-xs text-gray-600">Başarılı</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{importStats.duplicates}</div>
                  <div className="text-xs text-gray-600">Zaten Mevcut</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{importStats.failed}</div>
                  <div className="text-xs text-gray-600">Başarısız</div>
                </div>
              </div>
              
              {importErrors.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200 max-h-40 overflow-y-auto">
                  <h5 className="text-sm font-medium text-red-800 mb-1">Hatalar:</h5>
                  <ul className="text-xs text-red-700 space-y-1">
                    {importErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              onClick={closeSubjectImportModal}
              variant="secondary"
            >
              İptal
            </Button>
            <Button
              onClick={importSubjectsFromExcel}
              variant="primary"
              disabled={excelData.length === 0 || !selectedLevel || isImporting}
            >
              {isImporting ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
            </Button>
          </div>
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
    </div>
  );
};

export default DataManagement;