import React, { useState } from 'react';
import { Building, Users, Plus, Minus, AlertTriangle } from 'lucide-react';
import { Class } from '../../types';
import Button from '../UI/Button';
import Select from '../UI/Select';

interface WizardStepClassesProps {
  data: {
    classes?: {
      selectedClasses: string[];
      classCapacities: { [classId: string]: number };
      classPreferences: { [classId: string]: string[] };
    }
  };
  onUpdate: (data: { classes: any }) => void;
  classes: Class[];
}

const WizardStepClasses: React.FC<WizardStepClassesProps> = ({
  data,
  onUpdate,
  classes
}) => {
  const [selectedLevel, setSelectedLevel] = useState('');
  
  // Initialize classes data if it doesn't exist
  const classesData = data.classes || {
    selectedClasses: [],
    classCapacities: {},
    classPreferences: {}
  };

  const handleClassToggle = (classId: string) => {
    const isSelected = classesData.selectedClasses.includes(classId);
    const classItem = classes.find(c => c.id === classId);
    
    if (isSelected) {
      // Remove class
      const newSelectedClasses = classesData.selectedClasses.filter(id => id !== classId);
      const newClassCapacities = { ...classesData.classCapacities };
      const newClassPreferences = { ...classesData.classPreferences };
      
      delete newClassCapacities[classId];
      delete newClassPreferences[classId];
      
      onUpdate({
        classes: {
          ...classesData,
          selectedClasses: newSelectedClasses,
          classCapacities: newClassCapacities,
          classPreferences: newClassPreferences
        }
      });
    } else {
      // Add class
      const newSelectedClasses = [...classesData.selectedClasses, classId];
      
      onUpdate({
        classes: {
          ...classesData,
          selectedClasses: newSelectedClasses,
          classCapacities: {
            ...classesData.classCapacities,
            [classId]: 30 // Default capacity
          }
        }
      });
    }
  };

  const handleCapacityChange = (classId: string, capacity: number) => {
    onUpdate({
      classes: {
        ...classesData,
        classCapacities: {
          ...classesData.classCapacities,
          [classId]: Math.max(1, Math.min(100, capacity))
        }
      }
    });
  };

  const handleSelectAll = () => {
    const filteredClasses = selectedLevel 
      ? classes.filter(c => c.level === selectedLevel)
      : classes;
    
    const newClassCapacities = { ...classesData.classCapacities };
    
    filteredClasses.forEach(c => {
      if (!newClassCapacities[c.id]) {
        newClassCapacities[c.id] = 30; // Default capacity
      }
    });
    
    onUpdate({
      classes: {
        ...classesData,
        selectedClasses: filteredClasses.map(c => c.id),
        classCapacities: newClassCapacities
      }
    });
  };

  const handleDeselectAll = () => {
    const filteredClasses = selectedLevel 
      ? classes.filter(c => c.level === selectedLevel)
      : classes;
    
    const newSelectedClasses = classesData.selectedClasses.filter(
      id => !filteredClasses.some(c => c.id === id)
    );
    
    const newClassCapacities = { ...classesData.classCapacities };
    const newClassPreferences = { ...classesData.classPreferences };
    
    filteredClasses.forEach(c => {
      delete newClassCapacities[c.id];
      delete newClassPreferences[c.id];
    });
    
    onUpdate({
      classes: {
        ...classesData,
        selectedClasses: newSelectedClasses,
        classCapacities: newClassCapacities,
        classPreferences: newClassPreferences
      }
    });
  };

  const levelOptions = [
    { value: '', label: 'Tüm Seviyeler' },
    { value: 'Anaokulu', label: 'Anaokulu' },
    { value: 'İlkokul', label: 'İlkokul' },
    { value: 'Ortaokul', label: 'Ortaokul' }
  ];

  const filteredClasses = selectedLevel 
    ? classes.filter(c => c.level === selectedLevel)
    : classes;

  const selectedClasses = classes.filter(c => 
    classesData.selectedClasses.includes(c.id)
  );

  const groupedClasses = filteredClasses.reduce((acc, classItem) => {
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
          Programa dahil edilecek sınıfları seçin ve kapasitelerini belirleyin
        </p>
      </div>

      {/* Filter */}
      <div className="max-w-md mx-auto">
        <Select
          label="Seviye Filtresi"
          value={selectedLevel}
          onChange={setSelectedLevel}
          options={levelOptions}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-900">Seçilen Sınıflar</h3>
            <p className="text-sm text-blue-700">
              {classesData.selectedClasses.length} / {classes.length} sınıf seçildi
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleSelectAll}
              variant="secondary"
              size="sm"
            >
              {selectedLevel ? `${selectedLevel} Tümünü Seç` : 'Tümünü Seç'}
            </Button>
            <Button
              onClick={handleDeselectAll}
              variant="secondary"
              size="sm"
            >
              {selectedLevel ? `${selectedLevel} Tümünü Kaldır` : 'Tümünü Kaldır'}
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
                ({levelClasses.filter(c => classesData.selectedClasses.includes(c.id)).length}/{levelClasses.length})
              </span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {levelClasses.map((classItem) => {
                const isSelected = classesData.selectedClasses.includes(classItem.id);
                const capacity = classesData.classCapacities[classItem.id] || 30;
                
                return (
                  <div
                    key={classItem.id}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div
                          onClick={() => handleClassToggle(classItem.id)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{classItem.name}</h4>
                          <p className="text-xs text-gray-600">{classItem.level}</p>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClassToggle(classItem.id);
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Sınıfı kaldır"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Sınıf Kapasitesi
                        </label>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCapacityChange(classItem.id, capacity - 1);
                            }}
                            className="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300"
                            disabled={capacity <= 1}
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{capacity}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCapacityChange(classItem.id, capacity + 1);
                            }}
                            className="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300"
                            disabled={capacity >= 100}
                          >
                            +
                          </button>
                          <span className="text-xs text-gray-500">öğrenci</span>
                        </div>
                      </div>
                    )}
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

      {selectedClasses.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-yellow-800">Sınıf Kapasitesi Önerileri</h4>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>• Anaokulu: 15-20 öğrenci</li>
                <li>• İlkokul: 20-30 öğrenci</li>
                <li>• Ortaokul: 25-35 öğrenci</li>
                <li>• Kapasite bilgisi derslik atamalarında kullanılacaktır</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WizardStepClasses;