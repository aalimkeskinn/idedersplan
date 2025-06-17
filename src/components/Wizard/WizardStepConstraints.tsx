import React, { useState, useEffect } from 'react';
import { Clock, User, Building, BookOpen, Settings, AlertTriangle } from 'lucide-react';
import { Teacher, Class, Subject, DAYS, PERIODS } from '../../types';
import { WizardData } from '../../types/wizard';
import { TimeConstraint, CONSTRAINT_TYPES, ConstraintType } from '../../types/constraints';
import Button from '../UI/Button';
import Select from '../UI/Select';
import TimeConstraintGrid from '../Constraints/TimeConstraintGrid';

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
  const [localConstraints, setLocalConstraints] = useState<TimeConstraint[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize constraints if they don't exist
  useEffect(() => {
    if (!data.constraints) {
      onUpdate({
        constraints: {
          timeConstraints: [],
          globalRules: {
            maxDailyHoursTeacher: 8,
            maxDailyHoursClass: 9,
            maxConsecutiveHours: 3,
            avoidConsecutiveSameSubject: true,
            preferMorningHours: true,
            avoidFirstLastPeriod: false,
            lunchBreakRequired: true,
            lunchBreakDuration: 1
          }
        }
      });
    }
  }, [data, onUpdate]);

  // Track changes
  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [selectedEntity]);

  const getEntityOptions = () => {
    switch (activeTab) {
      case 'teachers':
        return teachers
          .filter(t => data.teachers?.selectedTeachers?.includes(t.id))
          .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
          .map(t => ({
            value: t.id,
            label: `${t.name} (${t.branch} - ${t.level})`
          }));
      case 'classes':
        return classes
          .filter(c => data.classes?.selectedClasses?.includes(c.id))
          .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
          .map(c => ({
            value: c.id,
            label: `${c.name} (${c.level})`
          }));
      case 'subjects':
        return subjects
          .filter(s => data.subjects?.selectedSubjects?.includes(s.id))
          .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
          .map(s => ({
            value: s.id,
            label: `${s.name} (${s.branch} - ${s.level})`
          }));
      default:
        return [];
    }
  };

  const getSelectedEntity = () => {
    if (!selectedEntity) return null;
    
    switch (activeTab) {
      case 'teachers':
        return teachers.find(t => t.id === selectedEntity);
      case 'classes':
        return classes.find(c => c.id === selectedEntity);
      case 'subjects':
        return subjects.find(s => s.id === selectedEntity);
      default:
        return null;
    }
  };

  const getEntityName = (entity: any) => {
    if (!entity) return '';
    return entity.name || '';
  };

  const getEntityDetails = (entity: any) => {
    if (!entity) return '';
    
    switch (activeTab) {
      case 'teachers':
        return `${entity.branch} - ${entity.level}`;
      case 'classes':
        return entity.level;
      case 'subjects':
        return `${entity.branch} - ${entity.level}`;
      default:
        return '';
    }
  };

  const getEntityIcon = () => {
    switch (activeTab) {
      case 'teachers':
        return User;
      case 'classes':
        return Building;
      case 'subjects':
        return BookOpen;
      default:
        return Clock;
    }
  };

  const getEntityColor = () => {
    switch (activeTab) {
      case 'teachers':
        return 'text-blue-600';
      case 'classes':
        return 'text-emerald-600';
      case 'subjects':
        return 'text-indigo-600';
      default:
        return 'text-purple-600';
    }
  };

  const handleGlobalConstraintChange = (key: string, value: any) => {
    onUpdate({
      constraints: {
        ...data.constraints,
        globalRules: {
          ...data.constraints?.globalRules,
          [key]: value
        }
      }
    });
  };

  const handleConstraintsChange = (constraints: TimeConstraint[]) => {
    setLocalConstraints(constraints);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (!selectedEntity) return;

    // Update constraints in wizard data
    onUpdate({
      constraints: {
        ...data.constraints,
        timeConstraints: localConstraints
      }
    });

    setHasUnsavedChanges(false);
  };

  const globalConstraints = data.constraints?.globalRules || {};
  const EntityIcon = getEntityIcon();
  const entityColor = getEntityColor();
  const currentSelectedEntityObject = getSelectedEntity();
  const entityName = getEntityName(currentSelectedEntityObject);
  const entityDetails = getEntityDetails(currentSelectedEntityObject);
  const entityLevel = currentSelectedEntityObject && 'level' in currentSelectedEntityObject ? currentSelectedEntityObject.level : undefined;

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
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedEntity('');
              }}
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
        
        {activeTab !== 'global' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Select
                label={`${activeTab === 'teachers' ? 'Öğretmen' : activeTab === 'classes' ? 'Sınıf' : 'Ders'} Seçin`}
                value={selectedEntity}
                onChange={setSelectedEntity}
                options={[
                  { value: '', label: 'Seçiniz...' },
                  ...getEntityOptions()
                ]}
              />
            </div>

            {selectedEntity && selectedEntity !== '' ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Entity Info */}
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                        <EntityIcon className={`w-5 h-5 ${entityColor}`} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{entityName}</h4>
                        <p className="text-sm text-gray-600">{entityDetails}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Constraint Grid */}
                <TimeConstraintGrid
                  entityType={activeTab === 'teachers' ? 'teacher' : activeTab === 'classes' ? 'class' : 'subject'}
                  entityId={selectedEntity}
                  entityName={entityName}
                  entityLevel={entityLevel}
                  constraints={data.constraints?.timeConstraints || []}
                  onConstraintsChange={handleConstraintsChange}
                  onSave={handleSave}
                  hasUnsavedChanges={hasUnsavedChanges}
                />
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <EntityIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeTab === 'teachers' ? 'Öğretmen' : activeTab === 'classes' ? 'Sınıf' : 'Ders'} Seçin
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Zaman kısıtlaması eklemek için yukarıdan bir {activeTab === 'teachers' ? 'öğretmen' : activeTab === 'classes' ? 'sınıf' : 'ders'} seçin
                </p>
              </div>
            )}
          </div>
        )}
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