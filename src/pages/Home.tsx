import React from 'react';
import { 
  School, 
  Users, 
  Building, 
  BookOpen, 
  Calendar, 
  FileText, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  Star,
  Target,
  Zap,
  Shield,
  Download,
  Eye,
  Settings,
  Coffee,
  Utensils
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/UI/Button';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'Öğretmen Yönetimi',
      description: 'Öğretmenleri ekleyin, düzenleyin ve branşlarına göre organize edin',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      path: '/teachers'
    },
    {
      icon: Building,
      title: 'Sınıf Yönetimi',
      description: 'Sınıfları seviyelerine göre kategorize edin ve yönetin',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      path: '/classes'
    },
    {
      icon: BookOpen,
      title: 'Ders Yönetimi',
      description: 'Dersleri branş ve seviyelerine göre organize edin',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      path: '/subjects'
    },
    {
      icon: Calendar,
      title: 'Program Oluşturma',
      description: 'Öğretmen veya sınıf bazlı ders programları oluşturun',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      path: '/schedules'
    },
    {
      icon: Eye,
      title: 'Program Görüntüleme',
      description: 'Oluşturulan programları görüntüleyin ve inceleyin',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      path: '/all-schedules'
    },
    {
      icon: FileText,
      title: 'PDF Çıktı',
      description: 'Programları profesyonel PDF formatında indirin',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      path: '/pdf'
    }
  ];

  const steps = [
    {
      number: '1',
      title: 'Dersler',
      description: 'Önce dersleri ekleyin (Matematik, Türkçe, Fen Bilimleri vb.)',
      icon: BookOpen,
      color: 'bg-indigo-500'
    },
    {
      number: '2',
      title: 'Öğretmenler',
      description: 'Öğretmenleri branş ve seviyelerine göre ekleyin',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      number: '3',
      title: 'Sınıflar',
      description: 'Sınıfları seviyelerine göre (Anaokulu, İlkokul, Ortaokul) ekleyin',
      icon: Building,
      color: 'bg-emerald-500'
    },
    {
      number: '4',
      title: 'Program Oluştur',
      description: 'Öğretmen veya sınıf bazlı ders programları oluşturun',
      icon: Calendar,
      color: 'bg-purple-500'
    },
    {
      number: '5',
      title: 'PDF İndir',
      description: 'Hazır programları PDF olarak indirin ve yazdırın',
      icon: Download,
      color: 'bg-orange-500'
    }
  ];

  const timeSchedules = [
    {
      level: 'Anaokulu & İlkokul',
      icon: Coffee,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      schedule: [
        { time: '08:30-08:50', activity: 'Kahvaltı', type: 'break' },
        { time: '08:50-09:25', activity: '1. Ders', type: 'lesson' },
        { time: '09:25-09:35', activity: 'Teneffüs', type: 'break' },
        { time: '09:35-10:10', activity: '2. Ders', type: 'lesson' },
        { time: '11:50-12:25', activity: 'Yemek (5. Ders)', type: 'lunch' },
        { time: '14:35-14:45', activity: 'İkindi Kahvaltısı', type: 'break' }
      ]
    },
    {
      level: 'Ortaokul',
      icon: Utensils,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      schedule: [
        { time: '08:30-08:40', activity: 'Hazırlık', type: 'break' },
        { time: '08:40-09:15', activity: '1. Ders', type: 'lesson' },
        { time: '09:15-09:35', activity: 'Kahvaltı', type: 'break' },
        { time: '09:35-10:10', activity: '2. Ders', type: 'lesson' },
        { time: '12:30-13:05', activity: 'Yemek (6. Ders)', type: 'lunch' },
        { time: '14:35-14:45', activity: 'İkindi Kahvaltısı', type: 'break' }
      ]
    }
  ];

  const tips = [
    {
      icon: Target,
      title: 'Çakışma Kontrolü',
      description: 'Sistem otomatik olarak çakışmaları tespit eder ve uyarır'
    },
    {
      icon: Zap,
      title: 'Hızlı İşlem',
      description: 'Toplu ekleme özelliği ile çok sayıda veri hızlıca ekleyin'
    },
    {
      icon: Shield,
      title: 'Güvenli Saklama',
      description: 'Verileriniz Firebase ile güvenli şekilde saklanır'
    },
    {
      icon: Clock,
      title: 'Otomatik Saatler',
      description: 'Yemek, kahvaltı ve teneffüs saatleri otomatik eklenir'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Hero Section - REDUCED HEIGHT */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-white bg-opacity-20 rounded-full backdrop-blur-sm">
                <School className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              İDE Okulları
              <span className="block text-xl md:text-2xl font-normal mt-2 text-blue-100">
                Ders Programı Yönetim Sistemi
              </span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
              Okul ders programlarını kolayca oluşturun, yönetin ve PDF olarak indirin. 
              Çakışma kontrolü, otomatik saatler ve profesyonel çıktılar.
            </p>
            {/* REMOVED: Öğretmenler button, kept only Hemen Başla */}
            <div className="flex justify-center">
              <Button
                onClick={() => navigate('/schedules')}
                variant="secondary"
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                Hemen Başla
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Sistem Özellikleri
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ders programı yönetimi için ihtiyacınız olan tüm araçlar tek bir yerde
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              onClick={() => navigate(feature.path)}
              className="group cursor-pointer bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
            >
              <div className={`${feature.bgColor} w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`w-8 h-8 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
              <div className="mt-4 flex items-center text-blue-600 font-medium group-hover:translate-x-2 transition-transform duration-300">
                Başla <ArrowRight className="ml-2 w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step by Step Guide */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Nasıl Kullanılır?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              5 basit adımda ders programınızı oluşturun
            </p>
          </div>

          <div className="relative">
            {/* Connection Lines */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 via-emerald-500 via-purple-500 to-orange-500 transform -translate-y-1/2"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 text-center relative z-10">
                    <div className={`${step.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl shadow-lg`}>
                      {step.number}
                    </div>
                    <div className="mb-4">
                      <step.icon className="w-8 h-8 text-gray-600 mx-auto" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Time Schedules */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ders Saatleri
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Seviyeye göre otomatik ders saatleri ve molalar
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {timeSchedules.map((schedule, index) => (
            <div key={index} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <div className="flex items-center mb-6">
                <div className={`${schedule.bgColor} w-12 h-12 rounded-xl flex items-center justify-center mr-4`}>
                  <schedule.icon className={`w-6 h-6 ${schedule.color}`} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {schedule.level}
                </h3>
              </div>
              
              <div className="space-y-3">
                {schedule.schedule.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        item.type === 'lesson' ? 'bg-blue-500' :
                        item.type === 'lunch' ? 'bg-green-500' :
                        'bg-orange-500'
                      }`}></div>
                      <span className="font-medium text-gray-900">{item.activity}</span>
                    </div>
                    <span className="text-sm text-gray-600 font-mono">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips & Features */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Akıllı Özellikler
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Sisteminizi daha verimli kullanmanız için gelişmiş özellikler
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {tips.map((tip, index) => (
              <div key={index} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-opacity-20 transition-all duration-300">
                <div className="bg-white bg-opacity-20 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <tip.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">
                  {tip.title}
                </h3>
                <p className="text-blue-100 text-sm leading-relaxed">
                  {tip.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-emerald-500 to-blue-500 rounded-3xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Hemen Başlayın!
          </h2>
          <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
            Ders programınızı oluşturmaya başlamak için aşağıdaki adımları takip edin
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <Button
              onClick={() => navigate('/subjects')}
              variant="secondary"
              size="lg"
              className="bg-white text-emerald-600 hover:bg-emerald-50"
            >
              <BookOpen className="mr-2 w-5 h-5" />
              1. Dersler
            </Button>
            <Button
              onClick={() => navigate('/teachers')}
              variant="secondary"
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              <Users className="mr-2 w-5 h-5" />
              2. Öğretmenler
            </Button>
            <Button
              onClick={() => navigate('/classes')}
              variant="secondary"
              size="lg"
              className="bg-white text-purple-600 hover:bg-purple-50"
            >
              <Building className="mr-2 w-5 h-5" />
              3. Sınıflar
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <School className="w-12 h-12 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold mb-4">İDE Okulları Ders Programı Sistemi</h3>
          <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Modern, kullanıcı dostu ve güvenilir ders programı yönetim sistemi. 
            Firebase altyapısı ile verileriniz güvende, çakışma kontrolü ile hatasız programlar.
          </p>
          <div className="mt-8 flex justify-center space-x-6 text-sm text-gray-500">
            <span>✓ Çakışma Kontrolü</span>
            <span>✓ PDF Çıktı</span>
            <span>✓ Otomatik Saatler</span>
            <span>✓ Güvenli Saklama</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;