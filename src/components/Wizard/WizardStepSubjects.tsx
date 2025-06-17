import React, { useState } from 'react';
import { BookOpen, Plus, Minus, Star, Clock, Edit, Trash2 } from 'lucide-react';
import { Subject, EDUCATION_LEVELS } from '../../types';
import { WizardData } from '../../types/wizard';
import { useFirestore } from '../../hooks/useFirestore';
import Button from '../UI/Button';
import Select from '../UI/Select';
import Modal from '../UI/Modal';
import Input from '../UI/Input';

interface WizardStepSubjectsProps {
  data: WizardData['subjects'];
  onUpdate: (data: WizardData['subjects']) => void;
}

const WizardStepSubjects: React.FC<WizardStepSubjectsProps> = ({ data, onUpdate }) => {
  const { data: subjects, add: addSubject, update: updateSubject, remove: removeSubject } = useFirestore<Subject>('subjects');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    branch: '',
    level: '',
    weeklyHours: ''
  });

  const levelOptions = [
    { value: '', label: 'Tüm Seviyeler' },
    { value: 'Anaokulu', label: 'Anaokulu' },
    { value: 'İlkokul', label: 'İlkokul' },
    { value: 'Ortaokul', label: 'Ortaokul' }
  ];

  const priorityOptions = [
    { value: 'high', label: 'Yüksek Öncelik' },
    { value: 'medium', label: 'Orta Öncelik' },
    { value: 'low', label: 'Düşük Öncelik' }
  ];

  const filteredSubjects = subjects.filter(subject => 
    !selectedLevel || subject.level === selectedLevel
  );

  const selectedSubjects = subjects.filter(subject => 
    data.selectedSubjects.includes(subject.id)
  );

  const handleSubjectToggle = (subjectId: string) => {
    const isSelected = data.selectedSubjects.includes(subjectId);
    const subject = subjects.find(s => s.id === subjectId);
    
    if (isSelected) {
      // Remove subject
      const newSelectedSubjects = data.selectedSubjects.filter(id => id !== subjectId);
      const newSubjectHours = { ...data.subjectHours };
      const newSubjectPriorities = { ...data.subjectPriorities };
      
      delete newSubjectHours[subjectId];
      delete newSubjectPriorities[subjectId];
      
      onUpdate({
        selectedSubjects: newSelectedSubjects,
        subjectHours: newSubjectHours,
        subjectPriorities: newSubjectPriorities
      });
    } else {
      // Add subject
      const newSelectedSubjects = [...data.selectedSubjects, subjectId];
      const newSubjectHours = {
        ...data.subjectHours,
        [subjectId]: subject?.weeklyHours || 4
      };
      const newSubjectPriorities = {
        ...data.subjectPriorities,
        [subjectId]: 'medium' as const
      };
      
      onUpdate({
        selectedSubjects: newSelectedSubjects,
        subjectHours: newSubjectHours,
        subjectPriorities: newSubjectPriorities
      });
    }
  };

  const handleHoursChange = (subjectId: string, hours: number) => {
    onUpdate({
      ...data,
      subjectHours: {
        ...data.subjectHours,
        [subjectId]: Math.max(1, Math.min(10, hours))
      }
    });
  };

  const handlePriorityChange = (subjectId: string, priority: 'high' | 'medium' | 'low') => {
    onUpdate({
      ...data,
      subjectPriorities: {
        ...data.subjectPriorities,
        [subjectId]: priority
      }
    });
  };

  const getTotalWeeklyHours = () => {
    return Object.values(data.subjectHours).reduce((total, hours) => total + hours, 0);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  // New Subject Modal Functions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const subjectData = {
      ...formData,
      weeklyHours: parseInt(formData.weeklyHours)
    };

    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, subjectData);
      } else {
        await addSubject(subjectData as Omit<Subject, 'id' | 'createdAt'>);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving subject:", error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', branch: '', level: '', weeklyHours: '' });
    setEditingSubject(null);
    setIsModalOpen(false);
  };

  const handleEdit = (subject: Subject) => {
    setFormData({
      name: subject.name,
      branch: subject.branch,
      level: subject.level,
      weeklyHours: subject.weeklyHours.toString()
    });
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await removeSubject(id);
      // If the deleted subject was selected, remove it from selection
      if (data.selectedSubjects.includes(id)) {
        handleSubjectToggle(id);
      }
    } catch (error) {
      console.error("Error deleting subject:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Ders Seçimi ve Konfigürasyonu</h3>
        <p className="text-gray-600">
          Programa dahil edilecek dersleri seçin ve haftalık saat sayılarını belirleyin
        </p>
      </div>

      {/* Filter and Add Button */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="md:w-1/2">
          <Select
            label="Seviye Filtresi"
            value={selectedLevel}
            onChange={setSelectedLevel}
            options={levelOptions}
          />
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          icon={Plus}
          variant="primary"
        >
          Yeni Ders Ekle
        </Button>
      </div>

      {/* Subject Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Subjects */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Mevcut Dersler ({filteredSubjects.length})</h4>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {filteredSubjects.map(subject => {
                const isSelected = data.selectedSubjects.includes(subject.id);
                
                return (
                  <div
                    key={subject.id}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{subject.name}</p>
                        <p className="text-xs text-gray-600">
                          {subject.branch} • {subject.level} • {subject.weeklyHours} saat/hafta
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(subject)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Dersi düzenle"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(subject.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Dersi sil"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => handleSubjectToggle(subject.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`}
                          title={isSelected ? "Seçimi kaldır" : "Seç"}
                        >
                          {isSelected ? <Minus className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-gray-500" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Subjects Configuration */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Seçilen Dersler ({selectedSubjects.length})</h4>
            <div className="text-sm text-gray-600">
              Toplam: <span className="font-bold text-blue-600">{getTotalWeeklyHours()} saat/hafta</span>
            </div>
          </div>
          
          {selectedSubjects.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Henüz ders seçilmedi</p>
              <p className="text-xs text-gray-400 mt-1">Soldan ders seçerek başlayın</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-4 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {selectedSubjects.map(subject => {
                  const hours = data.subjectHours[subject.id] || subject.weeklyHours;
                  const priority = data.subjectPriorities[subject.id] || 'medium';
                  
                  return (
                    <div key={subject.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{subject.name}</p>
                          <p className="text-xs text-gray-600">{subject.branch} • {subject.level}</p>
                        </div>
                        <button
                          onClick={() => handleSubjectToggle(subject.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Dersi kaldır"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Hours Configuration */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Haftalık Saat
                          </label>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleHoursChange(subject.id, hours - 1)}
                              className="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300"
                              disabled={hours <= 1}
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-sm font-medium">{hours}</span>
                            <button
                              onClick={() => handleHoursChange(subject.id, hours + 1)}
                              className="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300"
                              disabled={hours >= 10}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Öncelik
                          </label>
                          <select
                            value={priority}
                            onChange={(e) => handlePriorityChange(subject.id, e.target.value as any)}
                            className="w-full text-xs p-1 border border-gray-300 rounded"
                          >
                            {priorityOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {selectedSubjects.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-3">📊 Özet</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{selectedSubjects.length}</div>
              <div className="text-blue-700">Seçilen Ders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getTotalWeeklyHours()}</div>
              <div className="text-blue-700">Toplam Saat/Hafta</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(getTotalWeeklyHours() / 5)}
              </div>
              <div className="text-blue-700">Ortalama Saat/Gün</div>
            </div>
          </div>
          
          {/* Priority Distribution */}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-blue-700 mb-2">Öncelik Dağılımı:</p>
            <div className="flex items-center space-x-4 text-xs">
              {['high', 'medium', 'low'].map(priority => {
                const count = Object.values(data.subjectPriorities).filter(p => p === priority).length;
                return (
                  <div key={priority} className="flex items-center space-x-1">
                    <span>{getPriorityIcon(priority)}</span>
                    <span className="text-blue-700">
                      {priority === 'high' ? 'Yüksek' : priority === 'medium' ? 'Orta' : 'Düşük'}: {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Clock className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <h4 className="font-medium mb-1">💡 İpuçları:</h4>
            <ul className="space-y-1 text-xs">
              <li>• Haftalık toplam saat sayısı 25-35 arasında olması önerilir</li>
              <li>• Yüksek öncelikli dersler daha iyi zaman dilimlerine yerleştirilir</li>
              <li>• Ders saatleri daha sonra öğretmen atamalarında kullanılır</li>
              <li>• Seviye filtresi ile ilgili dersleri daha kolay bulabilirsiniz</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Subject Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingSubject ? 'Ders Düzenle' : 'Yeni Ders Ekle'}
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Ders Adı"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            placeholder="Örn: Matematik"
            required
          />
          
          <Input
            label="Branş"
            value={formData.branch}
            onChange={(value) => setFormData({ ...formData, branch: value })}
            placeholder="Örn: Fen Bilimleri"
            required
          />
          
          <Select
            label="Eğitim Seviyesi"
            value={formData.level}
            onChange={(value) => setFormData({ ...formData, level: value })}
            options={levelOptions.filter(option => option.value !== '')}
            required
          />

          <Input
            label="Haftalık Ders Saati"
            type="number"
            value={formData.weeklyHours}
            onChange={(value) => setFormData({ ...formData, weeklyHours: value })}
            placeholder="Örn: 4"
            required
          />

          <div className="button-group-mobile mt-6">
            <Button
              type="button"
              onClick={resetForm}
              variant="secondary"
            >
              İptal
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              {editingSubject ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WizardStepSubjects;