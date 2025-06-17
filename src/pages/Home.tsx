import React from 'react';
import { 
  Users, 
  Building, 
  BookOpen, 
  Calendar, 
  FileText, 
  Eye,
  ArrowRight,
  Clock,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

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
    </div>
  );
};

export default Home;