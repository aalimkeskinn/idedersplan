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
  Settings
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

  // CSV Import States
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [importType, setImportType] = useState<'teachers' | 'subjects'>('teachers');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [defaultLevel, setDefaultLevel] = useState<'Anaokulu' | 'İlkokul' | 'Ortaokul'>('İlkokul');
  const [defaultHours, setDefaultHours] = useState(30);

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

  // Handle CSV file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      error('❌ Geçersiz Dosya', 'Lütfen CSV dosyası seçin');
      return;
    }

    setCsvFile(file);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { headers, data } = parseCSV(text);
        
        if (headers.length === 0 || data.length === 0) {
          error('❌ Boş Dosya', 'CSV dosyası boş veya geçersiz format');
          return;
        }

        setCsvHeaders(headers);
        setCsvData(data);
        setShowPreview(true);
        
        success('✅ Dosya Yüklendi', `${data.length} satır veri bulundu`);
      } catch (err) {
        console.error('CSV parsing error:', err);
        error('❌ Dosya Hatası', 'CSV dosyası okunamadı. Dosya formatını kontrol edin.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      error('❌ Okuma Hatası', 'Dosya okunamadı');
      setIsProcessing(false);
    };

    reader.readAsText(file, 'UTF-8');
  };

  // FIXED: Validate and process teacher data with proper column mapping
  const validateTeacherData = (row: any): { isValid: boolean, teacher?: Omit<Teacher, 'id' | 'createdAt'>, errors: string[] } => {
    const errors: string[] = [];
    
    // FIXED: More flexible column name matching
    const getColumnValue = (row: any, possibleNames: string[]): string => {
      for (const name of possibleNames) {
        const value = row[name];
        if (value && typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
      return '';
    };

    // Try different possible column names for each field
    const name = getColumnValue(row, [
      'Adı Soyadı', 'Ad Soyad', 'İsim', 'Name', 'Öğretmen', 'Teacher',
      'Adı_Soyadı', 'Ad_Soyad', 'adi_soyadi', 'ad_soyad'
    ]);
    
    const branch = getColumnValue(row, [
      'Branşı', 'Branş', 'Branch', 'Ders', 'Subject', 'Alan',
      'bransi', 'brans', 'branch'
    ]);
    
    const level = getColumnValue(row, [
      'Eğitim Seviyesi', 'Seviye', 'Level', 'Kademesi', 'Kademe',
      'egitim_seviyesi', 'seviye', 'level'
    ]);

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
    
    // FIXED: More flexible column name matching
    const getColumnValue = (row: any, possibleNames: string[]): string => {
      for (const name of possibleNames) {
        const value = row[name];
        if (value && typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
      return '';
    };

    // Try different possible column names for each field
    const name = getColumnValue(row, [
      'Ders', 'Ders Adı', 'Subject', 'Name', 'Konu',
      'ders', 'ders_adi', 'subject', 'name'
    ]);
    
    const branch = getColumnValue(row, [
      'Branş', 'Branşı', 'Branch', 'Alan', 'Field',
      'brans', 'bransi', 'branch', 'alan'
    ]);
    
    const level = getColumnValue(row, [
      'Eğitim Seviyesi', 'Seviye', 'Level', 'Kademesi', 'Kademe',
      'egitim_seviyesi', 'seviye', 'level'
    ]);
    
    const hoursStr = getColumnValue(row, [
      'Ders Saati', 'Haftalık Saat', 'Saat', 'Hours', 'Weekly Hours',
      'ders_saati', 'haftalik_saat', 'saat', 'hours'
    ]);

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
    let weeklyHours = defaultHours; // Default to 30 hours
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

  // Process CSV import
  const handleImport = async () => {
    if (!csvData.length) return;

    setIsProcessing(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      if (importType === 'teachers') {
        for (const row of csvData) {
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
      } else {
        for (const row of csvData) {
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
      }

      if (successCount > 0) {
        success('✅ İçe Aktarma Tamamlandı', `${successCount} kayıt başarıyla eklendi`);
      }

      if (errorCount > 0) {
        warning('⚠️ Bazı Kayıtlar Atlandı', `${errorCount} kayıt işlenemedi`);
      }

      // Reset states
      setCsvFile(null);
      setCsvData([]);
      setCsvHeaders([]);
      setShowPreview(false);

    } catch (err) {
      error('❌ İçe Aktarma Hatası', 'Veriler işlenirken bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear CSV data
  const clearCSVData = () => {
    setCsvFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setShowPreview(false);
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

  const importTypeOptions = [
    { value: 'teachers', label: 'Öğretmenler' },
    { value: 'subjects', label: 'Dersler' }
  ];

  return (
    <div className="container-mobile">
      {/* Header */}
      <div className="header-mobile">
        <div className="flex items-center">
          <Database className="w-8 h-8 text-purple-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">Veri Yönetimi</h1>
            <p className="text-responsive-sm text-gray-600">Sistem verilerini yönetin ve CSV dosyalarını içe aktarın</p>
          </div>
        </div>
      </div>

      {/* Data Statistics - Improved Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Teachers Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
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

        {/* Classes Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <Building className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
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

        {/* Subjects Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
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

        {/* Classrooms Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <MapPin className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{classrooms.length}</p>
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

      {/* CSV Import Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Upload className="w-6 h-6 mr-2 text-purple-600" />
              CSV İçe Aktarma
            </h2>
            <p className="text-gray-600 mt-1">Öğretmen ve ders verilerini toplu olarak içe aktarın</p>
          </div>
          {showPreview && (
            <Button
              onClick={clearCSVData}
              variant="secondary"
              icon={X}
            >
              Temizle
            </Button>
          )}
        </div>

        {/* Import Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Select
            label="İçe Aktarma Türü"
            value={importType}
            onChange={(value) => setImportType(value as 'teachers' | 'subjects')}
            options={importTypeOptions}
          />
          
          <Select
            label="Varsayılan Eğitim Seviyesi"
            value={defaultLevel}
            onChange={(value) => setDefaultLevel(value as 'Anaokulu' | 'İlkokul' | 'Ortaokul')}
            options={levelOptions}
          />
          
          {importType === 'subjects' && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Varsayılan Haftalık Ders Saati
              </label>
              <input
                type="number"
                value={defaultHours}
                onChange={(e) => setDefaultHours(parseInt(e.target.value) || 30)}
                min="1"
                max="50"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
              />
            </div>
          )}
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            CSV Dosyası Seçin
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
          />
          {csvFile && (
            <p className="text-sm text-green-600 mt-2">
              ✅ Dosya seçildi: {csvFile.name}
            </p>
          )}
        </div>

        {/* CSV Preview */}
        {showPreview && csvData.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Veri Önizlemesi ({csvData.length} satır)
            </h3>
            
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Satır
                    </th>
                    {csvHeaders.map((header, index) => (
                      <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {header}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {csvData.slice(0, 10).map((row, index) => {
                    const validation = importType === 'teachers' 
                      ? validateTeacherData(row)
                      : validateSubjectData(row);
                    
                    return (
                      <tr key={index} className={validation.isValid ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row._rowIndex}
                        </td>
                        {csvHeaders.map((header, headerIndex) => (
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
            
            {csvData.length > 10 && (
              <p className="text-sm text-gray-600 mt-2">
                İlk 10 satır gösteriliyor. Toplam {csvData.length} satır var.
              </p>
            )}

            <div className="flex justify-end mt-4">
              <Button
                onClick={handleImport}
                variant="primary"
                disabled={isProcessing}
                icon={Upload}
              >
                {isProcessing ? 'İçe Aktarılıyor...' : `${importType === 'teachers' ? 'Öğretmenleri' : 'Dersleri'} İçe Aktar`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Format Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          CSV İçe Aktarma Rehberi
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Teachers Format */}
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">📚 Öğretmen CSV Formatı</h4>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-700 mb-2"><strong>Gerekli Sütunlar:</strong></p>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• <strong>Adı Soyadı:</strong> Öğretmenin tam adı</li>
                <li>• <strong>Branşı:</strong> Öğretmenin branşı</li>
                <li>• <strong>Eğitim Seviyesi:</strong> Anaokulu/İlkokul/Ortaokul (isteğe bağlı)</li>
              </ul>
              <p className="text-xs text-blue-500 mt-2">
                <strong>Örnek:</strong> Ahmet Yılmaz, Matematik, İlkokul
              </p>
            </div>
          </div>

          {/* Subjects Format */}
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">📖 Ders CSV Formatı</h4>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-700 mb-2"><strong>Gerekli Sütunlar:</strong></p>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• <strong>Ders:</strong> Dersin adı</li>
                <li>• <strong>Branş:</strong> Dersin branşı (isteğe bağlı)</li>
                <li>• <strong>Eğitim Seviyesi:</strong> Anaokulu/İlkokul/Ortaokul (isteğe bağlı)</li>
                <li>• <strong>Ders Saati:</strong> Haftalık ders saati (varsayılan: 30)</li>
              </ul>
              <p className="text-xs text-blue-500 mt-2">
                <strong>Örnek:</strong> Matematik, Matematik, İlkokul, 5
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">💡 İpuçları</h4>
          <ul className="text-sm text-blue-600 space-y-1">
            <li>• Excel'den "CSV UTF-8" formatında kaydedin</li>
            <li>• Türkçe karakterler desteklenir (ğ, ü, ş, ı, ö, ç)</li>
            <li>• Sütun başlıkları esnek - farklı isimler kullanabilirsiniz</li>
            <li>• Mevcut kayıtlar otomatik tespit edilir ve atlanır</li>
            <li>• Eğitim seviyesi belirtilmezse varsayılan değer kullanılır</li>
            <li>• Ders saati belirtilmezse 30 saat varsayılan değer olarak kullanılır</li>
          </ul>
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