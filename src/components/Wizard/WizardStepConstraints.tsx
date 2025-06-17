import React, { useState } from 'react';
import { Clock, User, Building, BookOpen, Settings, AlertTriangle } from 'lucide-react';
import { Teacher, Class, Subject } from '../../types';
import { WizardData, TimeConstraint } from '../../types/wizard';
import Button from '../UI/Button';

interface WizardStepConstraintsProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  teachers: Teacher[];
  classes: Class[];
  subjects: Subject[];
}

const WizardStepConstraints: React.FC<WizardStepConstraintsProps> = ({
  data,
  onUpdate,
  teachers,
  classes,
  subjects
}) => {
  const [activeTab, setActiveTab] = useState<'global' | 'teachers' | 'classes' | 'subjects'>('global');
  const [selectedEntity, setSelectedEntity] = useState<string>('');

  const constraints = data.constraints || {};
  const globalConstraints = constraints.global || {};

  const handleGlobalConstraintChange = (key: string, value: any) => {
    onUpdate({
      constraints: {
        ...constraints,
        global: {
          ...globalConstraints,
          [key]: value
        }
      }
    });
  };

  const handleEntityConstraintChange = (entityType: string, entityId: string, day: string, period: string, status: 'available' | 'restricted' | 'unavailable') => {
    const entityConstraints = constraints[entityType] || {};
    const currentEntityConstraints = entityConstraints[entityId] || {};
    const dayConstraints = currentEntityConstraints[day] || {};

    onUpdate({
      constraints: {
        ...constraints,
        [entityType]: {
          ...entityConstraints,
          [entityId]: {
            ...currentEntityConstraints,
            [day]: {
              ...dayConstraints,
              [period]: status
            }
          }
        }
      }
    });
  };

  const getConstraintStatus = (entityType: string, entityId: string, day: string, period: string): 'available' | 'restricted' | 'unavailable' => {
    return constraints[entityType]?.[entityId]?.[day]?.[period] || 'available';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-300';
      case 'restricted': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'unavailable': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  const periods = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  const tabs = [
    { id: 'global', label: 'Genel Kurallar', icon: Settings },
    { id: 'teachers', label: 'Öğretmenler', icon: User },
    { id: 'classes', label: 'Sınıflar', icon: Building },
    { id: 'subjects', label: 'Dersler', icon: BookOpen }
  ];

  const renderGlobalConstraints = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3">Günlük Limitler</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maksimum Günlük Ders (Öğretmen)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={globalConstraints.maxDailyHoursTeacher || 8}
                onChange={(e) => handleGlobalConstraintChange('maxDailyHoursTeacher', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maksimum Günlük Ders (Sınıf)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={globalConstraints.maxDailyHoursClass || 9}
                onChange={(e) => handleGlobalConstraintChange('maxDailyHoursClass', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3">Ardışık Ders Kuralları</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maksimum Ardışık Ders
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={globalConstraints.maxConsecutiveHours || 3}
                onChange={(e) => handleGlobalConstraintChange('maxConsecutiveHours', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="avoidConsecutive"
                checked={globalConstraints.avoidConsecutiveSameSubject || false}
                onChange={(e) => handleGlobalConstraintChange('avoidConsecutiveSameSubject', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="avoidConsecutive" className="text-sm text-gray-700">
                Aynı dersin ardışık olmasını önle
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-3">Zaman Tercihleri</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="preferMorning"
              checked={globalConstraints.preferMorningHours || false}
              onChange={(e) => handleGlobalConstraintChange('preferMorningHours', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="preferMorning" className="text-sm text-gray-700">
              Sabah saatlerini tercih et
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="avoidFirstLast"
              checked={globalConstraints.avoidFirstLastPeriod || false}
              onChange={(e) => handleGlobalConstraintChange('avoidFirstLastPeriod', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="avoidFirstLast" className="text-sm text-gray-700">
              İlk ve son dersleri önle
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEntityConstraints = (entityType: string, entities: any[]) => (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <select
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seçiniz...</option>
          {entities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.name} {entity.branch && `(${entity.branch})`}
            </option>
          ))}
        </select>
        {selectedEntity && (
          <Button
            onClick={() => {
              // Set all periods to available for selected entity
              days.forEach(day => {
                periods.forEach(period => {
                  handleEntityConstraintChange(entityType, selectedEntity, day, period, 'available');
                });
              });
            }}
            variant="secondary"
            size="sm"
          >
            Tümünü Müsait Yap
          </Button>
        )}
      </div>

      {selectedEntity && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900">
              {entities.find(e => e.id === selectedEntity)?.name} - Zaman Kısıtlamaları
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Tıklayarak durumu değiştirin: Müsait → Kısıtlı → Müsait Değil
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Saat</th>
                  {days.map(day => (
                    <th key={day} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(period => (
                  <tr key={period}>
                    <td className="px-3 py-2 font-medium text-gray-900">{period}. Ders</td>
                    {days.map(day => {
                      const status = getConstraintStatus(entityType, selectedEntity, day, period);
                      return (
                        <td key={`${day}-${period}`} className="px-1 py-1">
                          <button
                            onClick={() => {
                              const nextStatus = status === 'available' ? 'restricted' : 
                                               status === 'restricted' ? 'unavailable' : 'available';
                              handleEntityConstraintChange(entityType, selectedEntity, day, period, nextStatus);
                            }}
                            className={`w-full h-8 text-xs font-medium rounded border-2 transition-colors ${getStatusColor(status)}`}
                            title={`${day} ${period}. ders - ${status === 'available' ? 'Müsait' : status === 'restricted' ? 'Kısıtlı' : 'Müsait Değil'}`}
                          >
                            {status === 'available' ? '✓' : status === 'restricted' ? '!' : '✗'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded mr-2"></div>
              <span>Müsait</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded mr-2"></div>
              <span>Kısıtlı</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded mr-2"></div>
              <span>Müsait Değil</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Clock className="w-12 h-12 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Zaman Kısıtlamaları</h2>
        <p className="text-gray-600">
          Program oluşturma kurallarını ve zaman kısıtlamalarını belirleyin
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'global' && renderGlobalConstraints()}
        {activeTab === 'teachers' && renderEntityConstraints('teachers', teachers.filter(t => data.selectedTeachers?.includes(t.id)))}
        {activeTab === 'classes' && renderEntityConstraints('classes', classes.filter(c => data.selectedClasses?.includes(c.id)))}
        {activeTab === 'subjects' && renderEntityConstraints('subjects', subjects.filter(s => data.selectedSubjects?.includes(s.id)))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h4 className="font-medium text-blue-800">Kısıtlama Önerileri</h4>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• <strong>Müsait:</strong> Bu saatte ders atanabilir (varsayılan)</li>
              <li>• <strong>Kısıtlı:</strong> Mümkünse bu saatte ders atanmasın, gerekirse atanabilir</li>
              <li>• <strong>Müsait Değil:</strong> Bu saatte kesinlikle ders atanmasın</li>
              <li>• Öğretmenlerin özel durumları (toplantı, nöbet vb.) için kısıtlama ekleyin</li>
              <li>• Sınıfların özel etkinlikleri için zaman bloklarını işaretleyin</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WizardStepConstraints;