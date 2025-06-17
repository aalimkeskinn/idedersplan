import React from 'react';
import { Calendar, FileText, Clock } from 'lucide-react';
import { WizardData } from '../../types/wizard';
import Input from '../UI/Input';
import Select from '../UI/Select';

interface WizardStepBasicInfoProps {
  data: WizardData['basicInfo'];
  onUpdate: (data: WizardData['basicInfo']) => void;
}

const WizardStepBasicInfo: React.FC<WizardStepBasicInfoProps> = ({ data, onUpdate }) => {
  const currentYear = new Date().getFullYear();
  
  const academicYearOptions = [
    { value: `${currentYear}/${currentYear + 1}`, label: `${currentYear}/${currentYear + 1}` },
    { value: `${currentYear + 1}/${currentYear + 2}`, label: `${currentYear + 1}/${currentYear + 2}` },
    { value: `${currentYear - 1}/${currentYear}`, label: `${currentYear - 1}/${currentYear}` }
  ];

  const semesterOptions = [
    { value: 'Güz', label: 'Güz Dönemi' },
    { value: 'Bahar', label: 'Bahar Dönemi' },
    { value: 'Yaz', label: 'Yaz Dönemi' }
  ];

  const handleChange = (field: keyof WizardData['basicInfo'], value: string) => {
    onUpdate({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Program Temel Bilgileri</h3>
        <p className="text-gray-600">
          Oluşturacağınız ders programının temel bilgilerini girin
        </p>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto space-y-6">
        <Input
          label="Program Adı"
          value={data.name}
          onChange={(value) => handleChange('name', value)}
          placeholder="Örn: 2024-2025 Güz Dönemi Ders Programı"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Akademik Yıl"
            value={data.academicYear}
            onChange={(value) => handleChange('academicYear', value)}
            options={academicYearOptions}
            required
          />

          <Select
            label="Dönem"
            value={data.semester}
            onChange={(value) => handleChange('semester', value as 'Güz' | 'Bahar' | 'Yaz')}
            options={semesterOptions}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Başlangıç Tarihi"
            type="date"
            value={data.startDate}
            onChange={(value) => handleChange('startDate', value)}
          />

          <Input
            label="Bitiş Tarihi"
            type="date"
            value={data.endDate}
            onChange={(value) => handleChange('endDate', value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Açıklama <span className="text-gray-500">(İsteğe bağlı)</span>
          </label>
          <textarea
            value={data.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Program hakkında ek bilgiler..."
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
          />
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <h4 className="font-medium mb-1">💡 İpucu:</h4>
              <ul className="space-y-1 text-xs">
                <li>• Program adı benzersiz olmalıdır</li>
                <li>• Akademik yıl ve dönem bilgileri raporlarda kullanılır</li>
                <li>• Tarih aralığı program geçerlilik süresini belirler</li>
                <li>• Açıklama alanında özel notlarınızı ekleyebilirsiniz</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Preview */}
        {data.name && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Önizleme:</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Program:</strong> {data.name}</p>
              <p><strong>Dönem:</strong> {data.academicYear} {data.semester} Dönemi</p>
              {data.startDate && data.endDate && (
                <p><strong>Süre:</strong> {data.startDate} - {data.endDate}</p>
              )}
              {data.description && (
                <p><strong>Açıklama:</strong> {data.description}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WizardStepBasicInfo;