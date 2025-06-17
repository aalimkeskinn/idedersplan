import React, { useState } from 'react';
import { Clock, Plus, User, Building, BookOpen, Trash2, Eye, Settings } from 'lucide-react';
import { Teacher, Class, Subject } from '../types';
import { TimeConstraint, CONSTRAINT_TYPES } from '../types/constraints';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import Button from '../components/UI/Button';
import Select from '../components/UI/Select';
import ConfirmationModal from '../components/UI/ConfirmationModal';
import TimeConstraintGrid from '../components/Constraints/TimeConstraintGrid';

const Constraints = () => {
  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: classes } = useFirestore<Class>('classes');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { data: constraints, add: addConstraint, update: updateConstraint, remove: removeConstraint } = useFirestore<TimeConstraint>('constraints');
  const { success, error, warning } = useToast();
  const { 
    confirmation, 
    showConfirmation, 
    hideConfirmation,
    confirmDelete 
  } = useConfirmation();

  const [selectedEntityType, setSelectedEntityType] = useState<'teacher' | 'class' | 'subject'>('teacher');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [localConstraints, setLocalConstraints] = useState<TimeConstraint[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Initialize local constraints when entity changes
  React.useEffect(() => {
    setLocalConstraints([...constraints]);
    setHasUnsavedChanges(false);
  }, [constraints, selectedEntityId]);

  // Track changes
  React.useEffect(() => {
    const hasChanges = JSON.stringify(localConstraints) !== JSON.stringify(constraints);
    setHasUnsavedChanges(hasChanges);
  }, [localConstraints, constraints]);

  const getEntityOptions = () => {
    switch (selectedEntityType) {
      case 'teacher':
        return teachers
          .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
          .map(t => ({
            value: t.id,
            label: `${t.name} (${t.branch} - ${t.level})`
          }));
      case 'class':
        return classes
          .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
          .map(c => ({
            value: c.id,
            label: `${c.name} (${c.level})`
          }));
      case 'subject':
        return subjects
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

  const getEntityName = (entity: any) => {
    if (!entity) return '';
    return entity.name || '';
  };

  const getEntityDetails = (entity: any) => {
    if (!entity) return '';
    
    switch (selectedEntityType) {
      case 'teacher':
        return `${entity.branch} - ${entity.level}`;
      case 'class':
        return entity.level;
      case 'subject':
        return `${entity.branch} - ${entity.level}`;
      default:
        return '';
    }
  };

  const getEntityIcon = () => {
    switch (selectedEntityType) {
      case 'teacher':
        return User;
      case 'class':
        return Building;
      case 'subject':
        return BookOpen;
      default:
        return Clock;
    }
  };

  const getEntityColor = () => {
    switch (selectedEntityType) {
      case 'teacher':
        return 'text-blue-600';
      case 'class':
        return 'text-emerald-600';
      case 'subject':
        return 'text-indigo-600';
      default:
        return 'text-purple-600';
    }
  };

  const handleSave = async () => {
    if (!selectedEntityId) return;

    try {
      // Find constraints to add, update, or remove for this entity
      const currentEntityConstraints = constraints.filter(c => c.entityId === selectedEntityId);
      const newEntityConstraints = localConstraints.filter(c => c.entityId === selectedEntityId);

      // Remove old constraints that are no longer in the new list
      for (const constraint of currentEntityConstraints) {
        const stillExists = newEntityConstraints.find(c => 
          c.day === constraint.day && 
          c.period === constraint.period && 
          c.entityId === constraint.entityId
        );
        
        if (!stillExists) {
          await removeConstraint(constraint.id);
        }
      }

      // Add or update constraints
      for (const constraint of newEntityConstraints) {
        const existing = currentEntityConstraints.find(c => 
          c.day === constraint.day && 
          c.period === constraint.period && 
          c.entityId === constraint.entityId
        );
        
        if (existing) {
          // Update existing constraint if it changed
          if (existing.constraintType !== constraint.constraintType) {
            await updateConstraint(existing.id, {
              constraintType: constraint.constraintType,
              reason: constraint.reason,
              updatedAt: new Date()
            });
          }
        } else {
          // Add new constraint
          await addConstraint({
            entityType: constraint.entityType,
            entityId: constraint.entityId,
            day: constraint.day,
            period: constraint.period,
            constraintType: constraint.constraintType,
            reason: constraint.reason
          });
        }
      }

      const entityName = getEntityName(getSelectedEntity());
      success('✅ Kısıtlamalar Kaydedildi', `${entityName} için zaman kısıtlamaları başarıyla güncellendi`);
      setHasUnsavedChanges(false);
    } catch (err) {
      error('❌ Kayıt Hatası', 'Kısıtlamalar kaydedilirken bir hata oluştu');
    }
  };

  // NEW: Delete all constraints function
  const handleDeleteAllConstraints = () => {
    if (constraints.length === 0) {
      warning('⚠️ Silinecek Kısıtlama Yok', 'Sistemde silinecek kısıtlama bulunamadı');
      return;
    }

    confirmDelete(
      `${constraints.length} Zaman Kısıtlaması`,
      async () => {
        setIsDeletingAll(true);
        
        try {
          let deletedCount = 0;
          
          console.log('🗑️ Tüm kısıtlamalar siliniyor:', {
            totalConstraints: constraints.length
          });

          // Delete each constraint
          for (const constraint of constraints) {
            try {
              await removeConstraint(constraint.id);
              deletedCount++;
              console.log(`✅ Kısıtlama silindi: ${constraint.id}`);
            } catch (err) {
              console.error(`❌ Kısıtlama silinemedi: ${constraint.id}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Kısıtlamalar Silindi', `${deletedCount} zaman kısıtlaması başarıyla silindi`);
            
            // Reset local state
            setLocalConstraints([]);
            setSelectedEntityId('');
            setHasUnsavedChanges(false);
          } else {
            error('❌ Silme Hatası', 'Hiçbir kısıtlama silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Kısıtlamalar silinirken bir hata oluştu');
        } finally {
          setIsDeletingAll(false);
        }
      }
    );
  };

  const entityTypeOptions = [
    { value: 'teacher', label: 'Öğretmen' },
    { value: 'class', label: 'Sınıf' },
    { value: 'subject', label: 'Ders' }
  ];

  const selectedEntity = getSelectedEntity();
  const entityName = getEntityName(selectedEntity);
  const entityDetails = getEntityDetails(selectedEntity);
  const entityLevel = selectedEntity && 'level' in selectedEntity ? selectedEntity.level : undefined;
  const EntityIcon = getEntityIcon();
  const entityColor = getEntityColor();

  const getConstraintStats = () => {
    const stats = {
      total: constraints.length,
      teacher: constraints.filter(c => c.entityType === 'teacher').length,
      class: constraints.filter(c => c.entityType === 'class').length,
      subject: constraints.filter(c => c.entityType === 'subject').length,
      unavailable: constraints.filter(c => c.constraintType === 'unavailable').length,
      preferred: constraints.filter(c => c.constraintType === 'preferred').length,
      restricted: constraints.filter(c => c.constraintType === 'restricted').length
    };
    return stats;
  };

  const stats = getConstraintStats();

  return (
    <div className="container-mobile">
      {/* PROFESSIONAL: Clean header */}
      <div className="header-mobile">
        <div className="flex items-center">
          <Clock className="w-8 h-8 text-purple-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">Zaman Kısıtlamaları</h1>
            <p className="text-responsive-sm text-gray-600">
              Öğretmen, sınıf ve ders bazında zaman kısıtlamaları yönetin
            </p>
          </div>
        </div>
        <div className="button-group-mobile">
          {/* NEW: Delete All Button */}
          {constraints.length > 0 && (
            <Button
              onClick={handleDeleteAllConstraints}
              icon={Trash2}
              variant="danger"
              disabled={isDeletingAll}
              className="w-full sm:w-auto"
            >
              {isDeletingAll ? 'Siliniyor...' : `Tümünü Sil (${constraints.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* PROFESSIONAL: Compact statistics */}
      <div className="responsive-grid gap-responsive mb-6">
        <div className="mobile-card mobile-spacing">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-purple-600 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Toplam</p>
                <p className="text-lg font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
            <div className="text-xs text-gray-500">kısıtlama</div>
          </div>
        </div>
        <div className="mobile-card mobile-spacing">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="w-6 h-6 text-blue-600 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Öğretmen</p>
                <p className="text-lg font-bold text-gray-900">{stats.teacher}</p>
              </div>
            </div>
            <div className="text-xs text-gray-500">kısıtlama</div>
          </div>
        </div>
        <div className="mobile-card mobile-spacing">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Building className="w-6 h-6 text-emerald-600 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Sınıf</p>
                <p className="text-lg font-bold text-gray-900">{stats.class}</p>
              </div>
            </div>
            <div className="text-xs text-gray-500">kısıtlama</div>
          </div>
        </div>
        <div className="mobile-card mobile-spacing">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BookOpen className="w-6 h-6 text-indigo-600 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Ders</p>
                <p className="text-lg font-bold text-gray-900">{stats.subject}</p>
              </div>
            </div>
            <div className="text-xs text-gray-500">kısıtlama</div>
          </div>
        </div>
      </div>

      {/* PROFESSIONAL: Entity Selection */}
      <div className="mobile-card mobile-spacing mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-purple-600" />
            Kısıtlama Yönetimi
          </h3>
          {hasUnsavedChanges && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
              Kaydedilmemiş değişiklikler
            </span>
          )}
        </div>
        
        <div className="responsive-grid-2 gap-responsive">
          <Select
            label="Kısıtlama Türü"
            value={selectedEntityType}
            onChange={(value) => {
              setSelectedEntityType(value as 'teacher' | 'class' | 'subject');
              setSelectedEntityId('');
              setHasUnsavedChanges(false);
            }}
            options={entityTypeOptions}
          />
          
          <Select
            label={`${selectedEntityType === 'teacher' ? 'Öğretmen' : 
                     selectedEntityType === 'class' ? 'Sınıf' : 'Ders'} Seçin`}
            value={selectedEntityId}
            onChange={(value) => {
              setSelectedEntityId(value);
              setHasUnsavedChanges(false);
            }}
            options={getEntityOptions()}
          />
        </div>

        {/* PROFESSIONAL: Selected Entity Info */}
        {selectedEntity && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
              <div className="text-right">
                <p className="text-xs text-gray-500">Kısıtlama Sayısı</p>
                <p className="text-lg font-bold text-purple-600">
                  {constraints.filter(c => c.entityId === selectedEntityId).length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PROFESSIONAL: Time Constraint Grid */}
      {selectedEntityId && selectedEntity ? (
        <div className="mobile-card overflow-hidden">
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
        </div>
      ) : (
        <div className="text-center py-12 mobile-card">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-purple-100 rounded-full">
              <Clock className="w-12 h-12 text-purple-600" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Zaman Kısıtlaması Yönetin
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Yukarıdan bir öğretmen, sınıf veya ders seçerek o varlık için zaman kısıtlamaları ekleyebilir ve yönetebilirsiniz.
          </p>
          
          {/* Quick selection buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
            <button
              onClick={() => setSelectedEntityType('teacher')}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedEntityType === 'teacher'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <User className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Öğretmen</div>
              <div className="text-xs text-gray-500">{teachers.length} kayıt</div>
            </button>
            
            <button
              onClick={() => setSelectedEntityType('class')}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedEntityType === 'class'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <Building className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Sınıf</div>
              <div className="text-xs text-gray-500">{classes.length} kayıt</div>
            </button>
            
            <button
              onClick={() => setSelectedEntityType('subject')}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedEntityType === 'subject'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <BookOpen className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Ders</div>
              <div className="text-xs text-gray-500">{subjects.length} kayıt</div>
            </button>
          </div>

          {/* Info box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Nasıl Çalışır:</h4>
            <ul className="text-xs text-blue-700 space-y-1 text-left">
              <li>• <strong>Varsayılan:</strong> Tüm zaman dilimleri "Tercih Edilen" olarak başlar</li>
              <li>• <strong>Müsait Değil (🚫):</strong> Program oluşturmayı engeller</li>
              <li>• <strong>Kısıtlı (⚠️):</strong> Program oluşturulur ama uyarı verir</li>
              <li>• <strong>Tercih Edilen (✅):</strong> Normal program oluşturma</li>
            </ul>
          </div>
        </div>
      )}

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

export default Constraints;