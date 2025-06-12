import React, { useState } from 'react';
import { Plus, Edit, Trash2, Building, Eye, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Class, EDUCATION_LEVELS, Schedule } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Input from '../components/UI/Input';
import Select from '../components/UI/Select';

const Classes = () => {
  const navigate = useNavigate();
  const { data: classes, loading, add, update, remove } = useFirestore<Class>('classes');
  const { data: schedules } = useFirestore<Schedule>('schedules');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [levelFilter, setLevelFilter] = useState('');
  const [bulkClasses, setBulkClasses] = useState([
    { name: '', level: '' }
  ]);
  const [formData, setFormData] = useState({
    name: '',
    level: ''
  });

  // Check if a class has a schedule
  const hasSchedule = (classId: string) => {
    return schedules.some(schedule => {
      return Object.values(schedule.schedule).some(day => 
        Object.values(day).some(slot => slot?.classId === classId)
      );
    });
  };

  // Get weekly hours for a class
  const getWeeklyHours = (classId: string) => {
    let totalHours = 0;
    schedules.forEach(schedule => {
      Object.values(schedule.schedule).forEach(day => {
        Object.values(day).forEach(slot => {
          if (slot?.classId === classId) {
            totalHours++;
          }
        });
      });
    });
    return totalHours;
  };

  // Navigate to class schedules page with selected class
  const handleViewSchedule = (classId: string) => {
    navigate(`/class-schedules?classId=${classId}`);
  };

  // Navigate to schedule creator with class pre-selected
  const handleCreateSchedule = (classId: string) => {
    navigate(`/schedules?mode=class&classId=${classId}`);
  };

  // Filter classes
  const getFilteredClasses = () => {
    return classes.filter(classItem => {
      const matchesLevel = !levelFilter || classItem.level === levelFilter;
      return matchesLevel;
    });
  };

  const sortedClasses = getFilteredClasses().sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingClass) {
      await update(editingClass.id, formData);
    } else {
      await add(formData as Omit<Class, 'id' | 'createdAt'>);
    }
    
    resetForm();
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    for (const classItem of bulkClasses) {
      if (classItem.name && classItem.level) {
        if (EDUCATION_LEVELS.includes(classItem.level as any)) {
          await add({
            name: classItem.name,
            level: classItem.level as Class['level']
          } as Omit<Class, 'id' | 'createdAt'>);
        }
      }
    }
    
    setBulkClasses([{ name: '', level: '' }]);
    setIsBulkModalOpen(false);
  };

  const resetForm = () => {
    setFormData({ name: '', level: '' });
    setEditingClass(null);
    setIsModalOpen(false);
  };

  const handleEdit = (classItem: Class) => {
    setFormData({
      name: classItem.name,
      level: classItem.level
    });
    setEditingClass(classItem);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bu sınıfı silmek istediğinizden emin misiniz?')) {
      await remove(id);
    }
  };

  const addBulkRow = () => {
    setBulkClasses([...bulkClasses, { name: '', level: '' }]);
  };

  const removeBulkRow = (index: number) => {
    if (bulkClasses.length > 1) {
      setBulkClasses(bulkClasses.filter((_, i) => i !== index));
    }
  };

  const updateBulkRow = (index: number, field: string, value: string) => {
    const updated = [...bulkClasses];
    updated[index] = { ...updated[index], [field]: value };
    setBulkClasses(updated);
  };

  const levelOptions = EDUCATION_LEVELS.map(level => ({
    value: level,
    label: level
  }));

  const levelFilterOptions = [
    { value: '', label: 'Tüm Seviyeler' },
    ...levelOptions
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Building className="w-8 h-8 text-emerald-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sınıflar</h1>
            <p className="text-gray-600">{classes.length} sınıf kayıtlı ({sortedClasses.length} gösteriliyor)</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsBulkModalOpen(true)}
            icon={Plus}
            variant="secondary"
          >
            Toplu Ekle
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            icon={Plus}
            variant="primary"
          >
            Yeni Sınıf
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <Select
            label="Seviye Filtresi"
            value={levelFilter}
            onChange={setLevelFilter}
            options={levelFilterOptions}
          />
        </div>
      </div>

      {sortedClasses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {classes.length === 0 ? 'Henüz sınıf eklenmemiş' : 'Filtrelere uygun sınıf bulunamadı'}
          </h3>
          <p className="text-gray-500 mb-4">
            {classes.length === 0 ? 'İlk sınıfınızı ekleyerek başlayın' : 'Farklı filtre kriterleri deneyin'}
          </p>
          <div className="flex justify-center space-x-2">
            {classes.length === 0 && (
              <>
                <Button
                  onClick={() => setIsBulkModalOpen(true)}
                  icon={Plus}
                  variant="secondary"
                >
                  Toplu Ekle
                </Button>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  icon={Plus}
                  variant="primary"
                >
                  Sınıf Ekle
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedClasses.map((classItem) => {
            const classHasSchedule = hasSchedule(classItem.id);
            const weeklyHours = getWeeklyHours(classItem.id);
            
            return (
              <div key={classItem.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    classItem.level === 'Anaokulu' ? 'bg-green-100 text-green-800' :
                    classItem.level === 'İlkokul' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {classItem.level}
                  </span>
                </div>
                
                {/* Schedule Status */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Program Durumu</p>
                      <div className="flex items-center mt-1">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          classHasSchedule ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className={`text-sm ${
                          classHasSchedule ? 'text-green-700' : 'text-gray-500'
                        }`}>
                          {classHasSchedule ? `${weeklyHours} ders saati` : 'Program yok'}
                        </span>
                      </div>
                    </div>
                    {classHasSchedule && (
                      <button
                        onClick={() => handleViewSchedule(classItem.id)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        title="Programı Görüntüle"
                        aria-label={`${classItem.name} sınıfının programını görüntüle`}
                      >
                        <Eye size={18} />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(classItem)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      title="Sınıfı Düzenle"
                      aria-label={`${classItem.name} sınıfını düzenle`}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(classItem.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      title="Sınıfı Sil"
                      aria-label={`${classItem.name} sınıfını sil`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleCreateSchedule(classItem.id)}
                    className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    title={classHasSchedule ? "Programı Düzenle" : "Program Oluştur"}
                    aria-label={`${classItem.name} sınıfı için ${classHasSchedule ? 'programı düzenle' : 'program oluştur'}`}
                  >
                    <Calendar size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Single Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingClass ? 'Sınıf Düzenle' : 'Yeni Sınıf Ekle'}
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Sınıf Adı"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            placeholder="Örn: 5A, 7B"
            required
          />
          
          <Select
            label="Eğitim Seviyesi"
            value={formData.level}
            onChange={(value) => setFormData({ ...formData, level: value })}
            options={levelOptions}
            required
          />

          <div className="flex justify-end space-x-3 mt-6">
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
              {editingClass ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Add Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Toplu Sınıf Ekleme"
      >
        <form onSubmit={handleBulkSubmit}>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Sınıf Listesi
                <span className="text-red-500">*</span>
              </label>
              <Button
                type="button"
                onClick={addBulkRow}
                variant="secondary"
                size="sm"
              >
                + Satır Ekle
              </Button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {bulkClasses.map((classItem, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    placeholder="Sınıf Adı"
                    value={classItem.name}
                    onChange={(e) => updateBulkRow(index, 'name', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <select
                    value={classItem.level}
                    onChange={(e) => updateBulkRow(index, 'level', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seviye</option>
                    {EDUCATION_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeBulkRow(index)}
                    className="px-2 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 disabled:opacity-50"
                    disabled={bulkClasses.length === 1}
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Örnek Sınıflar:</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• 5A - İlkokul</p>
              <p>• 7B - Ortaokul</p>
              <p>• Papatya - Anaokulu</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={() => setIsBulkModalOpen(false)}
              variant="secondary"
            >
              İptal
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Toplu Ekle ({bulkClasses.filter(c => c.name && c.level).length} sınıf)
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Classes;