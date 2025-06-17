import React, { useState, useEffect } from 'react';
import { Clock, Save, RotateCcw, Info } from 'lucide-react';
import { DAYS, PERIODS, getTimeForPeriod, formatTimeRange } from '../../types';
import { TimeConstraint, CONSTRAINT_TYPES, ConstraintType } from '../../types/constraints';
import Button from '../UI/Button';

interface TimeConstraintGridProps {
  entityType: 'teacher' | 'class' | 'subject';
  entityId: string;
  entityName: string;
  entityLevel?: 'Anaokulu' | 'İlkokul' | 'Ortaokul';
  constraints: TimeConstraint[];
  onConstraintsChange: (constraints: TimeConstraint[]) => void;
  onSave: () => void;
  hasUnsavedChanges: boolean;
}

const TimeConstraintGrid: React.FC<TimeConstraintGridProps> = ({
  entityType,
  entityId,
  entityName,
  entityLevel,
  constraints,
  onConstraintsChange,
  onSave,
  hasUnsavedChanges
}) => {
  const [selectedConstraintType, setSelectedConstraintType] = useState<ConstraintType>('unavailable');
  const [isInitialized, setIsInitialized] = useState(false);

  // CRITICAL: Initialize all slots as "preferred" by default
  useEffect(() => {
    if (!isInitialized && entityId) {
      const existingConstraints = constraints.filter(c => c.entityId === entityId);
      
      // If no constraints exist for this entity, create default "preferred" constraints for all slots
      if (existingConstraints.length === 0) {
        const defaultConstraints: TimeConstraint[] = [];
        
        DAYS.forEach(day => {
          PERIODS.forEach(period => {
            const newConstraint: TimeConstraint = {
              id: `${entityId}-${day}-${period}-default`,
              entityType,
              entityId,
              day,
              period,
              constraintType: 'preferred',
              reason: `Default tercih edilen - ${entityName}`,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            defaultConstraints.push(newConstraint);
          });
        });
        
        // Add default constraints to the existing constraints
        const allConstraints = [...constraints, ...defaultConstraints];
        onConstraintsChange(allConstraints);
        
        console.log('✅ Default "tercih edilen" kısıtlamalar oluşturuldu:', {
          entityName,
          entityId,
          constraintCount: defaultConstraints.length
        });
      }
      
      setIsInitialized(true);
    }
  }, [entityId, entityName, entityType, constraints, onConstraintsChange, isInitialized]);

  const getConstraintForSlot = (day: string, period: string): TimeConstraint | undefined => {
    return constraints.find(c => 
      c.entityId === entityId && 
      c.day === day && 
      c.period === period
    );
  };

  const handleSlotClick = (day: string, period: string) => {
    const existingConstraint = getConstraintForSlot(day, period);
    
    if (existingConstraint) {
      if (existingConstraint.constraintType === 'preferred') {
        // Change from preferred to selected type (unavailable or restricted)
        const updatedConstraints = constraints.map(c => 
          (c.entityId === entityId && c.day === day && c.period === period)
            ? {
                ...c,
                constraintType: selectedConstraintType,
                reason: `${CONSTRAINT_TYPES[selectedConstraintType].label} - ${entityName}`,
                updatedAt: new Date()
              }
            : c
        );
        onConstraintsChange(updatedConstraints);
      } else {
        // Change back to preferred (default state)
        const updatedConstraints = constraints.map(c => 
          (c.entityId === entityId && c.day === day && c.period === period)
            ? {
                ...c,
                constraintType: 'preferred',
                reason: `Tercih edilen - ${entityName}`,
                updatedAt: new Date()
              }
            : c
        );
        onConstraintsChange(updatedConstraints);
      }
    } else {
      // This shouldn't happen with default constraints, but handle it anyway
      const newConstraint: TimeConstraint = {
        id: `${entityId}-${day}-${period}-${Date.now()}`,
        entityType,
        entityId,
        day,
        period,
        constraintType: selectedConstraintType,
        reason: `${CONSTRAINT_TYPES[selectedConstraintType].label} - ${entityName}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      onConstraintsChange([...constraints, newConstraint]);
    }
  };

  const resetToPreferred = () => {
    const updatedConstraints = constraints.map(c => 
      c.entityId === entityId
        ? {
            ...c,
            constraintType: 'preferred' as ConstraintType,
            reason: `Tercih edilen - ${entityName}`,
            updatedAt: new Date()
          }
        : c
    );
    onConstraintsChange(updatedConstraints);
  };

  const getTimeInfo = (period: string) => {
    const timePeriod = getTimeForPeriod(period, entityLevel);
    if (timePeriod) {
      return formatTimeRange(timePeriod.startTime, timePeriod.endTime);
    }
    return `${period}. Ders`;
  };

  const getConstraintCount = (type: ConstraintType) => {
    return constraints.filter(c => 
      c.entityId === entityId && c.constraintType === type
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {entityName} - Zaman Kısıtlamaları
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium text-green-600">Varsayılan: Tüm saatler "Tercih Edilen"</span> • 
            Zaman dilimlerine tıklayarak kısıtlama değiştirin
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {hasUnsavedChanges && (
            <span className="text-sm text-yellow-600 font-medium">
              Kaydedilmemiş değişiklikler
            </span>
          )}
          <Button
            onClick={resetToPreferred}
            icon={RotateCcw}
            variant="secondary"
            size="sm"
            title="Tüm saatleri 'Tercih Edilen' yap"
          >
            Varsayılana Dön
          </Button>
          <Button
            onClick={onSave}
            icon={Save}
            variant="primary"
            size="sm"
            disabled={!hasUnsavedChanges}
          >
            Kaydet
          </Button>
        </div>
      </div>

      {/* Constraint Type Selector - Only for non-preferred types */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Kısıtlama Türü Seçin:</h4>
          <div className="text-xs text-gray-500">
            Toplam: {constraints.filter(c => c.entityId === entityId).length} kısıtlama
          </div>
        </div>
        
        {/* Show current distribution */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {Object.entries(CONSTRAINT_TYPES).map(([type, config]) => (
            <div
              key={type}
              className={`p-3 rounded-lg border-2 text-center ${config.color}`}
            >
              <div className="flex items-center justify-center space-x-2 mb-1">
                <span className="text-lg">{config.icon}</span>
                <span className="font-medium text-sm">{config.label}</span>
              </div>
              <div className="text-lg font-bold">
                {getConstraintCount(type as ConstraintType)}
              </div>
              <p className="text-xs opacity-75">saat</p>
            </div>
          ))}
        </div>

        {/* Selector for changing constraint type */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Değiştirmek için kısıtlama türü seçin:</h5>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedConstraintType('unavailable')}
              className={`p-2 rounded-lg border-2 transition-all duration-200 text-left ${
                selectedConstraintType === 'unavailable'
                  ? 'bg-red-100 border-red-300 text-red-800'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>🚫</span>
                <span className="text-sm font-medium">Müsait Değil</span>
              </div>
            </button>
            <button
              onClick={() => setSelectedConstraintType('restricted')}
              className={`p-2 rounded-lg border-2 transition-all duration-200 text-left ${
                selectedConstraintType === 'restricted'
                  ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>⚠️</span>
                <span className="text-sm font-medium">Kısıtlı</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Time Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="table-responsive">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ders Saati
                </th>
                {DAYS.map(day => (
                  <th key={day} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {PERIODS.map((period, index) => {
                const timeInfo = getTimeInfo(period);
                
                return (
                  <tr key={period} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900 bg-gray-50">
                      <div className="text-center">
                        <div className="font-bold text-sm">{period}. Ders</div>
                        <div className="text-xs text-gray-600 mt-1 flex items-center justify-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {timeInfo}
                        </div>
                      </div>
                    </td>
                    {DAYS.map(day => {
                      const constraint = getConstraintForSlot(day, period);
                      const constraintConfig = constraint ? CONSTRAINT_TYPES[constraint.constraintType] : CONSTRAINT_TYPES.preferred;
                      
                      return (
                        <td key={`${day}-${period}`} className="px-2 py-2">
                          <button
                            onClick={() => handleSlotClick(day, period)}
                            className={`w-full min-h-[60px] p-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              constraintConfig.color
                            } hover:opacity-80 hover:scale-105`}
                            title={
                              constraint?.constraintType === 'preferred' 
                                ? `Tercih edilen saat - Değiştirmek için tıklayın`
                                : `${constraintConfig.label} - Tercih edilene dönmek için tıklayın`
                            }
                          >
                            <div className="text-center">
                              <div className="text-lg mb-1">{constraintConfig.icon}</div>
                              <div className="text-xs font-medium">
                                {constraintConfig.label}
                              </div>
                            </div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-2">Nasıl Kullanılır:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>Varsayılan:</strong> Tüm zaman dilimleri "Tercih Edilen" olarak başlar</li>
              <li>• <strong>Değiştirmek için:</strong> Yukarıdan kısıtlama türü seçin, sonra zaman dilimine tıklayın</li>
              <li>• <strong>Geri almak için:</strong> Kısıtlı saate tekrar tıklayın (tercih edilene döner)</li>
              <li>• <strong>Yeşil (✅):</strong> Tercih edilen zaman dilimleri</li>
              <li>• <strong>Kırmızı (🚫):</strong> Kesinlikle müsait değil</li>
              <li>• <strong>Sarı (⚠️):</strong> Sınırlı kullanım</li>
              <li>• <strong>Önemli:</strong> Değişiklikleri kaydetmeyi unutmayın!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeConstraintGrid;