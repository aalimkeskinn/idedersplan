import React, { useState } from 'react';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { Subject, EDUCATION_LEVELS } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Input from '../components/UI/Input';
import Select from '../components/UI/Select';

const Subjects = () => {
  const { data: subjects, loading, add, update, remove } = useFirestore<Subject>('subjects');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [levelFilter, setLevelFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [bulkSubjects, setBulkSubjects] = useState([
    { name: '', branch: '', level: '', weeklyHours: '' }
  ]);
  const [formData, setFormData] = useState({
    name: '',
    branch: '',
    level: '',
    weeklyHours: ''
  });

  // Get unique branches from subjects
  const getUniqueBranches = () => {
    const branches = [...new Set(subjects.map(subject => subject.branch))];
    return branches.sort((a, b) => a.localeCompare(b, 'tr'));
  };

  // Filter subjects
  const getFilteredSubjects = () => {
    return subjects.filter(subject => {
      const matchesLevel = !levelFilter || subject.level === levelFilter;
      const matchesBranch = !branchFilter || subject.branch === branchFilter;
      
      return matchesLevel && matchesBranch;
    });
  };

  const sortedSubjects = getFilteredSubjects().sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const subjectData = {
      ...formData,
      weeklyHours: parseInt(formData.weeklyHours)
    };

    if (editingSubject) {
      await update(editingSubject.id, subjectData);
    } else {
      await add(subjectData as Omit<Subject, 'id' | 'createdAt'>);
    }
    
    resetForm();
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    for (const subject of bulkSubjects) {
      if (subject.name && subject.branch && subject.level && subject.weeklyHours) {
        if (EDUCATION_LEVELS.includes(subject.level as any) && !isNaN(parseInt(subject.weeklyHours))) {
          await add({
            name: subject.name,
            branch: subject.branch,
            level: subject.level as Subject['level'],
            weeklyHours: parseInt(subject.weeklyHours)
          } as Omit<Subject, 'id' | 'createdAt'>);
        }
      }
    }
    
    setBulkSubjects([{ name: '', branch: '', level: '', weeklyHours: '' }]);
    setIsBulkModalOpen(false);
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
    if (window.confirm('Bu dersi silmek istediğinizden emin misiniz?')) {
      await remove(id);
    }
  };

  const addBulkRow = () => {
    setBulkSubjects([...bulkSubjects, { name: '', branch: '', level: '', weeklyHours: '' }]);
  };

  const removeBulkRow = (index: number) => {
    if (bulkSubjects.length > 1) {
      setBulkSubjects(bulkSubjects.filter((_, i) => i !== index));
    }
  };

  const updateBulkRow = (index: number, field: string, value: string) => {
    const updated = [...bulkSubjects];
    updated[index] = { ...updated[index], [field]: value };
    setBulkSubjects(updated);
  };

  const levelOptions = EDUCATION_LEVELS.map(level => ({
    value: level,
    label: level
  }));

  const branchOptions = getUniqueBranches().map(branch => ({
    value: branch,
    label: branch
  }));

  const levelFilterOptions = [
    { value: '', label: 'Tüm Seviyeler' },
    ...levelOptions
  ];

  const branchFilterOptions = [
    { value: '', label: 'Tüm Branşlar' },
    ...branchOptions
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
          <BookOpen className="w-8 h-8 text-indigo-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dersler</h1>
            <p className="text-gray-600">{subjects.length} ders kayıtlı ({sortedSubjects.length} gösteriliyor)</p>
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
            Yeni Ders
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Seviye Filtresi"
            value={levelFilter}
            onChange={setLevelFilter}
            options={levelFilterOptions}
          />
          <Select
            label="Branş Filtresi"
            value={branchFilter}
            onChange={setBranchFilter}
            options={branchFilterOptions}
          />
        </div>
      </div>

      {sortedSubjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {subjects.length === 0 ? 'Henüz ders eklenmemiş' : 'Filtrelere uygun ders bulunamadı'}
          </h3>
          <p className="text-gray-500 mb-4">
            {subjects.length === 0 ? 'İlk dersinizi ekleyerek başlayın' : 'Farklı filtre kriterleri deneyin'}
          </p>
          <div className="flex justify-center space-x-2">
            {subjects.length === 0 && (
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
                  Ders Ekle
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ders Adı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branş
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seviye
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Haftalık Saat
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedSubjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{subject.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{subject.branch}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      subject.level === 'Anaokulu' ? 'bg-green-100 text-green-800' :
                      subject.level === 'İlkokul' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {subject.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{subject.weeklyHours} saat</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button
                        onClick={() => handleEdit(subject)}
                        icon={Edit}
                        size="sm"
                        variant="secondary"
                      >
                        Düzenle
                      </Button>
                      <Button
                        onClick={() => handleDelete(subject.id)}
                        icon={Trash2}
                        size="sm"
                        variant="danger"
                      >
                        Sil
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Single Subject Modal */}
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
            options={levelOptions}
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
              {editingSubject ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Add Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Toplu Ders Ekleme"
      >
        <form onSubmit={handleBulkSubmit}>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Ders Listesi
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
              {bulkSubjects.map((subject, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    placeholder="Ders Adı"
                    value={subject.name}
                    onChange={(e) => updateBulkRow(index, 'name', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Branş"
                    value={subject.branch}
                    onChange={(e) => updateBulkRow(index, 'branch', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <select
                    value={subject.level}
                    onChange={(e) => updateBulkRow(index, 'level', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seviye</option>
                    {EDUCATION_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Saat"
                    value={subject.weeklyHours}
                    onChange={(e) => updateBulkRow(index, 'weeklyHours', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    min="1"
                    max="10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeBulkRow(index)}
                    className="px-2 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 disabled:opacity-50"
                    disabled={bulkSubjects.length === 1}
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Örnek Dersler:</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• Matematik - Matematik - İlkokul - 5 saat</p>
              <p>• Türkçe - Türkçe - Ortaokul - 6 saat</p>
              <p>• Fen Bilimleri - Fen Bilimleri - İlkokul - 3 saat</p>
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
              Toplu Ekle ({bulkSubjects.filter(s => s.name && s.branch && s.level && s.weeklyHours).length} ders)
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Subjects;