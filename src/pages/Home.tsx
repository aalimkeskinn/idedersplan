import React, { useState } from 'react';
import { 
  Users, 
  Building, 
  BookOpen, 
  Calendar, 
  FileText, 
  Eye,
  ArrowRight,
  Clock,
  Zap,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import { Teacher, Class, Subject, Schedule } from '../types';
import Button from '../components/UI/Button';
import ConfirmationModal from '../components/UI/ConfirmationModal';

const Home = () => {
  const navigate = useNavigate();
  const { data: teachers, remove: removeTeacher } = useFirestore<Teacher>('teachers');
  const { data: classes, remove: removeClass } = useFirestore<Class>('classes');
  const { data: subjects, remove: removeSubject } = useFirestore<Subject>('subjects');
  const { data: schedules, remove: removeSchedule } = useFirestore<Schedule>('schedules');
  const { success, error, warning } = useToast();
  const { 
    confirmation, 
    showConfirmation, 
    hideConfirmation,
    confirmDelete 
  } = useConfirmation();

  const [isDeletingTeachers, setIsDeletingTeachers] = useState(false);
  const [isDeletingClasses, setIsDeletingClasses] = useState(false);
  const [isDeletingSubjects, setIsDeletingSubjects] = useState(false);
  const [isDeletingSchedules, setIsDeletingSchedules] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const features = [
    {
      icon: BookOpen,
      title: 'Dersler',
      description: 'Dersleri branş ve seviyelerine göre organize edin',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      path: '/subjects'
    },
    {
      icon: Users,
      title: 'Öğretmenler',
      description: 'Öğretmenleri ekleyin ve branşlarına göre yönetin',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      path: '/teachers'
    },
    {
      icon: Building,
      title: 'Sınıflar',
      description: 'Sınıfları seviyelerine göre kategorize edin',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      path: '/classes'
    },
    {
      icon: Clock,
      title: 'Zaman Kısıtlamaları',
      description: 'Öğretmen ve sınıf zaman kısıtlamalarını yönetin',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      path: '/constraints'
    },
    {
      icon: Zap,
      title: 'Program Sihirbazı',
      description: 'Adım adım otomatik program oluşturun',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      path: '/schedule-wizard'
    },
    {
      icon: Calendar,
      title: 'Manuel Program',
      description: 'Öğretmen veya sınıf bazlı manuel program oluşturun',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      path: '/schedules'
    },
    {
      icon: Eye,
      title: 'Programları Görüntüle',
      description: 'Oluşturulan programları görüntüleyin ve inceleyin',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      path: '/all-schedules'
    },
    {
      icon: FileText,
      title: 'PDF İndir',
      description: 'Programları profesyonel PDF formatında indirin',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      path: '/pdf'
    }
  ];

  // Delete all teachers
  const handleDeleteAllTeachers = () => {
    if (teachers.length === 0) {
      warning('⚠️ Silinecek Öğretmen Yok', 'Sistemde silinecek öğretmen bulunamadı');
      return;
    }

    confirmDelete(
      `${teachers.length} Öğretmen`,
      async () => {
        setIsDeletingTeachers(true);
        
        try {
          let deletedCount = 0;
          
          for (const teacher of teachers) {
            try {
              await removeTeacher(teacher.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Öğretmen silinemedi: ${teacher.name}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Öğretmenler Silindi', `${deletedCount} öğretmen başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir öğretmen silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Öğretmenler silinirken bir hata oluştu');
        } finally {
          setIsDeletingTeachers(false);
        }
      }
    );
  };

  // Delete all classes
  const handleDeleteAllClasses = () => {
    if (classes.length === 0) {
      warning('⚠️ Silinecek Sınıf Yok', 'Sistemde silinecek sınıf bulunamadı');
      return;
    }

    confirmDelete(
      `${classes.length} Sınıf`,
      async () => {
        setIsDeletingClasses(true);
        
        try {
          let deletedCount = 0;
          
          for (const classItem of classes) {
            try {
              await removeClass(classItem.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Sınıf silinemedi: ${classItem.name}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Sınıflar Silindi', `${deletedCount} sınıf başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir sınıf silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Sınıflar silinirken bir hata oluştu');
        } finally {
          setIsDeletingClasses(false);
        }
      }
    );
  };

  // Delete all subjects
  const handleDeleteAllSubjects = () => {
    if (subjects.length === 0) {
      warning('⚠️ Silinecek Ders Yok', 'Sistemde silinecek ders bulunamadı');
      return;
    }

    confirmDelete(
      `${subjects.length} Ders`,
      async () => {
        setIsDeletingSubjects(true);
        
        try {
          let deletedCount = 0;
          
          for (const subject of subjects) {
            try {
              await removeSubject(subject.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Ders silinemedi: ${subject.name}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Dersler Silindi', `${deletedCount} ders başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir ders silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Dersler silinirken bir hata oluştu');
        } finally {
          setIsDeletingSubjects(false);
        }
      }
    );
  };

  // Delete all schedules
  const handleDeleteAllSchedules = () => {
    if (schedules.length === 0) {
      warning('⚠️ Silinecek Program Yok', 'Sistemde silinecek program bulunamadı');
      return;
    }

    confirmDelete(
      `${schedules.length} Program`,
      async () => {
        setIsDeletingSchedules(true);
        
        try {
          let deletedCount = 0;
          
          for (const schedule of schedules) {
            try {
              await removeSchedule(schedule.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Program silinemedi: ${schedule.id}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Programlar Silindi', `${deletedCount} program başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir program silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Programlar silinirken bir hata oluştu');
        } finally {
          setIsDeletingSchedules(false);
        }
      }
    );
  };

  // Delete all data
  const handleDeleteAllData = () => {
    const totalItems = teachers.length + classes.length + subjects.length + schedules.length;
    
    if (totalItems === 0) {
      warning('⚠️ Silinecek Veri Yok', 'Sistemde silinecek veri bulunamadı');
      return;
    }

    confirmDelete(
      `Tüm Veriler (${totalItems} öğe)`,
      async () => {
        setIsDeletingAll(true);
        
        try {
          let deletedCount = 0;
          
          // Delete schedules first
          for (const schedule of schedules) {
            try {
              await removeSchedule(schedule.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Program silinemedi: ${schedule.id}`, err);
            }
          }

          // Delete teachers
          for (const teacher of teachers) {
            try {
              await removeTeacher(teacher.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Öğretmen silinemedi: ${teacher.name}`, err);
            }
          }

          // Delete classes
          for (const classItem of classes) {
            try {
              await removeClass(classItem.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Sınıf silinemedi: ${classItem.name}`, err);
            }
          }

          // Delete subjects
          for (const subject of subjects) {
            try {
              await removeSubject(subject.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Ders silinemedi: ${subject.name}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Tüm Veriler Silindi', `${deletedCount} öğe başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir veri silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Veriler silinirken bir hata oluştu');
        } finally {
          setIsDeletingAll(false);
        }
      }
    );
  };

  const totalDataCount = teachers.length + classes.length + subjects.length + schedules.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <img 
                src="https://cv.ide.k12.tr/images/ideokullari_logo.png" 
                alt="İDE Okulları Logo"
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>';
                  }
                }}
              />
            </div>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            İDE Okulları Ders Programı Sistemi
          </h1>
          <p className="text-sm md:text-base text-gray-600 mb-4 max-w-2xl mx-auto">
            Sihirbaz ile otomatik program oluşturun veya manuel olarak düzenleyin. 
            Çakışma kontrolü, zaman kısıtlamaları ve profesyonel PDF çıktıları.
          </p>
        </div>
      </div>

      {/* Data Management Section */}
      {totalDataCount > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-2">Veri Yönetimi</h3>
                <p className="text-sm text-red-700 mb-4">
                  Sistemdeki verileri temizlemek için aşağıdaki butonları kullanabilirsiniz. 
                  Bu işlemler geri alınamaz!
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  {teachers.length > 0 && (
                    <Button
                      onClick={handleDeleteAllTeachers}
                      icon={Trash2}
                      variant="danger"
                      size="sm"
                      disabled={isDeletingTeachers}
                      className="w-full"
                    >
                      {isDeletingTeachers ? 'Siliniyor...' : `Öğretmenler (${teachers.length})`}
                    </Button>
                  )}
                  
                  {classes.length > 0 && (
                    <Button
                      onClick={handleDeleteAllClasses}
                      icon={Trash2}
                      variant="danger"
                      size="sm"
                      disabled={isDeletingClasses}
                      className="w-full"
                    >
                      {isDeletingClasses ? 'Siliniyor...' : `Sınıflar (${classes.length})`}
                    </Button>
                  )}
                  
                  {subjects.length > 0 && (
                    <Button
                      onClick={handleDeleteAllSubjects}
                      icon={Trash2}
                      variant="danger"
                      size="sm"
                      disabled={isDeletingSubjects}
                      className="w-full"
                    >
                      {isDeletingSubjects ? 'Siliniyor...' : `Dersler (${subjects.length})`}
                    </Button>
                  )}
                  
                  {schedules.length > 0 && (
                    <Button
                      onClick={handleDeleteAllSchedules}
                      icon={Trash2}
                      variant="danger"
                      size="sm"
                      disabled={isDeletingSchedules}
                      className="w-full"
                    >
                      {isDeletingSchedules ? 'Siliniyor...' : `Programlar (${schedules.length})`}
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleDeleteAllData}
                    icon={Trash2}
                    variant="danger"
                    size="sm"
                    disabled={isDeletingAll}
                    className="w-full font-bold"
                  >
                    {isDeletingAll ? 'Siliniyor...' : `Tümünü Sil (${totalDataCount})`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Features Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              onClick={() => navigate(feature.path)}
              className="group cursor-pointer bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-gray-200"
            >
              <div className={`${feature.bgColor} w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200`}>
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                {feature.description}
              </p>
              <div className="flex items-center text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform duration-200">
                Başla <ArrowRight className="ml-1 w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Statistics */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">{teachers.length}</div>
              <div className="text-xs text-gray-600">Öğretmen</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-600">{classes.length}</div>
              <div className="text-xs text-gray-600">Sınıf</div>
            </div>
            <div>
              <div className="text-lg font-bold text-indigo-600">{subjects.length}</div>
              <div className="text-xs text-gray-600">Ders</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">{schedules.length}</div>
              <div className="text-xs text-gray-600">Program</div>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Quick Info */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">Sihirbaz Sistemi</div>
              <div className="text-xs text-gray-600">Adım adım otomatik oluşturma</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Zaman Kısıtlamaları</div>
              <div className="text-xs text-gray-600">Esnek kısıtlama yönetimi</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Çakışma Kontrolü</div>
              <div className="text-xs text-gray-600">Otomatik çakışma tespiti</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">PDF Çıktı</div>
              <div className="text-xs text-gray-600">Profesyonel görünüm</div>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Sihirbaz tabanlı otomatik program oluşturma sistemi
          </p>
        </div>
      </div>

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

export default Home;