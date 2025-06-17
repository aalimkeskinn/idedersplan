import React, { useState } from 'react';
import { MapPin, Plus, Edit, Trash2, Monitor, Wifi, Volume2 } from 'lucide-react';
import { Classroom } from '../../types/wizard';
import { WizardData } from '../../types/wizard';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Select from '../UI/Select';

interface WizardStepClassroomsProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
}

const WizardStepClassrooms: React.FC<WizardStepClassroomsProps> = ({
  data,
  onUpdate
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'normal' as Classroom['type'],
    capacity: '',
    floor: '',
    building: '',
    equipment: [] as string[]
  });

  const classrooms = data.classrooms || [];

  const classroomTypes = [
    { value: 'normal', label: 'Normal Sınıf' },
    { value: 'laboratory', label: 'Laboratuvar' },
    { value: 'workshop', label: 'Atölye' },
    { value: 'gym', label: 'Spor Salonu' },
    { value: 'library', label: 'Kütüphane' },
    { value: 'computer', label: 'Bilgisayar Sınıfı' }
  ];

  const equipmentOptions = [
    { id: 'projector', label: 'Projeksiyon', icon: Monitor },
    { id: 'computer', label: 'Bilgisayar', icon: Monitor },
    { id: 'wifi', label: 'WiFi', icon: Wifi },
    { id: 'sound', label: 'Ses Sistemi', icon: Volume2 }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const classroomData: Classroom = {
      id: editingClassroom?.id || Date.now().toString(),
      name: formData.name,
      type: formData.type,
      capacity: parseInt(formData.capacity),
      floor: formData.floor,
      building: formData.building,
      equipment: formData.equipment
    };

    if (editingClassroom) {
      onUpdate({
        classrooms: classrooms.map(c => 
          c.id === editingClassroom.id ? classroomData : c
        )
      });
    } else {
      onUpdate({
        classrooms: [...classrooms, classroomData]
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'normal',
      capacity: '',
      floor: '',
      building: '',
      equipment: []
    });
    setEditingClassroom(null);
    setIsModalOpen(false);
  };

  const handleEdit = (classroom: Classroom) => {
    setFormData({
      name: classroom.name,
      type: classroom.type,
      capacity: classroom.capacity.toString(),
      floor: classroom.floor,
      building: classroom.building,
      equipment: classroom.equipment
    });
    setEditingClassroom(classroom);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    onUpdate({
      classrooms: classrooms.filter(c => c.id !== id)
    });
  };

  const handleEquipmentToggle = (equipmentId: string) => {
    const currentEquipment = formData.equipment;
    if (currentEquipment.includes(equipmentId)) {
      setFormData({
        ...formData,
        equipment: currentEquipment.filter(e => e !== equipmentId)
      });
    } else {
      setFormData({
        ...formData,
        equipment: [...currentEquipment, equipmentId]
      });
    }
  };

  const getTypeLabel = (type: string) => {
    return classroomTypes.find(t => t.value === type)?.label || type;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      normal: 'bg-blue-100 text-blue-800',
      laboratory: 'bg-purple-100 text-purple-800',
      workshop: 'bg-orange-100 text-orange-800',
      gym: 'bg-green-100 text-green-800',
      library: 'bg-indigo-100 text-indigo-800',
      computer: 'bg-red-100 text-red-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <MapPin className="w-12 h-12 text-orange-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Derslik Yönetimi</h2>
        <p className="text-gray-600">
          Derslikleri tanımlayın ve özelliklerini belirleyin
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Derslikler</h3>
          <p className="text-sm text-gray-600">
            {classrooms.length} derslik tanımlandı
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          icon={Plus}
          variant="primary"
        >
          Yeni Derslik
        </Button>
      </div>

      {classrooms.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Derslik Eklenmemiş</h3>
          <p className="text-gray-500 mb-4">
            Program oluşturmak için en az bir derslik tanımlamalısınız
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            icon={Plus}
            variant="primary"
          >
            İlk Dersliği Ekle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((classroom) => (
            <div key={classroom.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{classroom.name}</h4>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(classroom.type)}`}>
                    {getTypeLabel(classroom.type)}
                  </span>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(classroom)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(classroom.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Kapasite:</span>
                  <span className="font-medium">{classroom.capacity} kişi</span>
                </div>
                <div className="flex justify-between">
                  <span>Konum:</span>
                  <span className="font-medium">{classroom.building} - {classroom.floor}. Kat</span>
                </div>
                {classroom.equipment.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500">Ekipmanlar:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {classroom.equipment.map((eq) => {
                        const equipment = equipmentOptions.find(e => e.id === eq);
                        return equipment ? (
                          <span key={eq} className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            <equipment.icon size={12} className="mr-1" />
                            {equipment.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingClassroom ? 'Derslik Düzenle' : 'Yeni Derslik Ekle'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Derslik Adı"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            placeholder="Örn: A101, Fen Lab 1"
            required
          />

          <Select
            label="Derslik Türü"
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value as Classroom['type'] })}
            options={classroomTypes}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Kapasite"
              type="number"
              value={formData.capacity}
              onChange={(value) => setFormData({ ...formData, capacity: value })}
              placeholder="30"
              required
            />
            <Input
              label="Kat"
              value={formData.floor}
              onChange={(value) => setFormData({ ...formData, floor: value })}
              placeholder="1"
              required
            />
          </div>

          <Input
            label="Bina"
            value={formData.building}
            onChange={(value) => setFormData({ ...formData, building: value })}
            placeholder="Ana Bina"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Ekipmanlar
            </label>
            <div className="grid grid-cols-2 gap-2">
              {equipmentOptions.map((equipment) => (
                <div
                  key={equipment.id}
                  onClick={() => handleEquipmentToggle(equipment.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    formData.equipment.includes(equipment.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center">
                    <equipment.icon size={16} className="mr-2" />
                    <span className="text-sm font-medium">{equipment.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
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
              {editingClassroom ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WizardStepClassrooms;