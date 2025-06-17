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
  FileText,
  Check,
  X,
  Info,
  FileUp
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

// CSV Teacher interface
interface CSVTeacher {
  name: string;
  branch: string;
  level: string;
  isValid: boolean;
  exists: boolean;
  error?: string;
}

// CSV Subject interface
interface CSVSubject {
  name: string;
  branch: string;
  level: string;
  weeklyHours: number;
  isValid: boolean;
  exists: boolean;
  error?: string;
}

const DataManagement = () => {
  const navigate = useNavigate();
  const { data: teachers, add: addTeacher, update: updateTeacher, remove: removeTeacher } = useFirestore<Teacher>('teachers');
  const { data: classes, remove: removeClass } = useFirestore<Class>('classes');
  const { data: subjects, add: addSubject, update: updateSubject, remove: removeSubject } = useFirestore<Subject>('subjects');
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
  
  // CSV Import States
  const [isTeacherImportModalOpen, setIsTeacherImportModalOpen] = useState(false);
  const [isSubjectImportModalOpen, setIsSubjectImportModalOpen] = useState(false);
  const [csvTeachers, setCsvTeachers] = useState<CSVTeacher[]>([]);
  const [csvSubjects, setCsvSubjects] = useState<CSVSubject[]>([]);
  const [defaultTeacherLevel, setDefaultTeacherLevel] = useState('İlkokul');
  const [defaultSubjectLevel, setDefaultSubjectLevel] = useState('İlkokul');
  const [defaultSubjectHours, setDefaultSubjectHours] = useState('30');
  const [isImportingTeachers, setIsImportingTeachers] = useState(false);
  const [isImportingSubjects, setIsImportingSubjects] = useState(false);
  
  const teacherFileInputRef = useRef<HTMLInputElement>(null);
  const subjectFileInputRef = useRef<HTMLInputElement>(null);

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

  // CSV Import Functions
  const handleTeacherFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target?.result as string;
      parseTeacherCSV(csvData);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleSubjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target?.result as string;
      parseSubjectCSV(csvData);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseTeacherCSV = (csvData: string) => {
    // Split by lines and remove empty lines
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      error('❌ CSV Hatası', 'CSV dosyası boş veya geçersiz');
      return;
    }

    // Get headers (first line)
    const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
    
    // Check if required headers exist
    const nameIndex = headers.findIndex(h => h.includes('ad') || h.includes('isim') || h.includes('name'));
    const branchIndex = headers.findIndex(h => h.includes('branş') || h.includes('branch'));
    const levelIndex = headers.findIndex(h => h.includes('seviye') || h.includes('level'));
    
    if (nameIndex === -1) {
      error('❌ CSV Hatası', 'CSV dosyasında "Adı Soyadı" sütunu bulunamadı');
      return;
    }

    // Parse data rows
    const parsedTeachers: CSVTeacher[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue;
      
      const values = line.split(',').map(value => value.trim());
      
      if (values.length <= nameIndex) continue;
      
      const name = values[nameIndex];
      const branch = branchIndex !== -1 && values.length > branchIndex ? values[branchIndex] : '';
      const level = levelIndex !== -1 && values.length > levelIndex ? values[levelIndex] : '';
      
      // Validate data
      let isValid = true;
      let error = '';
      
      if (!name) {
        isValid = false;
        error = 'İsim boş olamaz';
      }
      
      // Check if teacher already exists
      const exists = teachers.some(t => 
        t.name.toLowerCase() === name.toLowerCase() && 
        t.branch.toLowerCase() === (branch || '').toLowerCase()
      );
      
      parsedTeachers.push({
        name,
        branch,
        level: level || defaultTeacherLevel,
        isValid,
        exists,
        error
      });
    }
    
    setCsvTeachers(parsedTeachers);
    setIsTeacherImportModalOpen(true);
  };

  const parseSubjectCSV = (csvData: string) => {
    // Split by lines and remove empty lines
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      error('❌ CSV Hatası', 'CSV dosyası boş veya geçersiz');
      return;
    }

    // Get headers (first line)
    const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
    
    // Check if required headers exist
    const nameIndex = headers.findIndex(h => h.includes('ders') || h.includes('name') || h.includes('subject'));
    const branchIndex = headers.findIndex(h => h.includes('branş') || h.includes('branch'));
    const levelIndex = headers.findIndex(h => h.includes('seviye') || h.includes('level'));
    const hoursIndex = headers.findIndex(h => h.includes('saat') || h.includes('hour'));
    
    if (nameIndex === -1) {
      error('❌ CSV Hatası', 'CSV dosyasında "Ders" sütunu bulunamadı');
      return;
    }

    // Parse data rows
    const parsedSubjects: CSVSubject[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue;
      
      const values = line.split(',').map(value => value.trim());
      
      if (values.length <= nameIndex) continue;
      
      const name = values[nameIndex];
      const branch = branchIndex !== -1 && values.length > branchIndex ? values[branchIndex] : name;
      const level = levelIndex !== -1 && values.length > levelIndex ? values[levelIndex] : '';
      const weeklyHoursStr = hoursIndex !== -1 && values.length > hoursIndex ? values[hoursIndex] : defaultSubjectHours;
      const weeklyHours = parseInt(weeklyHoursStr) || parseInt(defaultSubjectHours);
      
      // Validate data
      let isValid = true;
      let error = '';
      
      if (!name) {
        isValid = false;
        error = 'Ders adı boş olamaz';
      }
      
      // Check if subject already exists
      const exists = subjects.some(s => 
        s.name.toLowerCase() === name.toLowerCase() && 
        s.branch.toLowerCase() === (branch || name).toLowerCase() &&
        s.level === (level || defaultSubjectLevel)
      );
      
      parsedSubjects.push({
        name,
        branch: branch || name,
        level: level || defaultSubjectLevel,
        weeklyHours: weeklyHours || 30,
        isValid,
        exists,
        error
      });
    }
    
    setCsvSubjects(parsedSubjects);
    setIsSubjectImportModalOpen(true);
  };

  const importTeachers = async () => {
    setIsImportingTeachers(true);
    
    try {
      let importedCount = 0;
      let skippedCount = 0;
      
      for (const teacher of csvTeachers) {
        if (!teacher.isValid || teacher.exists) {
          skippedCount++;
          continue;
        }
        
        try {
          // Validate level
          const level = EDUCATION_LEVELS.includes(teacher.level as any) 
            ? teacher.level 
            : defaultTeacherLevel;
          
          await addTeacher({
            name: teacher.name,
            branch: teacher.branch || 'Genel',
            level: level as Teacher['level']
          } as Omit<Teacher, 'id' | 'createdAt'>);
          
          importedCount++;
        } catch (err) {
          console.error(`❌ Öğretmen içe aktarılamadı: ${teacher.name}`, err);
        }
      }
      
      if (importedCount > 0) {
        success('✅ İçe Aktarma Tamamlandı', `${importedCount} öğretmen başarıyla içe aktarıldı, ${skippedCount} öğretmen atlandı`);
        setIsTeacherImportModalOpen(false);
        setCsvTeachers([]);
      } else {
        warning('⚠️ İçe Aktarma Uyarısı', 'Hiçbir öğretmen içe aktarılamadı');
      }
    } catch (err) {
      error('❌ İçe Aktarma Hatası', 'Öğretmenler içe aktarılırken bir hata oluştu');
    } finally {
      setIsImportingTeachers(false);
    }
  };

  const importSubjects = async () => {
    setIsImportingSubjects(true);
    
    try {
      let importedCount = 0;
      let skippedCount = 0;
      
      for (const subject of csvSubjects) {
        if (!subject.isValid || subject.exists) {
          skippedCount++;
          continue;
        }
        
        try {
          // Validate level
          const level = EDUCATION_LEVELS.includes(subject.level as any) 
            ? subject.level 
            : defaultSubjectLevel;
          
          await addSubject({
            name: subject.name,
            branch: subject.branch || subject.name,
            level: level as Subject['level'],
            weeklyHours: subject.weeklyHours || 30
          } as Omit<Subject, 'id' | 'createdAt'>);
          
          importedCount++;
        } catch (err) {
          console.error(`❌ Ders içe aktarılamadı: ${subject.name}`, err);
        }
      }
      
      if (importedCount > 0) {
        success('✅ İçe Aktarma Tamamlandı', `${importedCount} ders başarıyla içe aktarıldı, ${skippedCount} ders atlandı`);
        setIsSubjectImportModalOpen(false);
        setCsvSubjects([]);
      } else {
        warning('⚠️ İçe Aktarma Uyarısı', 'Hiçbir ders içe aktarılamadı');
      }
    } catch (err) {
      error('❌ İçe Aktarma Hatası', 'Dersler içe aktarılırken bir hata oluştu');
    } finally {
      setIsImportingSubjects(false);
    }
  };

  const totalDataCount = teachers.length + classes.length + subjects.length + schedules.length + templates.length + classrooms.length;
  const sortedTemplates = [...templates].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Database className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Veri Yönetimi</h1>
                <p className="text-sm text-gray-600">Sistem verilerini yönetin ve içe aktarın</p>
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
        {/* CSV Import Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <FileUp className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-bold text-gray-900">CSV İçe Aktarma</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teacher Import */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
              <div className="flex items-center mb-4">
                <Users className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="font-medium text-blue-900">Öğretmen İçe Aktarma</h3>
              </div>
              
              <p className="text-sm text-blue-700 mb-4">
                CSV dosyasından öğretmen verilerini içe aktarın. Dosya "Adı Soyadı", "Branşı" ve "Eğitim Seviyesi" sütunlarını içermelidir.
              </p>
              
              <div className="flex flex-col space-y-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleTeacherFileChange}
                  ref={teacherFileInputRef}
                  className="hidden"
                />
                
                <Button
                  onClick={() => teacherFileInputRef.current?.click()}
                  variant="primary"
                  icon={Upload}
                  className="w-full"
                >
                  CSV Dosyası Seç
                </Button>
                
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <h4 className="text-xs font-medium text-blue-800 mb-2">CSV Format Rehberi:</h4>
                  <div className="text-xs text-blue-700">
                    <p className="mb-1">Sütun Başlıkları:</p>
                    <code className="bg-blue-100 px-2 py-1 rounded">Adı Soyadı,Branşı,Eğitim Seviyesi</code>
                    <p className="mt-2 mb-1">Örnek Veri:</p>
                    <code className="bg-blue-100 px-2 py-1 rounded">Ahmet Yılmaz,Matematik,İlkokul</code>
                    <p className="mt-2">Not: Türkçe karakterler desteklenir. Excel'den "CSV UTF-8" formatında kaydedin.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Subject Import */}
            <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-100">
              <div className="flex items-center mb-4">
                <BookOpen className="w-5 h-5 text-indigo-600 mr-2" />
                <h3 className="font-medium text-indigo-900">Ders İçe Aktarma</h3>
              </div>
              
              <p className="text-sm text-indigo-700 mb-4">
                CSV dosyasından ders verilerini içe aktarın. Dosya "Ders", "Branş", "Eğitim Seviyesi" ve "Ders Saati" sütunlarını içermelidir.
              </p>
              
              <div className="flex flex-col space-y-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleSubjectFileChange}
                  ref={subjectFileInputRef}
                  className="hidden"
                />
                
                <Button
                  onClick={() => subjectFileInputRef.current?.click()}
                  variant="primary"
                  icon={Upload}
                  className="w-full"
                >
                  CSV Dosyası Seç
                </Button>
                
                <div className="bg-white rounded-lg p-3 border border-indigo-200">
                  <h4 className="text-xs font-medium text-indigo-800 mb-2">CSV Format Rehberi:</h4>
                  <div className="text-xs text-indigo-700">
                    <p className="mb-1">Sütun Başlıkları:</p>
                    <code className="bg-indigo-100 px-2 py-1 rounded">Ders,Branş,Eğitim Seviyesi,Ders Saati</code>
                    <p className="mt-2 mb-1">Örnek Veri:</p>
                    <code className="bg-indigo-100 px-2 py-1 rounded">Matematik,Matematik,İlkokul,5</code>
                    <p className="mt-2">Not: Branş belirtilmezse ders adı kullanılır. Ders saati belirtilmezse varsayılan 30 kullanılır.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Statistics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <BarChart3 className="w-6 h-6 text-purple-600 mr-2" />
              <h2 className="text-lg font-bold text-gray-900">Veri İstatistikleri</h2>
            </div>
            <div className="text-sm text-gray-600">
              Toplam {totalDataCount} veri öğesi
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-medium text-blue-900">Öğretmenler</h3>
                </div>
                <span className="text-2xl font-bold text-blue-600">{teachers.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/teachers')}
                  variant="secondary"
                  size="sm"
                >
                  Yönet
                </Button>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setIsTeacherImportModalOpen(true)}
                    icon={Upload}
                    variant="secondary"
                    size="sm"
                  >
                    İçe Aktar
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
            
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Building className="w-5 h-5 text-emerald-600 mr-2" />
                  <h3 className="font-medium text-emerald-900">Sınıflar</h3>
                </div>
                <span className="text-2xl font-bold text-emerald-600">{classes.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/classes')}
                  variant="secondary"
                  size="sm"
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
            
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <BookOpen className="w-5 h-5 text-indigo-600 mr-2" />
                  <h3 className="font-medium text-indigo-900">Dersler</h3>
                </div>
                <span className="text-2xl font-bold text-indigo-600">{subjects.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/subjects')}
                  variant="secondary"
                  size="sm"
                >
                  Yönet
                </Button>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setIsSubjectImportModalOpen(true)}
                    icon={Upload}
                    variant="secondary"
                    size="sm"
                  >
                    İçe Aktar
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
            
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-purple-600 mr-2" />
                  <h3 className="font-medium text-purple-900">Programlar</h3>
                </div>
                <span className="text-2xl font-bold text-purple-600">{schedules.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/all-schedules')}
                  variant="secondary"
                  size="sm"
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
            
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Settings className="w-5 h-5 text-orange-600 mr-2" />
                  <h3 className="font-medium text-orange-900">Şablonlar</h3>
                </div>
                <span className="text-2xl font-bold text-orange-600">{templates.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/schedule-wizard')}
                  variant="secondary"
                  size="sm"
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

            <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-teal-600 mr-2" />
                  <h3 className="font-medium text-teal-900">Derslikler</h3>
                </div>
                <span className="text-2xl font-bold text-teal-600">{classrooms.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => navigate('/classrooms')}
                  variant="secondary"
                  size="sm"
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Calendar className="w-6 h-6 text-orange-600 mr-2" />
                <h2 className="text-lg font-bold text-gray-900">Program Şablonları</h2>
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
                  className="group bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
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

        {/* Bulk Data Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Database className="w-6 h-6 text-purple-600 mr-2" />
              <h2 className="text-lg font-bold text-gray-900">Toplu Veri Yönetimi</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center mb-4">
                <Download className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="font-medium text-blue-900">Veri Yedekleme</h3>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                Tüm sistem verilerinizi yedekleyin ve dışa aktarın. Bu işlem tüm öğretmen, sınıf, ders ve program verilerinizi içerir.
              </p>
              <Button
                variant="primary"
                icon={Download}
                className="w-full"
                disabled
              >
                Tüm Verileri Yedekle (Yakında)
              </Button>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center mb-4">
                <Upload className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="font-medium text-green-900">Veri Geri Yükleme</h3>
              </div>
              <p className="text-sm text-green-700 mb-4">
                Önceden yedeklediğiniz verileri sisteme geri yükleyin. Bu işlem mevcut verilerinizin üzerine yazacaktır.
              </p>
              <Button
                variant="primary"
                icon={Upload}
                className="w-full"
                disabled
              >
                Verileri Geri Yükle (Yakında)
              </Button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-6">
          <div className="flex items-center mb-6">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
            <h2 className="text-lg font-bold text-red-900">Tehlikeli Bölge</h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-red-900">Tüm Verileri Sil</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Bu işlem tüm öğretmen, sınıf, ders, program ve şablon verilerinizi kalıcı olarak silecektir. Bu işlem geri alınamaz!
                  </p>
                </div>
                <Button
                  onClick={handleDeleteAllData}
                  icon={Trash2}
                  variant="danger"
                  disabled={isDeletingAll || totalDataCount === 0}
                >
                  {isDeletingAll ? 'Siliniyor...' : `Tüm Verileri Sil (${totalDataCount})`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Import Modal */}
      <Modal
        isOpen={isTeacherImportModalOpen}
        onClose={() => {
          setIsTeacherImportModalOpen(false);
          setCsvTeachers([]);
        }}
        title="Öğretmen CSV İçe Aktarma"
        size="xl"
      >
        <div className="space-y-4">
          {csvTeachers.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Önizleme</h3>
                  <p className="text-sm text-gray-600">
                    {csvTeachers.length} öğretmen bulundu • {csvTeachers.filter(t => t.isValid && !t.exists).length} içe aktarılacak
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Varsayılan Eğitim Seviyesi
                    </label>
                    <select
                      value={defaultTeacherLevel}
                      onChange={(e) => setDefaultTeacherLevel(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {EDUCATION_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  
                  <Button
                    onClick={() => {
                      teacherFileInputRef.current!.value = '';
                      teacherFileInputRef.current?.click();
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    Yeni Dosya Seç
                  </Button>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Adı Soyadı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Branşı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Eğitim Seviyesi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvTeachers.map((teacher, index) => (
                        <tr key={index} className={
                          !teacher.isValid ? 'bg-red-50' : 
                          teacher.exists ? 'bg-yellow-50' : 
                          'hover:bg-gray-50'
                        }>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {!teacher.isValid ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <X className="w-3 h-3 mr-1" />
                                Geçersiz
                              </span>
                            ) : teacher.exists ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Info className="w-3 h-3 mr-1" />
                                Mevcut
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Check className="w-3 h-3 mr-1" />
                                Eklenecek
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                            {!teacher.isValid && (
                              <div className="text-xs text-red-600">{teacher.error}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{teacher.branch || 'Genel'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              teacher.level === 'Anaokulu' ? 'bg-green-100 text-green-800' :
                              teacher.level === 'İlkokul' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {teacher.level || defaultTeacherLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={() => {
                    setIsTeacherImportModalOpen(false);
                    setCsvTeachers([]);
                  }}
                  variant="secondary"
                >
                  İptal
                </Button>
                <Button
                  onClick={importTeachers}
                  variant="primary"
                  disabled={csvTeachers.filter(t => t.isValid && !t.exists).length === 0 || isImportingTeachers}
                >
                  {isImportingTeachers ? 'İçe Aktarılıyor...' : `${csvTeachers.filter(t => t.isValid && !t.exists).length} Öğretmeni İçe Aktar`}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">CSV Dosyası Seçin</h3>
              <p className="text-gray-500 mb-6">
                Öğretmen verilerini içeren bir CSV dosyası seçin
              </p>
              <Button
                onClick={() => teacherFileInputRef.current?.click()}
                variant="primary"
                icon={Upload}
              >
                CSV Dosyası Seç
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Subject Import Modal */}
      <Modal
        isOpen={isSubjectImportModalOpen}
        onClose={() => {
          setIsSubjectImportModalOpen(false);
          setCsvSubjects([]);
        }}
        title="Ders CSV İçe Aktarma"
        size="xl"
      >
        <div className="space-y-4">
          {csvSubjects.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Önizleme</h3>
                  <p className="text-sm text-gray-600">
                    {csvSubjects.length} ders bulundu • {csvSubjects.filter(s => s.isValid && !s.exists).length} içe aktarılacak
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Varsayılan Eğitim Seviyesi
                    </label>
                    <select
                      value={defaultSubjectLevel}
                      onChange={(e) => setDefaultSubjectLevel(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {EDUCATION_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Varsayılan Ders Saati
                    </label>
                    <input
                      type="number"
                      value={defaultSubjectHours}
                      onChange={(e) => setDefaultSubjectHours(e.target.value)}
                      min="1"
                      max="30"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <Button
                    onClick={() => {
                      subjectFileInputRef.current!.value = '';
                      subjectFileInputRef.current?.click();
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    Yeni Dosya Seç
                  </Button>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ders Adı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Branş
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Eğitim Seviyesi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Haftalık Saat
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvSubjects.map((subject, index) => (
                        <tr key={index} className={
                          !subject.isValid ? 'bg-red-50' : 
                          subject.exists ? 'bg-yellow-50' : 
                          'hover:bg-gray-50'
                        }>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {!subject.isValid ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <X className="w-3 h-3 mr-1" />
                                Geçersiz
                              </span>
                            ) : subject.exists ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Info className="w-3 h-3 mr-1" />
                                Mevcut
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Check className="w-3 h-3 mr-1" />
                                Eklenecek
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{subject.name}</div>
                            {!subject.isValid && (
                              <div className="text-xs text-red-600">{subject.error}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{subject.branch || subject.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              subject.level === 'Anaokulu' ? 'bg-green-100 text-green-800' :
                              subject.level === 'İlkokul' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {subject.level || defaultSubjectLevel}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{subject.weeklyHours || 30} saat</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={() => {
                    setIsSubjectImportModalOpen(false);
                    setCsvSubjects([]);
                  }}
                  variant="secondary"
                >
                  İptal
                </Button>
                <Button
                  onClick={importSubjects}
                  variant="primary"
                  disabled={csvSubjects.filter(s => s.isValid && !s.exists).length === 0 || isImportingSubjects}
                >
                  {isImportingSubjects ? 'İçe Aktarılıyor...' : `${csvSubjects.filter(s => s.isValid && !s.exists).length} Dersi İçe Aktar`}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">CSV Dosyası Seçin</h3>
              <p className="text-gray-500 mb-6">
                Ders verilerini içeren bir CSV dosyası seçin
              </p>
              <Button
                onClick={() => subjectFileInputRef.current?.click()}
                variant="primary"
                icon={Upload}
              >
                CSV Dosyası Seç
              </Button>
            </div>
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
    </div>
  );
};

export default DataManagement;