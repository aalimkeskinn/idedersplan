import React from 'react';
import { Building, Users, Plus, Trash2 } from 'lucide-react';
import { Class } from '../../types';
import { WizardData } from '../../types/wizard';
import Button from '../UI/Button';

interface WizardStepClassesProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  classes: Class[];
}

const WizardStepClasses: React.FC<WizardStepClassesProps> = ({
  data,
  onUpdate,
  classes
}) => {
  const handleClassToggle = (classId: string) => {
    const currentClasses = data.selectedClasses || [];
    const isSelected = currentClasses.includes(classId);
    
    if (isSelected) {
      onUpdate({
        selectedClasses: currentClasses.filter(id => id !== classId)
      });
    } else {
      onUpdate({
        selectedClasses: [...currentClasses, classId]
      });
    }
  };

  const handleSelectAll = () => {
    onUpdate({
      selectedClasses: classes.map(c => c.id)
    });
  };

  const handleDeselectAll = () => {
    onUpdate({
      selectedClasses: []
    });
  };

  const selectedClasses = data.selectedClasses || [];
  const groupedClasses = classes.reduce((acc, classItem) => {
    if (!acc[classItem.level]) {
      acc[classItem.level] = [];
    }
    acc[classItem.level].push(classItem);
    return acc;
  }, {} as Record<string, Class[]>);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Building className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sınıf Seçimi</h2>
        <p className="text-gray-600">
          Programa dahil edilecek sınıfları seçin
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-900">Seçilen Sınıflar</h3>
            <p className="text-sm text-blue-700">
              {selectedClasses.length} / {classes.length} sınıf seçildi
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleSelectAll}
              variant="secondary"
              size="sm"
            >
              Tümünü Seç
            </Button>
            <Button
              onClick={handleDeselectAll}
              variant="secondary"
              size="sm"
            >
              Tümünü Kaldır
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedClasses).map(([level, levelClasses]) => (
          <div key={level} className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-emerald-600" />
              {level}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({levelClasses.filter(c => selectedClasses.includes(c.id)).length}/{levelClasses.length})
              </span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {levelClasses.map((classItem) => {
                const isSelected = selectedClasses.includes(classItem.id);
                
                return (
                  <div
                    key={classItem.id}
                    onClick={() => handleClassToggle(classItem.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{classItem.name}</h4>
                        <p className="text-sm opacity-75">{classItem.level}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedClasses.length === 0 && (
        <div className="text-center py-8">
          <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sınıf Seçin</h3>
          <p className="text-gray-500">
            Programa dahil edilecek en az bir sınıf seçmelisiniz
          </p>
        </div>
      )}
    </div>
  );
};

export default WizardStepClasses;