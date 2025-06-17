import React, { useState } from 'react';
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
  const [isSelecting, setIsSelecting] = useState(false);

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
      // Remove constraint
      const updatedConstraints = constraints.filter(c => 
        !(c.entityId === entityId && c.day === day && c.period === period)
      );
      onConstraintsChange(updatedConstraints);
    } else {
      // Add new constraint
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

  const clearAllConstraints = () => {
    const updatedConstraints = constraints.filter(c => c.entityId !== entityId);
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
            Zaman dilimlerine tıklayarak kısıtlama ekleyin/kaldırın
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {hasUnsavedChanges && (
            <span className="text-sm text-yellow-600 font-medium">
              Kaydedilmemiş değişiklikler
            </span>
          )}
          <Button
            onClick={clearAllConstraints}
            icon={RotateCcw}
            variant="secondary"
            size="sm"
            disabled={constraints.filter(c => c.entityId === entityId).length === 0}
          >
            Temizle
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

      {/* Constraint Type Selector */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Kısıtlama Türü Seçin:</h4>
          <div className="text-xs text-gray-500">
            Toplam: {constraints.filter(c => c.entityId === entityId).length} kısıtlama
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(CONSTRAINT_TYPES).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setSelectedConstraintType(type as ConstraintType)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                selectedConstraintType === type
                  ? `${config.color} border-current shadow-md`
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">{config.icon}</span>
                <span className="font-medium text-sm">{config.label}</span>
                <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                  {getConstraintCount(type as ConstraintType)}
                </span>
              </div>
              <p className="text-xs text-gray-600">{config.description}</p>
            </button>
          ))}
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
                      const constraintConfig = constraint ? CONSTRAINT_TYPES[constraint.constraintType] : null;
                      
                      return (
                        <td key={`${day}-${period}`} className="px-2 py-2">
                          <button
                            onClick={() => handleSlotClick(day, period)}
                            className={`w-full min-h-[60px] p-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              constraint
                                ? `${constraintConfig?.color} hover:opacity-80`
                                : 'border-gray-300 bg-gray-50 border-dashed hover:border-blue-400 hover:bg-blue-50'
                            }`}
                            title={constraint ? `${constraintConfig?.label}: ${constraint.reason}` : 'Kısıtlama ekle'}
                          >
                            {constraint ? (
                              <div className="text-center">
                                <div className="text-lg mb-1">{constraintConfig?.icon}</div>
                                <div className="text-xs font-medium">
                                  {constraintConfig?.label}
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-400 text-xs">
                                Kısıtlama Ekle
                              </div>
                            )}
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

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-2">Nasıl Kullanılır:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Yukarıdan kısıtlama türünü seçin</li>
              <li>• Zaman dilimlerine tıklayarak kısıtlama ekleyin/kaldırın</li>
              <li>• Kırmızı: Kesinlikle müsait değil</li>
              <li>• Yeşil: Tercih edilen zaman dilimleri</li>
              <li>• Sarı: Sınırlı kullanım</li>
              <li>• Değişiklikleri kaydetmeyi unutmayın</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeConstraintGrid;