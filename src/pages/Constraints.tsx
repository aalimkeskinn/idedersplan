import React, { useState } from 'react';
import { Clock, Plus, User, Building, BookOpen, Filter, Search, X } from 'lucide-react';
import { Teacher, Class, Subject } from '../types';
import { TimeConstraint, CONSTRAINT_TYPES } from '../types/constraints';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import Button from '../components/UI/Button';
import Select from '../components/UI/Select';
import ConstraintModal from '../components/Constraints/ConstraintModal';

const Constraints = () => {
  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: classes } = useFirestore<Class>('classes');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { data: constraints, remove: removeConstraint } = useFirestore<TimeConstraint>('constraints');
  const { success, error } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [constraintTypeFilter, setConstraintTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const getEntityName = (constraint: TimeConstraint) => {
    switch (constraint.entityType) {
      case 'teacher':
        return teachers.find(t => t.id === constraint.entityId)?.name || 'Bilinmeyen Öğretmen';
      case 'class':
        return classes.find(c => c.id === constraint.entityId)?.name || 'Bilinmeyen Sınıf';
      case 'subject':
        return subjects.find(s => s.id === constraint.entityId)?.name || 'Bilinmeyen Ders';
      default:
        return 'Bilinmeyen';
    }
  };

  const getEntityDetails = (constraint: TimeConstraint) => {
    switch (constraint.entityType) {
      case 'teacher':
        const teacher = teachers.find(t => t.id === constraint.entityId);
        return teacher ? `${teacher.branch} - ${teacher.level}` : '';
      case 'class':
        const classItem = classes.find(c => c.id === constraint.entityId);
        return classItem ? classItem.level : '';
      case 'subject':
        const subject = subjects.find(s => s.id === constraint.entityId);
        return subject ? `${subject.branch} - ${subject.level}` : '';
      default:
        return '';
    }
  };

  const getFilteredConstraints = () => {
    return constraints.filter(constraint => {
      const entityName = getEntityName(constraint);
      const entityDetails = getEntityDetails(constraint);
      
      const matchesEntityType = !entityTypeFilter || constraint.entityType === entityTypeFilter;
      const matchesConstraintType = !constraintTypeFilter || constraint.constraintType === constraintTypeFilter;
      const matchesSearch = !searchQuery || 
        entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entityDetails.toLowerCase().includes(searchQuery.toLowerCase()) ||
        constraint.day.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesEntityType && matchesConstraintType && matchesSearch;
    });
  };

  const handleDeleteConstraint = async (constraintId: string) => {
    try {
      await removeConstraint(constraintId);
      success('🗑️ Kısıtlama Silindi', 'Zaman kısıtlaması başarıyla silindi');
    } catch (err) {
      error('❌ Silme Hatası', 'Kısıtlama silinirken bir hata oluştu');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const filteredConstraints = getFilteredConstraints();

  const entityTypeOptions = [
    { value: '', label: 'Tüm Türler' },
    { value: 'teacher', label: 'Öğretmen' },
    { value: 'class', label: 'Sınıf' },
    { value: 'subject', label: 'Ders' }
  ];

  const constraintTypeOptions = [
    { value: '', label: 'Tüm Kısıtlamalar' },
    ...Object.entries(CONSTRAINT_TYPES).map(([key, config]) => ({
      value: key,
      label: config.label
    }))
  ];

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
      {/* Header */}
      <div className="header-mobile">
        <div className="flex items-center">
          <Clock className="w-8 h-8 text-purple-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">Zaman Kısıtlamaları</h1>
            <p className="text-responsive-sm text-gray-600">
              {constraints.length} kısıtlama kayıtlı ({filteredConstraints.length} gösteriliyor)
            </p>
          </div>
        </div>
        <div className="button-group-mobile">
          <Button
            onClick={() => setIsModalOpen(true)}
            icon={Plus}
            variant="primary"
            className="w-full sm:w-auto"
          >
            Kısıtlama Ekle
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="responsive-grid gap-responsive mb-6">
        <div className="mobile-card mobile-spacing">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Toplam Kısıtlama</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="mobile-card mobile-spacing">
          <div className="flex items-center">
            <User className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Öğretmen</p>
              <p className="text-2xl font-bold text-gray-900">{stats.teacher}</p>
            </div>
          </div>
        </div>
        <div className="mobile-card mobile-spacing">
          <div className="flex items-center">
            <Building className="w-8 h-8 text-emerald-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Sınıf</p>
              <p className="text-2xl font-bold text-gray-900">{stats.class}</p>
            </div>
          </div>
        </div>
        <div className="mobile-card mobile-spacing">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-indigo-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Ders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.subject}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mobile-card mobile-spacing mb-6">
        {/* Search */}
        <div className="mobile-form-group">
          <label className="mobile-form-label">
            🔍 Kısıtlama Ara
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Öğretmen, sınıf, ders veya gün ara..."
              className="block w-full pl-10 pr-10 py-3 text-base border-2 border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="responsive-grid-2 gap-responsive">
          <Select
            label="Tür Filtresi"
            value={entityTypeFilter}
            onChange={setEntityTypeFilter}
            options={entityTypeOptions}
          />
          <Select
            label="Kısıtlama Filtresi"
            value={constraintTypeFilter}
            onChange={setConstraintTypeFilter}
            options={constraintTypeOptions}
          />
        </div>
      </div>

      {/* Constraints List */}
      {filteredConstraints.length === 0 ? (
        <div className="text-center py-12 mobile-card">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {constraints.length === 0 ? 'Henüz kısıtlama eklenmemiş' : 'Filtrelere uygun kısıtlama bulunamadı'}
          </h3>
          <p className="text-gray-500 mb-4">
            {constraints.length === 0 ? 'İlk zaman kısıtlamanızı ekleyerek başlayın' : 'Farklı filtre kriterleri deneyin'}
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            icon={Plus}
            variant="primary"
          >
            Kısıtlama Ekle
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConstraints.map((constraint) => {
            const entityName = getEntityName(constraint);
            const entityDetails = getEntityDetails(constraint);
            const constraintConfig = CONSTRAINT_TYPES[constraint.constraintType];
            
            return (
              <div key={constraint.id} className="mobile-card mobile-spacing">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Entity Icon */}
                    <div className="flex-shrink-0">
                      {constraint.entityType === 'teacher' && <User className="w-6 h-6 text-blue-600" />}
                      {constraint.entityType === 'class' && <Building className="w-6 h-6 text-emerald-600" />}
                      {constraint.entityType === 'subject' && <BookOpen className="w-6 h-6 text-indigo-600" />}
                    </div>
                    
                    {/* Entity Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{entityName}</h3>
                      <p className="text-sm text-gray-600">{entityDetails}</p>
                    </div>
                    
                    {/* Constraint Info */}
                    <div className="text-center">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${constraintConfig.color}`}>
                        <span className="mr-1">{constraintConfig.icon}</span>
                        {constraintConfig.label}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {constraint.day} - {constraint.period}. Ders
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleDeleteConstraint(constraint.id)}
                      variant="danger"
                      size="sm"
                    >
                      Sil
                    </Button>
                  </div>
                </div>
                
                {constraint.reason && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{constraint.reason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Constraint Modal */}
      <ConstraintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default Constraints;