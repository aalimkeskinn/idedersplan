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
  X
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

// CSV Import Preview interface
interface TeacherImportPreview {
  name: string;
  branch: string;
  level: string;
  status: 'new' | 'exists' | 'error';
  message?: string;
}

interface SubjectImportPreview {
  name: string;
  branch: string;
  level: string;
  weeklyHours: number;
  status: 'new' | 'exists' | 'error';
  message?: string;
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
  const [teacherImportPreview, setTeacherImportPreview] = useState<TeacherImportPreview[]>([]);
  const [subjectImportPreview, setSubjectImportPreview] = useState<SubjectImportPreview[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [defaultTeacherLevel, setDefaultTeacherLevel] = useState('İlkokul');
  const [defaultSubjectLevel, setDefaultSubjectLevel] = useState('İlkokul');
  const [defaultWeeklyHours, setDefaultWeeklyHours] = useState('4');
  
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
      try {
        const csvContent = event.target?.result as string;
        const preview = parseTeacherCSV(csvContent);
        setTeacherImportPreview(preview);
        setIsTeacherImportModalOpen(true);
      } catch (err) {
        error('❌ CSV Okuma Hatası', 'CSV dosyası okunurken bir hata oluştu');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleSubjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string;
        const preview = parseSubjectCSV(csvContent);
        setSubjectImportPreview(preview);
        setIsSubjectImportModalOpen(true);
      } catch (err) {
        error('❌ CSV Okuma Hatası', 'CSV dosyası okunurken bir hata oluştu');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseTeacherCSV = (csvContent: string): TeacherImportPreview[] => {
    // Split by lines and remove empty lines
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    
    // Check if there's at least one line (header)
    if (lines.length === 0) {
      throw new Error('CSV dosyası boş');
    }

    // Parse header to determine column indices
    const header = lines[0].split(',').map(h => h.trim().toUpperCase());
    const nameIndex = header.findIndex(h => h === 'ADI' || h === 'AD' || h === 'İSİM');
    const surnameIndex = header.findIndex(h => h === 'SOYADI' || h === 'SOYAD');
    const branchIndex = header.findIndex(h => h === 'GÖREVİ' || h === 'BRANŞ' || h === 'BRANŞI');
    
    // Validate required columns
    if (nameIndex === -1 || branchIndex === -1) {
      throw new Error('CSV dosyasında gerekli sütunlar bulunamadı (ADI, GÖREVİ)');
    }

    const preview: TeacherImportPreview[] = [];
    
    // Process data rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',').map(col => col.trim());
      
      // Skip if not enough columns
      if (columns.length <= Math.max(nameIndex, surnameIndex, branchIndex)) {
        continue;
      }
      
      let name = columns[nameIndex];
      // Add surname if available
      if (surnameIndex !== -1 && columns[surnameIndex]) {
        name = `${name} ${columns[surnameIndex]}`;
      }
      
      const branch = columns[branchIndex];
      
      // Skip empty rows
      if (!name || !branch) {
        continue;
      }
      
      // Check if teacher already exists
      const exists = teachers.some(t => 
        t.name.toLowerCase() === name.toLowerCase() && 
        t.branch.toLowerCase() === branch.toLowerCase()
      );
      
      preview.push({
        name,
        branch,
        level: defaultTeacherLevel, // Default level, will be set in UI
        status: exists ? 'exists' : 'new',
        message: exists ? 'Öğretmen zaten mevcut' : undefined
      });
    }
    
    return preview;
  };

  const parseSubjectCSV = (csvContent: string): SubjectImportPreview[] => {
    // Split by lines and remove empty lines
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    
    // Check if there's at least one line
    if (lines.length === 0) {
      throw new Error('CSV dosyası boş');
    }

    const preview: SubjectImportPreview[] = [];
    
    // Process each line as a subject name
    for (let i = 0; i < lines.length; i++) {
      const name = lines[i].trim();
      
      // Skip empty names
      if (!name) {
        continue;
      }
      
      // Check if subject already exists
      const exists = subjects.some(s => 
        s.name.toLowerCase() === name.toLowerCase() && 
        s.level === defaultSubjectLevel
      );
      
      preview.push({
        name,
        branch: name, // Use name as branch by default
        level: defaultSubjectLevel,
        weeklyHours: parseInt(defaultWeeklyHours),
        status: exists ? 'exists' : 'new',
        message: exists ? 'Ders zaten mevcut' : undefined
      });
    }
    
    return preview;
  };

  const importTeachers = async () => {
    setIsImporting(true);
    
    try {
      let addedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      for (const teacher of teacherImportPreview) {
        if (teacher.status === 'exists') {
          skippedCount++;
          continue;
        }
        
        try {
          await addTeacher({
            name: teacher.name,
            branch: teacher.branch,
            level: teacher.level as 'Anaokulu' | 'İlkokul' | 'Ortaokul'
          } as Omit<Teacher, 'id' | 'createdAt'>);
          
          addedCount++;
        } catch (err) {
          console.error(`❌ Öğretmen eklenemedi: ${teacher.name}`, err);
          errorCount++;
        }
      }
      
      if (addedCount > 0) {
        success('✅ İçe Aktarma Tamamlandı', `${addedCount} öğretmen başarıyla eklendi, ${skippedCount} öğretmen atlandı, ${errorCount} hata`);
      } else if (skippedCount > 0) {
        warning('⚠️ İçe Aktarma Tamamlandı', `Hiçbir öğretmen eklenmedi, ${skippedCount} öğretmen zaten mevcut`);
      } else {
        error('❌ İçe Aktarma Hatası', 'Hiçbir öğretmen eklenemedi');
      }
      
      setIsTeacherImportModalOpen(false);
      setTeacherImportPreview([]);
      
      // Reset file input
      if (teacherFileInputRef.current) {
        teacherFileInputRef.current.value = '';
      }
    } catch (err) {
      error('❌ İçe Aktarma Hatası', 'Öğretmenler içe aktarılırken bir hata oluştu');
    } finally {
      setIsImporting(false);
    }
  };

  const importSubjects = async () => {
    setIsImporting(true);
    
    try {
      let addedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      for (const subject of subjectImportPreview) {
        if (subject.status === 'exists') {
          skippedCount++;
          continue;
        }
        
        try {
          await addSubject({
            name: subject.name,
            branch: subject.branch,
            level: subject.level as 'Anaokulu' | 'İlkokul' | 'Ortaokul',
            weeklyHours: subject.weeklyHours
          } as Omit<Subject, 'id' | 'createdAt'>);
          
          addedCount++;
        } catch (err) {
          console.error(`❌ Ders eklenemedi: ${subject.name}`, err);
          errorCount++;
        }
      }
      
      if (addedCount > 0) {
        success('✅ İçe Aktarma Tamamlandı', `${addedCount} ders başarıyla eklendi, ${skippedCount} ders atlandı, ${errorCount} hata`);
      } else if (skippedCount > 0) {
        warning('⚠️ İçe Aktarma Tamamlandı', `Hiçbir ders eklenmedi, ${skippedCount} ders zaten mevcut`);
      } else {
        error('❌ İçe Aktarma Hatası', 'Hiçbir ders eklenemedi');
      }
      
      setIsSubjectImportModalOpen(false);
      setSubjectImportPreview([]);
      
      // Reset file input
      if (subjectFileInputRef.current) {
        subjectFileInputRef.current.value = '';
      }
    } catch (err) {
      error('❌ İçe Aktarma Hatası', 'Dersler içe aktarılırken bir hata oluştu');
    } finally {
      setIsImporting(false);
    }
  };

  const updateTeacherLevel = (index: number, level: string) => {
    const updatedPreview = [...teacherImportPreview];
    updatedPreview[index].level = level;
    setTeacherImportPreview(updatedPreview);
  };

  const updateSubjectLevel = (index: number, level: string) => {
    const updatedPreview = [...subjectImportPreview];
    updatedPreview[index].level = level;
    setSubjectImportPreview(updatedPreview);
  };

  const updateSubjectWeeklyHours = (index: number, hours: string) => {
    const updatedPreview = [...subjectImportPreview];
    updatedPreview[index].weeklyHours = parseInt(hours) || 1;
    setSubjectImportPreview(updatedPreview);
  };

  const updateAllTeacherLevels = (level: string) => {
    const updatedPreview = teacherImportPreview.map(teacher => ({
      ...teacher,
      level
    }));
    setTeacherImportPreview(updatedPreview);
    setDefaultTeacherLevel(level);
  };

  const updateAllSubjectLevels = (level: string) => {
    const updatedPreview = subjectImportPreview.map(subject => ({
      ...subject,
      level
    }));
    setSubjectImportPreview(updatedPreview);
    setDefaultSubjectLevel(level);
  };

  const updateAllSubjectWeeklyHours = (hours: string) => {
    const hoursNum = parseInt(hours) || 1;
    const updatedPreview = subjectImportPreview.map(subject => ({
      ...subject,
      weeklyHours: hoursNum
    }));
    setSubjectImportPreview(updatedPreview);
    setDefaultWeeklyHours(hours);
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
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-medium text-blue-900">Öğretmenler</h3>
                </div>
                <span className="text-2xl font-bold text-blue-600">{teachers.length}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="flex space-x-2">
                  <Button
                    onClick={() => navigate('/teachers')}
                    variant="secondary"
                    size="sm"
                  >
                    Yönet
                  </Button>
                  <Button
                    onClick={() => teacherFileInputRef.current?.click()}
                    variant="secondary"
                    size="sm"
                    icon={Upload}
                  >
                    CSV Yükle
                  </Button>
                  <input
                    type="file"
                    ref={teacherFileInputRef}
                    onChange={handleTeacherFileChange}
                    accept=".csv"
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
                <div className="flex space-x-2">
                  <Button
                    onClick={() => navigate('/subjects')}
                    variant="secondary"
                    size="sm"
                  >
                    Yönet
                  </Button>
                  <Button
                    onClick={() => subjectFileInputRef.current?.click()}
                    variant="secondary"
                    size="sm"
                    icon={Upload}
                  >
                    CSV Yükle
                  </Button>
                  <input
                    type="file"
                    ref={subjectFileInputRef}
                    onChange={handleSubjectFileChange}
                    accept=".csv"
                    className="hidden"
                  />
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

        {/* CSV Import Guide */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <FileText className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-bold text-gray-900">CSV İçe Aktarma Rehberi</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h3 className="font-medium text-blue-900 mb-3">Öğretmen CSV Formatı</h3>
              <p className="text-sm text-blue-700 mb-3">
                CSV dosyanızda aşağıdaki sütunlar olmalıdır:
              </p>
              <div className="bg-white p-3 rounded border border-blue-200 mb-3 font-mono text-xs">
                ADI,SOYADI,GÖREVİ<br />
                Ahmet,Yılmaz,MATEMATİK ÖĞRETMENİ<br />
                Ayşe,Demir,TÜRKÇE ÖĞRETMENİ
              </div>
              <p className="text-sm text-blue-700">
                <strong>Not:</strong> Eğitim seviyesi (Anaokulu, İlkokul, Ortaokul) içe aktarma sırasında seçilecektir.
              </p>
              <div className="mt-4">
                <Button
                  onClick={() => teacherFileInputRef.current?.click()}
                  variant="primary"
                  size="sm"
                  icon={Upload}
                  className="w-full"
                >
                  Öğretmen CSV Dosyası Yükle
                </Button>
              </div>
            </div>
            
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <h3 className="font-medium text-indigo-900 mb-3">Ders CSV Formatı</h3>
              <p className="text-sm text-indigo-700 mb-3">
                CSV dosyanızda her satırda bir ders adı olmalıdır:
              </p>
              <div className="bg-white p-3 rounded border border-indigo-200 mb-3 font-mono text-xs">
                MATEMATİK ÖĞRETMENİ<br />
                TÜRKÇE ÖĞRETMENİ<br />
                FEN BİLGİSİ ÖĞRETMENİ
              </div>
              <p className="text-sm text-indigo-700">
                <strong>Not:</strong> Eğitim seviyesi ve haftalık ders saati içe aktarma sırasında seçilecektir.
              </p>
              <div className="mt-4">
                <Button
                  onClick={() => subjectFileInputRef.current?.click()}
                  variant="primary"
                  size="sm"
                  icon={Upload}
                  className="w-full"
                >
                  Ders CSV Dosyası Yükle
                </Button>
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

        {/* Classrooms Section */}
        {classrooms.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <MapPin className="w-6 h-6 text-teal-600 mr-2" />
                <h2 className="text-lg font-bold text-gray-900">Derslikler</h2>
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
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all duration-200"
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
                  </div>
                </div>
              ))}
            </div>
            
            {classrooms.length > 6 && (
              <div className="mt-4 text-center">
                <Button
                  onClick={() => navigate('/classrooms')}
                  variant="secondary"
                  size="sm"
                >
                  Tüm Derslikleri Görüntüle ({classrooms.length})
                </Button>
              </div>
            )}
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
        onClose={() => setIsTeacherImportModalOpen(false)}
        title="Öğretmen CSV İçe Aktarma"
        size="xl"
      >
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Önizleme</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Tüm öğretmenler için seviye:</span>
              <Select
                value={defaultTeacherLevel}
                onChange={updateAllTeacherLevels}
                options={EDUCATION_LEVELS.map(level => ({ value: level, label: level }))}
                required
              />
            </div>
          </div>
          
          {teacherImportPreview.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ad Soyad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branş
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seviye
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teacherImportPreview.map((teacher, index) => (
                      <tr key={index} className={teacher.status === 'exists' ? 'bg-yellow-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{teacher.branch}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Select
                            value={teacher.level}
                            onChange={(value) => updateTeacherLevel(index, value)}
                            options={EDUCATION_LEVELS.map(level => ({ value: level, label: level }))}
                            required
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {teacher.status === 'new' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="w-3 h-3 mr-1" />
                              Yeni Eklenecek
                            </span>
                          ) : teacher.status === 'exists' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Zaten Mevcut
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <X className="w-3 h-3 mr-1" />
                              Hata
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Önizleme için CSV dosyası yükleyin</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {teacherImportPreview.length > 0 && (
              <>
                <span className="font-medium">{teacherImportPreview.filter(t => t.status === 'new').length}</span> yeni öğretmen eklenecek,{' '}
                <span className="font-medium">{teacherImportPreview.filter(t => t.status === 'exists').length}</span> öğretmen atlanacak
              </>
            )}
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setIsTeacherImportModalOpen(false)}
              variant="secondary"
            >
              İptal
            </Button>
            <Button
              onClick={importTeachers}
              variant="primary"
              disabled={isImporting || teacherImportPreview.length === 0 || teacherImportPreview.every(t => t.status === 'exists')}
            >
              {isImporting ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Subject Import Modal */}
      <Modal
        isOpen={isSubjectImportModalOpen}
        onClose={() => setIsSubjectImportModalOpen(false)}
        title="Ders CSV İçe Aktarma"
        size="xl"
      >
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Önizleme</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Tüm dersler için:</span>
              <Select
                value={defaultSubjectLevel}
                onChange={updateAllSubjectLevels}
                options={EDUCATION_LEVELS.map(level => ({ value: level, label: level }))}
                required
              />
              <Select
                value={defaultWeeklyHours}
                onChange={updateAllSubjectWeeklyHours}
                options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(h => ({ value: h.toString(), label: `${h} saat` }))}
                required
              />
            </div>
          </div>
          
          {subjectImportPreview.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ders Adı
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branş
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seviye
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Haftalık Saat
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subjectImportPreview.map((subject, index) => (
                      <tr key={index} className={subject.status === 'exists' ? 'bg-yellow-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{subject.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{subject.branch}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Select
                            value={subject.level}
                            onChange={(value) => updateSubjectLevel(index, value)}
                            options={EDUCATION_LEVELS.map(level => ({ value: level, label: level }))}
                            required
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Select
                            value={subject.weeklyHours.toString()}
                            onChange={(value) => updateSubjectWeeklyHours(index, value)}
                            options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(h => ({ value: h.toString(), label: `${h} saat` }))}
                            required
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {subject.status === 'new' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="w-3 h-3 mr-1" />
                              Yeni Eklenecek
                            </span>
                          ) : subject.status === 'exists' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Zaten Mevcut
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <X className="w-3 h-3 mr-1" />
                              Hata
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Önizleme için CSV dosyası yükleyin</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {subjectImportPreview.length > 0 && (
              <>
                <span className="font-medium">{subjectImportPreview.filter(s => s.status === 'new').length}</span> yeni ders eklenecek,{' '}
                <span className="font-medium">{subjectImportPreview.filter(s => s.status === 'exists').length}</span> ders atlanacak
              </>
            )}
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setIsSubjectImportModalOpen(false)}
              variant="secondary"
            >
              İptal
            </Button>
            <Button
              onClick={importSubjects}
              variant="primary"
              disabled={isImporting || subjectImportPreview.length === 0 || subjectImportPreview.every(s => s.status === 'exists')}
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