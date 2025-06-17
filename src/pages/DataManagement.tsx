import React, { useState } from 'react';
import { 
  Database, 
  Upload, 
  Download, 
  Trash2, 
  Users, 
  Building, 
  BookOpen, 
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  MapPin,
  BarChart3,
  Settings,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import { Teacher, Class, Subject, Schedule, EDUCATION_LEVELS } from '../types';
import Button from '../components/UI/Button';
import Select from '../components/UI/Select';
import ConfirmationModal from '../components/UI/ConfirmationModal';

// CSV parsing utility
const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.split('\n').filter(line => line.trim());
  return lines.map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  });
};

interface CSVPreviewData {
  headers: string[];
  rows: string[][];
  validRows: boolean[];
  existingRows: boolean[];
}

const DataManagement = () => {
  const navigate = useNavigate();
  const { data: teachers, add: addTeacher, remove: removeTeacher } = useFirestore<Teacher>('teachers');
  const { data: classes, remove: removeClass } = useFirestore<Class>('classes');
  const { data: subjects, add: addSubject, remove: removeSubject } = useFirestore<Subject>('subjects');
  const { data: schedules, remove: removeSchedule } = useFirestore<Schedule>('schedules');
  const { success, error, warning } = useToast();
  const { 
    confirmation, 
    showConfirmation, 
    hideConfirmation,
    confirmDelete 
  } = useConfirmation();

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVPreviewData | null>(null);
  const [importType, setImportType] = useState<'teachers' | 'subjects'>('teachers');
  const [defaultLevel, setDefaultLevel] = useState<'Anaokulu' | 'İlkokul' | 'Ortaokul'>('İlkokul');
  const [defaultWeeklyHours, setDefaultWeeklyHours] = useState(4);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Handle CSV file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      error('❌ Geçersiz Dosya', 'Lütfen CSV dosyası seçin');
      return;
    }

    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      try {
        const parsedData = parseCSV(csvText);
        
        if (parsedData.length < 2) {
          error('❌ Geçersiz CSV', 'CSV dosyası en az başlık satırı ve bir veri satırı içermelidir');
          return;
        }

        const headers = parsedData[0];
        const rows = parsedData.slice(1);
        
        // Validate and check existing data
        const validRows: boolean[] = [];
        const existingRows: boolean[] = [];
        
        rows.forEach(row => {
          if (importType === 'teachers') {
            const isValid = row[0] && row[0].trim().length > 0; // Name is required
            const exists = teachers.some(t => t.name.toLowerCase() === row[0]?.toLowerCase());
            validRows.push(isValid);
            existingRows.push(exists);
          } else {
            const isValid = row[0] && row[0].trim().length > 0; // Subject name is required
            const weeklyHours = parseInt(row[3]) || defaultWeeklyHours;
            const isValidHours = weeklyHours >= 1 && weeklyHours <= 30; // FIXED: 1-30 range
            const exists = subjects.some(s => 
              s.name.toLowerCase() === row[0]?.toLowerCase() && 
              s.level === (row[2] || defaultLevel)
            );
            validRows.push(isValid && isValidHours);
            existingRows.push(exists);
          }
        });

        setCsvPreview({
          headers,
          rows,
          validRows,
          existingRows
        });
        
      } catch (err) {
        error('❌ CSV Okuma Hatası', 'CSV dosyası okunamadı. Dosya formatını kontrol edin.');
      }
    };
    
    reader.readAsText(file, 'UTF-8');
  };

  // Import CSV data
  const handleImportCSV = async () => {
    if (!csvPreview) return;

    setIsImporting(true);
    
    try {
      let importedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < csvPreview.rows.length; i++) {
        const row = csvPreview.rows[i];
        const isValid = csvPreview.validRows[i];
        const exists = csvPreview.existingRows[i];

        if (!isValid || exists) {
          skippedCount++;
          continue;
        }

        if (importType === 'teachers') {
          const teacherData = {
            name: row[0]?.trim() || '',
            branch: row[1]?.trim() || 'Genel',
            level: (row[2]?.trim() as 'Anaokulu' | 'İlkokul' | 'Ortaokul') || defaultLevel
          };

          await addTeacher(teacherData as Omit<Teacher, 'id' | 'createdAt'>);
          importedCount++;
        } else {
          const weeklyHours = parseInt(row[3]) || defaultWeeklyHours;
          
          // FIXED: Validate weekly hours range 1-30
          if (weeklyHours < 1 || weeklyHours > 30) {
            skippedCount++;
            continue;
          }

          const subjectData = {
            name: row[0]?.trim() || '',
            branch: row[1]?.trim() || row[0]?.trim() || '',
            level: (row[2]?.trim() as 'Anaokulu' | 'İlkokul' | 'Ortaokul') || defaultLevel,
            weeklyHours: weeklyHours
          };

          await addSubject(subjectData as Omit<Subject, 'id' | 'createdAt'>);
          importedCount++;
        }
      }

      if (importedCount > 0) {
        success('✅ İçe Aktarma Tamamlandı', 
          `${importedCount} ${importType === 'teachers' ? 'öğretmen' : 'ders'} başarıyla eklendi${skippedCount > 0 ? `, ${skippedCount} kayıt atlandı` : ''}`
        );
      } else {
        warning('⚠️ Hiçbir Veri Eklenmedi', 'Tüm veriler zaten mevcut veya geçersiz');
      }

      // Reset form
      setCsvFile(null);
      setCsvPreview(null);
      const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err) {
      error('❌ İçe Aktarma Hatası', 'Veriler içe aktarılırken bir hata oluştu');
    } finally {
      setIsImporting(false);
    }
  };

  // Delete all data
  const handleDeleteAllData = () => {
    const totalItems = teachers.length + classes.length + subjects.length + schedules.length;
    
    if (totalItems === 0) {
      warning('⚠️ Silinecek Veri Yok', 'Sistemde silinecek veri bulunamadı');
      return;
    }

    confirmDelete(
      `Tüm Sistem Verileri (${totalItems} kayıt)`,
      async () => {
        setIsDeletingAll(true);
        
        try {
          let deletedCount = 0;
          
          // Delete all schedules first
          for (const schedule of schedules) {
            try {
              await removeSchedule(schedule.id);
              deletedCount++;
            } catch (err) {
              console.error(`Schedule delete error: ${schedule.id}`, err);
            }
          }

          // Delete all subjects
          for (const subject of subjects) {
            try {
              await removeSubject(subject.id);
              deletedCount++;
            } catch (err) {
              console.error(`Subject delete error: ${subject.id}`, err);
            }
          }

          // Delete all classes
          for (const classItem of classes) {
            try {
              await removeClass(classItem.id);
              deletedCount++;
            } catch (err) {
              console.error(`Class delete error: ${classItem.id}`, err);
            }
          }

          // Delete all teachers
          for (const teacher of teachers) {
            try {
              await removeTeacher(teacher.id);
              deletedCount++;
            } catch (err) {
              console.error(`Teacher delete error: ${teacher.id}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Tüm Veriler Silindi', `${deletedCount} kayıt başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir veri silinemedi');
          }

        } catch (err) {
          console.error('Bulk delete error:', err);
          error('❌ Silme Hatası', 'Veriler silinirken bir hata oluştu');
        } finally {
          setIsDeletingAll(false);
        }
      }
    );
  };

  const levelOptions = EDUCATION_LEVELS.map(level => ({
    value: level,
    label: level
  }));

  const weeklyHoursOptions = Array.from({ length: 30 }, (_, i) => ({
    value: (i + 1).toString(),
    label: `${i + 1} saat`
  }));

  const getRowStatusColor = (index: number) => {
    if (!csvPreview) return '';
    
    const isValid = csvPreview.validRows[index];
    const exists = csvPreview.existingRows[index];
    
    if (!isValid) return 'bg-red-50 border-red-200';
    if (exists) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  const getRowStatusIcon = (index: number) => {
    if (!csvPreview) return null;
    
    const isValid = csvPreview.validRows[index];
    const exists = csvPreview.existingRows[index];
    
    if (!isValid) return <X className="w-4 h-4 text-red-600" />;
    if (exists) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  const validNewRowsCount = csvPreview ? 
    csvPreview.validRows.filter((valid, index) => valid && !csvPreview.existingRows[index]).length : 0;

  return (
    <div className="container-mobile">
      {/* Header */}
      <div className="header-mobile">
        <div className="flex items-center">
          <Database className="w-8 h-8 text-purple-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">Veri Yönetimi</h1>
            <p className="text-responsive-sm text-gray-600">Sistem verilerini yönetin ve CSV dosyalarından toplu veri aktarın</p>
          </div>
        </div>
        <div className="button-group-mobile">
          <Button
            onClick={() => navigate('/classrooms')}
            icon={MapPin}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            Derslik Yönetimi
          </Button>
        </div>
      </div>

      {/* Data Statistics - Improved Design */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <BarChart3 className="w-6 h-6 text-purple-600 mr-3" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Veri İstatistikleri</h2>
              <p className="text-sm text-gray-600 mt-1">Sistemdeki toplam veri miktarları</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => window.location.reload()}
              icon={RefreshCw}
              variant="secondary"
              size="sm"
            >
              Yenile
            </Button>
            {(teachers.length + classes.length + subjects.length + schedules.length) > 0 && (
              <Button
                onClick={handleDeleteAllData}
                icon={Trash2}
                variant="danger"
                disabled={isDeletingAll}
                size="sm"
              >
                {isDeletingAll ? 'Siliniyor...' : 'Tümünü Sil'}
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Teachers Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-700">{teachers.length}</div>
                <div className="text-sm text-blue-600">Öğretmen</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button
                onClick={() => navigate('/teachers')}
                variant="secondary"
                size="sm"
                className="bg-white/80 hover:bg-white text-blue-700 border-blue-200"
              >
                Yönet
              </Button>
              <Button
                onClick={() => navigate('/teachers')}
                icon={Eye}
                variant="secondary"
                size="sm"
                className="bg-white/80 hover:bg-white text-blue-700 border-blue-200"
              >
                Görüntüle
              </Button>
            </div>
          </div>

          {/* Classes Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500 rounded-lg">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-700">{classes.length}</div>
                <div className="text-sm text-emerald-600">Sınıf</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button
                onClick={() => navigate('/classes')}
                variant="secondary"
                size="sm"
                className="bg-white/80 hover:bg-white text-emerald-700 border-emerald-200"
              >
                Yönet
              </Button>
              <Button
                onClick={() => navigate('/classes')}
                icon={Eye}
                variant="secondary"
                size="sm"
                className="bg-white/80 hover:bg-white text-emerald-700 border-emerald-200"
              >
                Görüntüle
              </Button>
            </div>
          </div>

          {/* Subjects Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-500 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-700">{subjects.length}</div>
                <div className="text-sm text-indigo-600">Ders</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button
                onClick={() => navigate('/subjects')}
                variant="secondary"
                size="sm"
                className="bg-white/80 hover:bg-white text-indigo-700 border-indigo-200"
              >
                Yönet
              </Button>
              <Button
                onClick={() => navigate('/subjects')}
                icon={Eye}
                variant="secondary"
                size="sm"
                className="bg-white/80 hover:bg-white text-indigo-700 border-indigo-200"
              >
                Görüntüle
              </Button>
            </div>
          </div>

          {/* Schedules Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-700">{schedules.length}</div>
                <div className="text-sm text-purple-600">Program</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button
                onClick={() => navigate('/all-schedules')}
                variant="secondary"
                size="sm"
                className="bg-white/80 hover:bg-white text-purple-700 border-purple-200"
              >
                Yönet
              </Button>
              <Button
                onClick={() => navigate('/all-schedules')}
                icon={Eye}
                variant="secondary"
                size="sm"
                className="bg-white/80 hover:bg-white text-purple-700 border-purple-200"
              >
                Görüntüle
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Import Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center mb-6">
          <Upload className="w-6 h-6 text-green-600 mr-3" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">CSV İçe Aktarma</h2>
            <p className="text-sm text-gray-600 mt-1">Excel'den CSV formatında toplu veri aktarın</p>
          </div>
        </div>

        {/* Import Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İçe Aktarma Türü
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setImportType('teachers')}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  importType === 'teachers'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Users className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Öğretmenler</div>
              </button>
              <button
                onClick={() => setImportType('subjects')}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  importType === 'subjects'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <BookOpen className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Dersler</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV Dosyası Seç
            </label>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Default Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Select
            label="Varsayılan Eğitim Seviyesi"
            value={defaultLevel}
            onChange={(value) => setDefaultLevel(value as 'Anaokulu' | 'İlkokul' | 'Ortaokul')}
            options={levelOptions}
          />
          
          {importType === 'subjects' && (
            <Select
              label="Varsayılan Haftalık Ders Saati (1-30)"
              value={defaultWeeklyHours.toString()}
              onChange={(value) => setDefaultWeeklyHours(parseInt(value))}
              options={weeklyHoursOptions}
            />
          )}
        </div>

        {/* CSV Preview */}
        {csvPreview && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Veri Önizlemesi</h3>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-green-700">{validNewRowsCount} yeni kayıt</span>
                </div>
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mr-1" />
                  <span className="text-yellow-700">{csvPreview.existingRows.filter(Boolean).length} mevcut</span>
                </div>
                <div className="flex items-center">
                  <X className="w-4 h-4 text-red-600 mr-1" />
                  <span className="text-red-700">{csvPreview.validRows.filter(v => !v).length} geçersiz</span>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                      {csvPreview.headers.map((header, index) => (
                        <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {header}
                        </th>
                      ))}
                      {importType === 'subjects' && csvPreview.headers.length < 4 && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Haftalık Saat (Varsayılan)
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {csvPreview.rows.map((row, index) => (
                      <tr key={index} className={`${getRowStatusColor(index)} border-l-4`}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getRowStatusIcon(index)}
                        </td>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {cell || '-'}
                          </td>
                        ))}
                        {importType === 'subjects' && row.length < 4 && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {defaultWeeklyHours} saat
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                onClick={handleImportCSV}
                icon={Upload}
                variant="primary"
                disabled={validNewRowsCount === 0 || isImporting}
              >
                {isImporting ? 'İçe Aktarılıyor...' : `${validNewRowsCount} Kaydı İçe Aktar`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Import Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start">
          <FileText className="w-6 h-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">CSV İçe Aktarma Rehberi</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Teachers Guide */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Öğretmen Verisi
                </h4>
                <div className="space-y-2 text-sm text-blue-700">
                  <p><strong>Gerekli sütunlar:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><code>Adı Soyadı</code> - Öğretmenin tam adı (zorunlu)</li>
                    <li><code>Branşı</code> - Öğretmenin branşı (isteğe bağlı)</li>
                    <li><code>Eğitim Seviyesi</code> - Anaokulu/İlkokul/Ortaokul (isteğe bağlı)</li>
                  </ul>
                  <p className="mt-3"><strong>Örnek:</strong></p>
                  <div className="bg-blue-100 p-2 rounded text-xs font-mono">
                    Adı Soyadı,Branşı,Eğitim Seviyesi<br/>
                    Ahmet Yılmaz,Matematik,İlkokul<br/>
                    Ayşe Demir,Türkçe,Ortaokul
                  </div>
                </div>
              </div>

              {/* Subjects Guide */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Ders Verisi
                </h4>
                <div className="space-y-2 text-sm text-blue-700">
                  <p><strong>Gerekli sütunlar:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><code>Ders</code> - Ders adı (zorunlu)</li>
                    <li><code>Branş</code> - Ders branşı (isteğe bağlı)</li>
                    <li><code>Eğitim Seviyesi</code> - Anaokulu/İlkokul/Ortaokul (isteğe bağlı)</li>
                    <li><code>Ders Saati</code> - Haftalık ders saati 1-30 arası (isteğe bağlı)</li>
                  </ul>
                  <p className="mt-3"><strong>Örnek:</strong></p>
                  <div className="bg-blue-100 p-2 rounded text-xs font-mono">
                    Ders,Branş,Eğitim Seviyesi,Ders Saati<br/>
                    Matematik,Matematik,İlkokul,5<br/>
                    Türkçe,Türkçe,Ortaokul,6
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 İpucu:</strong> Excel'den CSV olarak dışa aktarırken "CSV UTF-8" formatını seçin. 
                Bu, Türkçe karakterlerin doğru görünmesini sağlar.
              </p>
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