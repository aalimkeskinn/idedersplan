import React, { useState } from 'react';
import { 
  Database, 
  Upload, 
  Download, 
  Trash2, 
  Users, 
  Building, 
  BookOpen, 
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  Settings,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import { Teacher, Class, Subject, EDUCATION_LEVELS } from '../types';
import Button from '../components/UI/Button';
import Select from '../components/UI/Select';
import ConfirmationModal from '../components/UI/ConfirmationModal';

// Classroom interface
interface Classroom {
  id: string;
  name: string;
  type: string;
  capacity: number;
  floor: string;
  building: string;
  equipment: string[];
  createdAt: Date;
}

const DataManagement = () => {
  const navigate = useNavigate();
  const { data: teachers, add: addTeacher, remove: removeAllTeachers } = useFirestore<Teacher>('teachers');
  const { data: classes, remove: removeAllClasses } = useFirestore<Class>('classes');
  const { data: subjects, add: addSubject, remove: removeAllSubjects } = useFirestore<Subject>('subjects');
  const { data: classrooms, remove: removeAllClassrooms } = useFirestore<Classroom>('classrooms');
  const { success, error, warning } = useToast();
  const { 
    confirmation, 
    showConfirmation, 
    hideConfirmation,
    confirmDelete 
  } = useConfirmation();

  // Separate CSV Import States for Teachers and Subjects
  const [teacherCsvFile, setTeacherCsvFile] = useState<File | null>(null);
  const [teacherCsvData, setTeacherCsvData] = useState<any[]>([]);
  const [teacherCsvHeaders, setTeacherCsvHeaders] = useState<string[]>([]);
  const [showTeacherPreview, setShowTeacherPreview] = useState(false);
  const [isProcessingTeachers, setIsProcessingTeachers] = useState(false);

  const [subjectCsvFile, setSubjectCsvFile] = useState<File | null>(null);
  const [subjectCsvData, setSubjectCsvData] = useState<any[]>([]);
  const [subjectCsvHeaders, setSubjectCsvHeaders] = useState<string[]>([]);
  const [showSubjectPreview, setShowSubjectPreview] = useState(false);
  const [isProcessingSubjects, setIsProcessingSubjects] = useState(false);

  const [defaultLevel, setDefaultLevel] = useState<'Anaokulu' | 'İlkokul' | 'Ortaokul'>('İlkokul');

  // FIXED: CSV parsing function with proper column handling
  const parseCSV = (text: string): { headers: string[], data: any[] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    // Parse headers - handle quoted fields and commas
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
    };

    const headers = parseCSVLine(lines[0]);
    const data = lines.slice(1).map((line, index) => {
      const values = parseCSVLine(line);
      const row: any = { _rowIndex: index + 1 };
      
      // Map each value to its corresponding header
      headers.forEach((header, headerIndex) => {
        row[header] = values[headerIndex] || '';
      });
      
      return row;
    });

    console.log('📊 CSV Parsed:', { headers, dataCount: data.length, sampleRow: data[0] });
    return { headers, data };
  };

  // Handle Teacher CSV file selection
  const handleTeacherFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      error('❌ Geçersiz Dosya', 'Lütfen CSV dosyası seçin');
      return;
    }

    setTeacherCsvFile(file);
    setIsProcessingTeachers(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { headers, data } = parseCSV(text);
        
        if (headers.length === 0 || data.length === 0) {
          error('❌ Boş Dosya', 'CSV dosyası boş veya geçersiz format');
          return;
        }

        setTeacherCsvHeaders(headers);
        setTeacherCsvData(data);
        setShowTeacherPreview(true);
        
        success('✅ Öğretmen Dosyası Yüklendi', `${data.length} satır veri bulundu`);
      } catch (err) {
        console.error('CSV parsing error:', err);
        error('❌ Dosya Hatası', 'CSV dosyası okunamadı. Dosya formatını kontrol edin.');
      } finally {
        setIsProcessingTeachers(false);
      }
    };

    reader.onerror = () => {
      error('❌ Okuma Hatası', 'Dosya okunamadı');
      setIsProcessingTeachers(false);
    };

    reader.readAsText(file, 'UTF-8');
  };

  // Handle Subject CSV file selection
  const handleSubjectFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      error('❌ Geçersiz Dosya', 'Lütfen CSV dosyası seçin');
      return;
    }

    setSubjectCsvFile(file);
    setIsProcessingSubjects(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { headers, data } = parseCSV(text);
        
        if (headers.length === 0 || data.length === 0) {
          error('❌ Boş Dosya', 'CSV dosyası boş veya geçersiz format');
          return;
        }

        setSubjectCsvHeaders(headers);
        setSubjectCsvData(data);
        setShowSubjectPreview(true);
        
        success('✅ Ders Dosyası Yüklendi', `${data.length} satır veri bulundu`);
      } catch (err) {
        console.error('CSV parsing error:', err);
        error('❌ Dosya Hatası', 'CSV dosyası okunamadı. Dosya formatını kontrol edin.');
      } finally {
        setIsProcessingSubjects(false);
      }
    };

    reader.onerror = () => {
      error('❌ Okuma Hatası', 'Dosya okunamadı');
      setIsProcessingSubjects(false);
    };

    reader.readAsText(file, 'UTF-8');
  };

  // FIXED: Validate and process teacher data with proper column mapping
  const validateTeacherData = (row: any): { isValid: boolean, teacher?: Omit<Teacher, 'id' | 'createdAt'>, errors: string[] } => {
    const errors: string[] = [];
    
    // Get values from specific columns (0, 1, 2)
    const name = row['Adı Soyadı'] || '';
    const branch = row['Branş'] || '';
    const level = row['Eğitim Seviyesi'] || '';

    console.log('🔍 Teacher validation:', { name, branch, level, row });

    // Validate name
    if (!name || name.length < 2) {
      errors.push('Ad Soyad gerekli (en az 2 karakter)');
    }

    // Validate branch
    if (!branch || branch.length < 2) {
      errors.push('Branş gerekli (en az 2 karakter)');
    }

    // Validate level
    let validLevel: 'Anaokulu' | 'İlkokul' | 'Ortaokul' = defaultLevel;
    if (level) {
      const normalizedLevel = level.toLowerCase().trim();
      if (normalizedLevel.includes('anaokul') || normalizedLevel.includes('kindergarten')) {
        validLevel = 'Anaokulu';
      } else if (normalizedLevel.includes('ilkokul') || normalizedLevel.includes('primary')) {
        validLevel = 'İlkokul';
      } else if (normalizedLevel.includes('ortaokul') || normalizedLevel.includes('middle') || normalizedLevel.includes('secondary')) {
        validLevel = 'Ortaokul';
      }
    }

    // Check for duplicates
    const existingTeacher = teachers.find(t => 
      t.name.toLowerCase() === name.toLowerCase() && 
      t.branch.toLowerCase() === branch.toLowerCase()
    );
    
    if (existingTeacher) {
      errors.push('Bu öğretmen zaten mevcut');
    }

    if (errors.length === 0) {
      return {
        isValid: true,
        teacher: {
          name,
          branch,
          level: validLevel
        },
        errors: []
      };
    }

    return { isValid: false, errors };
  };

  // FIXED: Validate and process subject data with proper column mapping
  const validateSubjectData = (row: any): { isValid: boolean, subject?: Omit<Subject, 'id' | 'createdAt'>, errors: string[] } => {
    const errors: string[] = [];
    
    // Get values from specific columns (0, 1, 2, 3)
    const name = row['Ders Adı'] || '';
    const branch = row['Branş'] || '';
    const level = row['Eğitim Seviyesi'] || '';
    const hoursStr = row['Haftalık Ders Saati'] || '30';

    console.log('🔍 Subject validation:', { name, branch, level, hoursStr, row });

    // Validate name
    if (!name || name.length < 2) {
      errors.push('Ders adı gerekli (en az 2 karakter)');
    }

    // Use name as branch if branch is empty
    const finalBranch = branch || name;

    // Validate level
    let validLevel: 'Anaokulu' | 'İlkokul' | 'Ortaokul' = defaultLevel;
    if (level) {
      const normalizedLevel = level.toLowerCase().trim();
      if (normalizedLevel.includes('anaokul') || normalizedLevel.includes('kindergarten')) {
        validLevel = 'Anaokulu';
      } else if (normalizedLevel.includes('ilkokul') || normalizedLevel.includes('primary')) {
        validLevel = 'İlkokul';
      } else if (normalizedLevel.includes('ortaokul') || normalizedLevel.includes('middle') || normalizedLevel.includes('secondary')) {
        validLevel = 'Ortaokul';
      }
    }

    // FIXED: Parse hours with default value of 30
    let weeklyHours = 30; // Default to 30 hours
    if (hoursStr) {
      const parsedHours = parseInt(hoursStr);
      if (!isNaN(parsedHours) && parsedHours > 0 && parsedHours <= 50) {
        weeklyHours = parsedHours;
      }
    }

    // Check for duplicates
    const existingSubject = subjects.find(s => 
      s.name.toLowerCase() === name.toLowerCase() && 
      s.branch.toLowerCase() === finalBranch.toLowerCase() &&
      s.level === validLevel
    );
    
    if (existingSubject) {
      errors.push('Bu ders zaten mevcut');
    }

    if (errors.length === 0) {
      return {
        isValid: true,
        subject: {
          name,
          branch: finalBranch,
          level: validLevel,
          weeklyHours
        },
        errors: []
      };
    }

    return { isValid: false, errors };
  };

  // Process Teachers CSV import
  const handleTeacherImport = async () => {
    if (!teacherCsvData.length) return;

    setIsProcessingTeachers(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const row of teacherCsvData) {
        const validation = validateTeacherData(row);
        if (validation.isValid && validation.teacher) {
          try {
            await addTeacher(validation.teacher);
            successCount++;
          } catch (err) {
            errorCount++;
            errors.push(`Satır ${row._rowIndex}: Kayıt hatası`);
          }
        } else {
          errorCount++;
          errors.push(`Satır ${row._rowIndex}: ${validation.errors.join(', ')}`);
        }
      }

      if (successCount > 0) {
        success('✅ Öğretmen İçe Aktarma Tamamlandı', `${successCount} öğretmen başarıyla eklendi`);
      }

      if (errorCount > 0) {
        warning('⚠️ Bazı Öğretmenler Atlandı', `${errorCount} öğretmen kaydı işlenemedi`);
      }

      // Reset states
      setTeacherCsvFile(null);
      setTeacherCsvData([]);
      setTeacherCsvHeaders([]);
      setShowTeacherPreview(false);

    } catch (err) {
      error('❌ Öğretmen İçe Aktarma Hatası', 'Veriler işlenirken bir hata oluştu');
    } finally {
      setIsProcessingTeachers(false);
    }
  };

  // Process Subjects CSV import
  const handleSubjectImport = async () => {
    if (!subjectCsvData.length) return;

    setIsProcessingSubjects(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const row of subjectCsvData) {
        const validation = validateSubjectData(row);
        if (validation.isValid && validation.subject) {
          try {
            await addSubject(validation.subject);
            successCount++;
          } catch (err) {
            errorCount++;
            errors.push(`Satır ${row._rowIndex}: Kayıt hatası`);
          }
        } else {
          errorCount++;
          errors.push(`Satır ${row._rowIndex}: ${validation.errors.join(', ')}`);
        }
      }

      if (successCount > 0) {
        success('✅ Ders İçe Aktarma Tamamlandı', `${successCount} ders başarıyla eklendi`);
      }

      if (errorCount > 0) {
        warning('⚠️ Bazı Dersler Atlandı', `${errorCount} ders kaydı işlenemedi`);
      }

      // Reset states
      setSubjectCsvFile(null);
      setSubjectCsvData([]);
      setSubjectCsvHeaders([]);
      setShowSubjectPreview(false);

    } catch (err) {
      error('❌ Ders İçe Aktarma Hatası', 'Veriler işlenirken bir hata oluştu');
    } finally {
      setIsProcessingSubjects(false);
    }
  };

  // Clear CSV data
  const clearTeacherCSVData = () => {
    setTeacherCsvFile(null);
    setTeacherCsvData([]);
    setTeacherCsvHeaders([]);
    setShowTeacherPreview(false);
  };

  const clearSubjectCSVData = () => {
    setSubjectCsvFile(null);
    setSubjectCsvData([]);
    setSubjectCsvHeaders([]);
    setShowSubjectPreview(false);
  };

  // Delete all data functions
  const handleDeleteAllTeachers = () => {
    confirmDelete(
      `${teachers.length} Öğretmen`,
      async () => {
        try {
          for (const teacher of teachers) {
            await removeAllTeachers(teacher.id);
          }
          success('🗑️ Tümü Silindi', 'Tüm öğretmenler başarıyla silindi');
        } catch (err) {
          error('❌ Silme Hatası', 'Öğretmenler silinirken hata oluştu');
        }
      }
    );
  };

  const handleDeleteAllClasses = () => {
    confirmDelete(
      `${classes.length} Sınıf`,
      async () => {
        try {
          for (const classItem of classes) {
            await removeAllClasses(classItem.id);
          }
          success('🗑️ Tümü Silindi', 'Tüm sınıflar başarıyla silindi');
        } catch (err) {
          error('❌ Silme Hatası', 'Sınıflar silinirken hata oluştu');
        }
      }
    );
  };

  const handleDeleteAllSubjects = () => {
    confirmDelete(
      `${subjects.length} Ders`,
      async () => {
        try {
          for (const subject of subjects) {
            await removeAllSubjects(subject.id);
          }
          success('🗑️ Tümü Silindi', 'Tüm dersler başarıyla silindi');
        } catch (err) {
          error('❌ Silme Hatası', 'Dersler silinirken hata oluştu');
        }
      }
    );
  };

  const handleDeleteAllClassrooms = () => {
    confirmDelete(
      `${classrooms.length} Derslik`,
      async () => {
        try {
          for (const classroom of classrooms) {
            await removeAllClassrooms(classroom.id);
          }
          success('🗑️ Tümü Silindi', 'Tüm derslikler başarıyla silindi');
        } catch (err) {
          error('❌ Silme Hatası', 'Derslikler silinirken hata oluştu');
        }
      }
    );
  };

  const levelOptions = EDUCATION_LEVELS.map(level => ({
    value: level,
    label: level
  }));

  return (
    <div className="container-mobile">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-6 mb-8 shadow-lg">
        <div className="flex items-center">
          <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div className="ml-4">
            <h1 className="text-2xl font-bold">Veri Yönetimi</h1>
            <p className="text-white/80 mt-1">Sistem verilerini yönetin ve CSV dosyalarını içe aktarın</p>
          </div>
        </div>
      </div>

      {/* Data Statistics - Improved Corporate Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Teachers Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-blue-500 h-2"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{teachers.length}</p>
                <p className="text-sm text-gray-600">Öğretmen</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button
                onClick={() => navigate('/teachers')}
                variant="secondary"
                size="sm"
                icon={Eye}
              >
                Yönet
              </Button>
              {teachers.length > 0 && (
                <Button
                  onClick={handleDeleteAllTeachers}
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                >
                  Tümünü Sil
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Classes Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-emerald-500 h-2"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Building className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{classes.length}</p>
                <p className="text-sm text-gray-600">Sınıf</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button
                onClick={() => navigate('/classes')}
                variant="secondary"
                size="sm"
                icon={Eye}
              >
                Yönet
              </Button>
              {classes.length > 0 && (
                <Button
                  onClick={handleDeleteAllClasses}
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                >
                  Tümünü Sil
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Subjects Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-indigo-500 h-2"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{subjects.length}</p>
                <p className="text-sm text-gray-600">Ders</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button
                onClick={() => navigate('/subjects')}
                variant="secondary"
                size="sm"
                icon={Eye}
              >
                Yönet
              </Button>
              {subjects.length > 0 && (
                <Button
                  onClick={handleDeleteAllSubjects}
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                >
                  Tümünü Sil
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Classrooms Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-orange-500 h-2"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <MapPin className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{classrooms.length}</p>
                <p className="text-sm text-gray-600">Derslik</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button
                onClick={() => navigate('/classrooms')}
                variant="secondary"
                size="sm"
                icon={Eye}
              >
                Yönet
              </Button>
              {classrooms.length > 0 && (
                <Button
                  onClick={handleDeleteAllClassrooms}
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                >
                  Tümünü Sil
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs for CSV Import */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-8">
        <div className="flex border-b border-gray-200">
          <div className="px-6 py-4 font-semibold text-purple-700 border-b-2 border-purple-500">
            CSV İçe Aktarma
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Teacher CSV Import Section */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-blue-900 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-700" />
                    Öğretmen İçe Aktarma
                  </h2>
                  <p className="text-blue-700 text-sm mt-1">CSV dosyasından öğretmen verilerini içe aktarın</p>
                </div>
                {showTeacherPreview && (
                  <Button
                    onClick={clearTeacherCSVData}
                    variant="secondary"
                    size="sm"
                    icon={X}
                  >
                    Temizle
                  </Button>
                )}
              </div>

              <div className="mb-4">
                <Select
                  label="Varsayılan Eğitim Seviyesi"
                  value={defaultLevel}
                  onChange={(value) => setDefaultLevel(value as 'Anaokulu' | 'İlkokul' | 'Ortaokul')}
                  options={levelOptions}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-blue-800 mb-2">
                  Öğretmen CSV Dosyası Seçin
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleTeacherFileSelect}
                  className="w-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white"
                />
                {teacherCsvFile && (
                  <p className="text-sm text-blue-600 mt-2">
                    ✅ Dosya seçildi: {teacherCsvFile.name}
                  </p>
                )}
              </div>

              {/* CSV Format Guide for Teachers */}
              <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
                <h4 className="font-semibold text-blue-800 mb-2">📚 Öğretmen CSV Formatı</h4>
                <p className="text-sm text-blue-700 mb-2"><strong>Sütun Sırası:</strong></p>
                <ol className="text-sm text-blue-600 space-y-1 list-decimal list-inside">
                  <li><strong>Adı Soyadı</strong> - Öğretmenin tam adı</li>
                  <li><strong>Branş</strong> - Öğretmenin branşı</li>
                  <li><strong>Eğitim Seviyesi</strong> - Anaokulu/İlkokul/Ortaokul</li>
                </ol>
                <p className="text-xs text-blue-500 mt-2">
                  <strong>Örnek:</strong> Ahmet Yılmaz, Matematik, İlkokul
                </p>
              </div>

              {/* Teacher CSV Preview */}
              {showTeacherPreview && teacherCsvData.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-md font-semibold text-blue-900 mb-3">
                    Öğretmen Önizlemesi ({teacherCsvData.length} satır)
                  </h3>
                  
                  <div className="overflow-x-auto border border-blue-200 rounded-lg">
                    <table className="min-w-full divide-y divide-blue-200">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-700 uppercase">
                            Satır
                          </th>
                          {teacherCsvHeaders.map((header, index) => (
                            <th key={index} className="px-4 py-3 text-left text-xs font-medium text-blue-700 uppercase">
                              {header}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-700 uppercase">
                            Durum
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-blue-100">
                        {teacherCsvData.slice(0, 10).map((row, index) => {
                          const validation = validateTeacherData(row);
                          
                          return (
                            <tr key={index} className={validation.isValid ? 'bg-green-50' : 'bg-red-50'}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {row._rowIndex}
                              </td>
                              {teacherCsvHeaders.map((header, headerIndex) => (
                                <td key={headerIndex} className="px-4 py-3 text-sm text-gray-900">
                                  {row[header] || '-'}
                                </td>
                              ))}
                              <td className="px-4 py-3 text-sm">
                                {validation.isValid ? (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Geçerli
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Hatalı
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {teacherCsvData.length > 10 && (
                    <p className="text-sm text-blue-600 mt-2">
                      İlk 10 satır gösteriliyor. Toplam {teacherCsvData.length} satır var.
                    </p>
                  )}

                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={handleTeacherImport}
                      variant="primary"
                      disabled={isProcessingTeachers}
                      icon={Upload}
                    >
                      {isProcessingTeachers ? 'İçe Aktarılıyor...' : 'Öğretmenleri İçe Aktar'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Subject CSV Import Section */}
            <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-indigo-900 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-indigo-700" />
                    Ders İçe Aktarma
                  </h2>
                  <p className="text-indigo-700 text-sm mt-1">CSV dosyasından ders verilerini içe aktarın</p>
                </div>
                {showSubjectPreview && (
                  <Button
                    onClick={clearSubjectCSVData}
                    variant="secondary"
                    size="sm"
                    icon={X}
                  >
                    Temizle
                  </Button>
                )}
              </div>

              <div className="mb-4">
                <Select
                  label="Varsayılan Eğitim Seviyesi"
                  value={defaultLevel}
                  onChange={(value) => setDefaultLevel(value as 'Anaokulu' | 'İlkokul' | 'Ortaokul')}
                  options={levelOptions}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-indigo-800 mb-2">
                  Ders CSV Dosyası Seçin
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleSubjectFileSelect}
                  className="w-full px-4 py-3 border-2 border-dashed border-indigo-300 rounded-lg hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white"
                />
                {subjectCsvFile && (
                  <p className="text-sm text-indigo-600 mt-2">
                    ✅ Dosya seçildi: {subjectCsvFile.name}
                  </p>
                )}
              </div>

              {/* CSV Format Guide for Subjects */}
              <div className="bg-white rounded-lg p-4 border border-indigo-200 mb-4">
                <h4 className="font-semibold text-indigo-800 mb-2">📚 Ders CSV Formatı</h4>
                <p className="text-sm text-indigo-700 mb-2"><strong>Sütun Sırası:</strong></p>
                <ol className="text-sm text-indigo-600 space-y-1 list-decimal list-inside">
                  <li><strong>Ders Adı</strong> - Dersin adı</li>
                  <li><strong>Branş</strong> - Dersin branşı</li>
                  <li><strong>Eğitim Seviyesi</strong> - Anaokulu/İlkokul/Ortaokul</li>
                  <li><strong>Haftalık Ders Saati</strong> - Varsayılan: 30</li>
                </ol>
                <p className="text-xs text-indigo-500 mt-2">
                  <strong>Örnek:</strong> Matematik, Matematik, İlkokul, 5
                </p>
              </div>

              {/* Subject CSV Preview */}
              {showSubjectPreview && subjectCsvData.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-md font-semibold text-indigo-900 mb-3">
                    Ders Önizlemesi ({subjectCsvData.length} satır)
                  </h3>
                  
                  <div className="overflow-x-auto border border-indigo-200 rounded-lg">
                    <table className="min-w-full divide-y divide-indigo-200">
                      <thead className="bg-indigo-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase">
                            Satır
                          </th>
                          {subjectCsvHeaders.map((header, index) => (
                            <th key={index} className="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase">
                              {header}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase">
                            Durum
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-indigo-100">
                        {subjectCsvData.slice(0, 10).map((row, index) => {
                          const validation = validateSubjectData(row);
                          
                          return (
                            <tr key={index} className={validation.isValid ? 'bg-green-50' : 'bg-red-50'}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {row._rowIndex}
                              </td>
                              {subjectCsvHeaders.map((header, headerIndex) => (
                                <td key={headerIndex} className="px-4 py-3 text-sm text-gray-900">
                                  {row[header] || '-'}
                                </td>
                              ))}
                              <td className="px-4 py-3 text-sm">
                                {validation.isValid ? (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Geçerli
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Hatalı
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {subjectCsvData.length > 10 && (
                    <p className="text-sm text-indigo-600 mt-2">
                      İlk 10 satır gösteriliyor. Toplam {subjectCsvData.length} satır var.
                    </p>
                  )}

                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={handleSubjectImport}
                      variant="primary"
                      disabled={isProcessingSubjects}
                      icon={Upload}
                    >
                      {isProcessingSubjects ? 'İçe Aktarılıyor...' : 'Dersleri İçe Aktar'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSV Format Guide */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-purple-600" />
          CSV İçe Aktarma Rehberi
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Teachers Format */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Öğretmen CSV Formatı
            </h4>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-700 mb-2"><strong>Sütun Sırası:</strong></p>
              <ol className="text-sm text-blue-600 space-y-1 list-decimal list-inside">
                <li><strong>Adı Soyadı</strong> - Öğretmenin tam adı</li>
                <li><strong>Branş</strong> - Öğretmenin branşı</li>
                <li><strong>Eğitim Seviyesi</strong> - Anaokulu/İlkokul/Ortaokul</li>
              </ol>
              <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-100 text-xs text-blue-700">
                <p className="font-semibold">Örnek CSV içeriği:</p>
                <pre className="mt-1 whitespace-pre-wrap">
                  Adı Soyadı,Branş,Eğitim Seviyesi
                  Ahmet Yılmaz,Matematik,İlkokul
                  Ayşe Demir,Türkçe,Ortaokul
                  Mehmet Kaya,Fen Bilgisi,İlkokul
                </pre>
              </div>
            </div>
          </div>

          {/* Subjects Format */}
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <h4 className="font-semibold text-indigo-800 mb-2 flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              Ders CSV Formatı
            </h4>
            <div className="bg-white rounded-lg p-4 border border-indigo-200">
              <p className="text-sm text-indigo-700 mb-2"><strong>Sütun Sırası:</strong></p>
              <ol className="text-sm text-indigo-600 space-y-1 list-decimal list-inside">
                <li><strong>Ders Adı</strong> - Dersin adı</li>
                <li><strong>Branş</strong> - Dersin branşı</li>
                <li><strong>Eğitim Seviyesi</strong> - Anaokulu/İlkokul/Ortaokul</li>
                <li><strong>Haftalık Ders Saati</strong> - Varsayılan: 30</li>
              </ol>
              <div className="mt-3 p-2 bg-indigo-50 rounded border border-indigo-100 text-xs text-indigo-700">
                <p className="font-semibold">Örnek CSV içeriği:</p>
                <pre className="mt-1 whitespace-pre-wrap">
                  Ders Adı,Branş,Eğitim Seviyesi,Haftalık Ders Saati
                  Matematik,Matematik,İlkokul,5
                  Türkçe,Türkçe,Ortaokul,6
                  Fen Bilgisi,Fen Bilgisi,İlkokul,4
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            CSV Hazırlama İpuçları
          </h4>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Excel'den "CSV UTF-8" formatında kaydedin</li>
            <li>Türkçe karakterler desteklenir (ğ, ü, ş, ı, ö, ç)</li>
            <li>Sütun isimleri tam olarak yukarıdaki gibi olmalıdır</li>
            <li>Mevcut kayıtlar otomatik tespit edilir ve atlanır</li>
            <li>Eğitim seviyesi belirtilmezse varsayılan değer kullanılır</li>
            <li>Ders saati belirtilmezse 30 saat varsayılan değer olarak kullanılır</li>
          </ul>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Plus className="w-5 h-5 mr-2 text-purple-600" />
          Hızlı İşlemler
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={() => navigate('/teachers')}
            variant="secondary"
            className="w-full"
            icon={Users}
          >
            Öğretmen Ekle
          </Button>
          
          <Button
            onClick={() => navigate('/classes')}
            variant="secondary"
            className="w-full"
            icon={Building}
          >
            Sınıf Ekle
          </Button>
          
          <Button
            onClick={() => navigate('/subjects')}
            variant="secondary"
            className="w-full"
            icon={BookOpen}
          >
            Ders Ekle
          </Button>
          
          <Button
            onClick={() => navigate('/classrooms')}
            variant="secondary"
            className="w-full"
            icon={MapPin}
          >
            Derslik Ekle
          </Button>
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