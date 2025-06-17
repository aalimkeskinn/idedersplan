import React, { useState, useEffect } from 'react';
import { X, Clock, User, Building, BookOpen } from 'lucide-react';
import { Teacher, Class, Subject } from '../../types';
import { TimeConstraint } from '../../types/constraints';
import { useFirestore } from '../../hooks/useFirestore';
import { useToast } from '../../hooks/useToast';
import Modal from '../UI/Modal';
import Select from '../UI/Select';
import TimeConstraintGrid from './TimeConstraintGrid';

interface ConstraintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConstraintModal: React.FC<ConstraintModalProps> = ({
  isOpen,
  onClose
}) => {
  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: classes } = useFirestore<Class>('classes');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { data: constraints, add: addConstraint, update: updateConstraint, remove: removeConstraint } = useFirestore<TimeConstraint>('constraints');
  const { success, error } = useToast();

  const [selectedEntityType, setSelectedEntityType] = useState<'teacher' | 'class' | 'subject'>('teacher');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [localConstraints, setLocalConstraints] = useState<TimeConstraint[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setLocalConstraints([...constraints]);
      setHasUnsavedChanges(false);
    } else {
      setSelectedEntityId('');
      setLocalConstraints([]);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, constraints]);

  // Track changes
  useEffect(() => {
    const hasChanges = JSON.stringify(localConstraints) !== JSON.stringify(constraints);
    setHasUnsavedChanges(hasChanges);
  }, [localConstraints, constraints]);

  const getEntityOptions = () => {
    switch (selectedEntityType) {
      case 'teacher':
        return teachers.map(t => ({
          value: t.id,
          label: `${t.name} (${t.branch} - ${t.level})`
        }));
      case 'class':
        return classes.map(c => ({
          value: c.id,
          label: `${c.name} (${c.level})`
        }));
      case 'subject':
        return subjects.map(s => ({
          value: s.id,
          label: `${s.name} (${s.branch} - ${s.level})`
        }));
      default:
        return [];
    }
  };

  const getSelectedEntity = () => {
    if (!selectedEntityId) return null;
    
    switch (selectedEntityType) {
      case 'teacher':
        return teachers.find(t => t.id === selectedEntityId);
      case 'class':
        return classes.find(c => c.id === selectedEntityId);
      case 'subject':
        return subjects.find(s => s.id === selectedEntityId);
      default:
        return null;
    }
  };

  const handleSave = async () => {
    try {
      // Find constraints to add, update, or remove
      const currentEntityConstraints = constraints.filter(c => c.entityId === selectedEntityId);
      const newEntityConstraints = localConstraints.filter(c => c.entityId === selectedEntityId);

      // Remove old constraints
      for (const constraint of currentEntityConstraints) {
        if (!newEntityConstraints.find(c => c.id === constraint.id)) {
          await removeConstraint(constraint.id);
        }
      }

      // Add new constraints
      for (const constraint of newEntityConstraints) {
        if (!currentEntityConstraints.find(c => c.id === constraint.id)) {
          await addConstraint(constraint);
        }
      }

      success('✅ Kısıtlamalar Kaydedildi', 'Zaman kısıtlamaları başarıyla güncellendi');
      setHasUnsavedChanges(false);
    } catch (err) {
      error('❌ Kayıt Hatası', 'Kısıtlamalar kaydedilirken bir hata oluştu');
    }
  };

  const entityTypeOptions = [
    { value: 'teacher', label: 'Öğretmen' },
    { value: 'class', label: 'Sınıf' },
    { value: 'subject', label: 'Ders' }
  ];

  const selectedEntity = getSelectedEntity();
  const entityName = selectedEntity ? 
    (selectedEntityType === 'teacher' ? (selectedEntity as Teacher).name :
     selectedEntityType === 'class' ? (selectedEntity as Class).name :
     (selectedEntity as Subject).name) : '';

  const entityLevel = selectedEntity && 'level' in selectedEntity ? selectedEntity.level : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Zaman Kısıtlamaları Yönetimi"
      size="xl"
    >
      <div className="space-y-6">
        {/* Entity Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Kısıtlama Türü"
            value={selectedEntityType}
            onChange={(value) => {
              setSelectedEntityType(value as 'teacher' | 'class' | 'subject');
              setSelectedEntityId('');
            }}
            options={entityTypeOptions}
          />
          
          <Select
            label={`${selectedEntityType === 'teacher' ? 'Öğretmen' : 
                     selectedEntityType === 'class' ? 'Sınıf' : 'Ders'} Seçin`}
            value={selectedEntityId}
            onChange={setSelectedEntityId}
            options={getEntityOptions()}
          />
        </div>

        {/* Entity Info */}
        {selectedEntity && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              {selectedEntityType === 'teacher' && <User className="w-5 h-5 text-blue-600" />}
              {selectedEntityType === 'class' && <Building className="w-5 h-5 text-emerald-600" />}
              {selectedEntityType === 'subject' && <BookOpen className="w-5 h-5 text-indigo-600" />}
              
              <div>
                <h3 className="font-medium text-gray-900">{entityName}</h3>
                <p className="text-sm text-gray-600">
                  {selectedEntityType === 'teacher' && `${(selectedEntity as Teacher).branch} - ${(selectedEntity as Teacher).level}`}
                  {selectedEntityType === 'class' && `${(selectedEntity as Class).level} Seviyesi`}
                  {selectedEntityType === 'subject' && `${(selectedEntity as Subject).branch} - ${(selectedEntity as Subject).level}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Time Constraint Grid */}
        {selectedEntityId && (
          <TimeConstraintGrid
            entityType={selectedEntityType}
            entityId={selectedEntityId}
            entityName={entityName}
            entityLevel={entityLevel}
            constraints={localConstraints}
            onConstraintsChange={setLocalConstraints}
            onSave={handleSave}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        )}

        {!selectedEntityId && (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Zaman Kısıtlaması Ekleyin
            </h3>
            <p className="text-gray-500">
              Öğretmen, sınıf veya ders seçerek zaman kısıtlamaları ekleyebilirsiniz
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ConstraintModal;