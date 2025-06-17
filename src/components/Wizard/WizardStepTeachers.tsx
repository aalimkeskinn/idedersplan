import React, { useState } from 'react';
import { Users, UserCheck, Clock, AlertTriangle, Edit, Trash2, Plus } from 'lucide-react';
import { Teacher, EDUCATION_LEVELS } from '../../types';
import { WizardData } from '../../types/wizard';
import { useFirestore } from '../../hooks/useFirestore';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Select from '../UI/Select';

interface WizardStepTeachersProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  teachers: Teacher[];
}

const WizardStepTeachers: React.FC<WizardStepTeachersProps> = ({
  data,
  onUpdate,
  teachers
}) => {
  const { add: addTeacher, update: updateTeacher, remove: removeTeacher } = useFirestore<Teacher>('teachers');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    branch: '',
    level: ''
  });
  const [selectedLevel, setSelectedLevel] = useState('');

  const handleTeacherToggle = (teacherId: string) => {
    const currentTeachers = data.selectedTeachers || [];
    const isSelected = currentTeachers.includes(teacherId);
    
    if (isSelected) {
      onUpdate({
        selectedTeachers: currentTeachers.filter(id => id !== teacherId)
      });
    } else {
      onUpdate({
        selectedTeachers: [...currentTeachers, teacherId]
      });
    }
  };

  const handleWorkloadChange = (teacherId: string, workload: number) => {
    const currentWorkloads = data.teacherWorkloads || {};
    onUpdate({
      teacherWorkloads: {
        ...currentWorkloads,
        [teacherId]: workload
      }
    });
  };

  const handleSelectAll = () => {
    const filteredTeachers = selectedLevel 
      ? teachers.filter(t => t.level === selectedLevel)
      : teachers;
    
    onUpdate({
      selectedTeachers: filteredTeachers.map(t => t.id)
    });
  };

  const handleDeselectAll = () => {
    const filteredTeachers = selectedLevel 
      ? teachers.filter(t => t.level === selectedLevel)
      : teachers;
    
    const newSelectedTeachers = (data.selectedTeachers || []).filter(
      id => !filteredTeachers.some(t => t.id === id)
    );
    
    onUpdate({
      selectedTeachers: newSelectedTeachers
    });
  };

  // New Teacher Modal Functions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTeacher) {
        await updateTeacher(editingTeacher.id, formData);
      } else {
        await addTeacher(formData as Omit<Teacher, 'id' | 'createdAt'>);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving teacher:", error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', branch: '', level: '' });
    setEditingTeacher(null);
    setIsModalOpen(false);
  };

  const handleEdit = (teacher: Teacher) => {
    setFormData({
      name: teacher.name,
      branch: teacher.branch,
      level: teacher.level
    });
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await removeTeacher(id);
      // If the deleted teacher was selected, remove it from selection
      if (data.selectedTeachers?.includes(id)) {
        handleTeacherToggle(id);
      }
    } catch (error) {
      console.error("Error deleting teacher:", error);
    }
  };

  const selectedTeachers = data.selectedTeachers || [];
  const teacherWorkloads = data.teacherWorkloads || {};
  
  const filteredTeachers = selectedLevel 
    ? teachers.filter(t => t.level === selectedLevel)
    : teachers;
  
  const groupedTeachers = filteredTeachers.reduce((acc, teacher) => {
    if (!acc[teacher.level]) {
      acc[teacher.level] = [];
    }
    acc[teacher.level].push(teacher);
    return acc;
  }, {} as Record<string, Teacher[]>);

  const calculateTotalWorkload = () => {
    return selectedTeachers.reduce((total, teacherId) => {
      return total + (teacherWorkloads[teacherId] || 20);
    }, 0);
  };

  const getWorkloadColor = (workload: number) => {
    if (workload <= 15) return 'text-green-600';
    if (workload <= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const levelOptions = [
    { value: '', label: 'Tüm Seviyeler' },
    { value: 'Anaokulu', label: 'Anaokulu' },
    { value: 'İlkokul', label: 'İlkokul' },
    { value: 'Ortaokul', label: 'Ortaokul' }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Öğretmen Seçimi</h2>
        <p className="text-gray-600">
          Programa dahil edilecek öğretmenleri seçin ve ders yüklerini belirleyin
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
          Yeni Öğretmen Ekle
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium text-blue-900">Seçilen Öğretmenler</h3>
            <p className="text-sm text-blue-700">
              {selectedTeachers.length} / {teachers.length} öğretmen seçildi
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{selectedTeachers.length}</div>
            <div className="text-sm text-gray-600">Seçili Öğretmen</div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className={`text-2xl font-bold ${getWorkloadColor(calculateTotalWorkload() / selectedTeachers.length || 0)}`}>
              {selectedTeachers.length > 0 ? Math.round(calculateTotalWorkload() / selectedTeachers.length) : 0}
            </div>
            <div className="text-sm text-gray-600">Ortalama Ders Yükü</div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600">{calculateTotalWorkload()}</div>
            <div className="text-sm text-gray-600">Toplam Ders Saati</div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedTeachers).map(([level, levelTeachers]) => (
          <div key={level} className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserCheck className="w-5 h-5 mr-2 text-blue-600" />
              {level}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({levelTeachers.filter(t => selectedTeachers.includes(t.id)).length}/{levelTeachers.length})
              </span>
            </h3>
            
            <div className="space-y-3">
              {levelTeachers.map((teacher) => {
                const isSelected = selectedTeachers.includes(teacher.id);
                const workload = teacherWorkloads[teacher.id] || 20;
                
                return (
                  <div
                    key={teacher.id}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          onClick={() => handleTeacherToggle(teacher.id)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{teacher.name}</h4>
                          <p className="text-sm text-gray-600">{teacher.branch}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(teacher)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Öğretmeni düzenle"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Öğretmeni sil"
                        >
                          <Trash2 size={16} />
                        </button>
                        {isSelected && (
                          <button
                            onClick={() => handleTeacherToggle(teacher.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Öğretmeni kaldır"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">
                            Haftalık Ders Yükü:
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="range"
                              min="5"
                              max="35"
                              value={workload}
                              onChange={(e) => handleWorkloadChange(teacher.id, parseInt(e.target.value))}
                              className="w-24"
                            />
                            <span className={`font-medium ${getWorkloadColor(workload)} min-w-[3rem] text-right`}>
                              {workload} saat
                            </span>
                            {workload > 30 && (
                              <AlertTriangle className="w-4 h-4 text-red-500" title="Yüksek ders yükü" />
                            )}
                          </div>
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

      {selectedTeachers.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Öğretmen Seçin</h3>
          <p className="text-gray-500">
            Programa dahil edilecek en az bir öğretmen seçmelisiniz
          </p>
        </div>
      )}

      {selectedTeachers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-yellow-800">Ders Yükü Önerileri</h4>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>• 5-15 saat: Düşük yük (part-time öğretmenler için ideal)</li>
                <li>• 16-25 saat: Normal yük (tam zamanlı öğretmenler için önerilen)</li>
                <li>• 26-30 saat: Yüksek yük (deneyimli öğretmenler için)</li>
                <li>• 30+ saat: Çok yüksek yük (özel durumlar için)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingTeacher ? 'Öğretmen Düzenle' : 'Yeni Öğretmen Ekle'}
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Ad Soyad"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            placeholder="Örn: Ahmet Yılmaz"
            required
          />
          
          <Input
            label="Branş"
            value={formData.branch}
            onChange={(value) => setFormData({ ...formData, branch: value })}
            placeholder="Örn: Matematik"
            required
          />
          
          <Select
            label="Eğitim Seviyesi"
            value={formData.level}
            onChange={(value) => setFormData({ ...formData, level: value })}
            options={levelOptions.filter(option => option.value !== '')}
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
              {editingTeacher ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WizardStepTeachers;