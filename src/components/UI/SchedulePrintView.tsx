import React from 'react';
import { Teacher, Class, Subject, Schedule, DAYS, PERIODS, getTimeForPeriod, formatTimeRange } from '../../types';

interface SchedulePrintViewProps {
  teacher: Teacher;
  schedule: Schedule;
  subjects: Subject[];
  classes: Class[];
}

const SchedulePrintView: React.FC<SchedulePrintViewProps> = ({
  teacher,
  schedule,
  subjects,
  classes
}) => {
  const getSlotInfo = (day: string, period: string) => {
    const slot = schedule.schedule[day]?.[period];
    if (!slot?.classId) return null;

    const classItem = classes.find(c => c.id === slot.classId);

    return { classItem };
  };

  // Check if a period is fixed (preparation, lunch, or afternoon breakfast)
  const isFixedPeriod = (day: string, period: string): boolean => {
    const slot = schedule.schedule[day]?.[period];
    return slot?.classId === 'fixed-period';
  };

  // Get fixed period display info with correct text
  const getFixedPeriodInfo = (day: string, period: string, level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul') => {
    const slot = schedule.schedule[day]?.[period];
    if (!slot || slot.classId !== 'fixed-period') return null;

    if (slot.subjectId === 'fixed-prep') {
      return {
        title: 'Hazırlık',
        subtitle: level === 'Ortaokul' ? '08:30-08:40' : '08:30-08:50',
        color: 'bg-blue-100 border-blue-300 text-blue-800'
      };
    } else if (slot.subjectId === 'fixed-breakfast') {
      return {
        title: 'Kahvaltı',
        subtitle: '08:30-08:50',
        color: 'bg-orange-100 border-orange-300 text-orange-800'
      };
    } else if (slot.subjectId === 'fixed-lunch') {
      return {
        title: 'Yemek',
        subtitle: level === 'İlkokul' || level === 'Anaokulu' ? '11:50-12:25' : '12:30-13:05',
        color: 'bg-green-100 border-green-300 text-green-800'
      };
    } else if (slot.subjectId === 'fixed-afternoon-breakfast') {
      return {
        title: 'İkindi Kahvaltısı',
        subtitle: '14:35-14:45',
        color: 'bg-yellow-100 border-yellow-300 text-yellow-800'
      };
    }

    return null;
  };

  const calculateWeeklyHours = () => {
    let totalHours = 0;
    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        const slot = schedule.schedule[day]?.[period];
        // Don't count fixed periods in weekly hours
        if (slot?.classId && slot.classId !== 'fixed-period') {
          totalHours++;
        }
      });
    });
    return totalHours;
  };

  // Zaman bilgisini al
  const getTimeInfo = (period: string) => {
    const timePeriod = getTimeForPeriod(period, teacher.level);
    if (timePeriod) {
      return formatTimeRange(timePeriod.startTime, timePeriod.endTime);
    }
    return `${period}. Ders`;
  };

  return (
    <div className="bg-white" style={{ 
      width: '297mm', 
      height: '210mm',
      padding: '4mm',
      fontSize: '10px',
      lineHeight: '1.2',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div className="bg-blue-600 text-white rounded-lg mb-2" style={{ padding: '6px', flexShrink: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div style={{ 
              width: '40px', 
              height: '40px', 
              backgroundColor: 'white', 
              borderRadius: '6px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginRight: '10px',
              padding: '3px',
              boxSizing: 'border-box'
            }}>
              <img 
                src="https://cv.ide.k12.tr/images/ideokullari_logo.png" 
                alt="İDE Okulları Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<span style="color: #3B82F6; font-weight: bold; font-size: 12px;">İDE</span>';
                  }
                }}
              />
            </div>
            <div>
              <h1 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>HAFTALIK DERS PROGRAMI</h1>
              <p style={{ fontSize: '9px', margin: 0, opacity: 0.9 }}>
                İDE Okulları - {new Date().getFullYear()}-{new Date().getFullYear() + 1} Eğitim Öğretim Yılı
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '8px' }}>
            <p style={{ margin: 0 }}>Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
            <p style={{ margin: 0, marginTop: '1px' }}>Seviye: {teacher.level}</p>
          </div>
        </div>
      </div>

      {/* Teacher Info */}
      <div className="bg-gray-50 border border-blue-200 rounded-lg mb-2" style={{ padding: '6px', flexShrink: 0 }}>
        <div className="grid grid-cols-4 gap-3" style={{ fontSize: '9px' }}>
          <div>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '8px', fontWeight: '500' }}>Ad Soyad</p>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '10px' }}>{teacher.name}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '8px', fontWeight: '500' }}>Branş</p>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '10px' }}>{teacher.branch}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '8px', fontWeight: '500' }}>Seviye</p>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '10px' }}>{teacher.level}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '8px', fontWeight: '500' }}>Haftalık Toplam</p>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#059669', fontSize: '10px' }}>{calculateWeeklyHours()} saat</p>
          </div>
        </div>
        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #E5E7EB' }}>
          <p style={{ margin: 0, fontSize: '8px', color: '#6B7280' }}>
            Müdür İmzası: ________________________
          </p>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="border-2 border-blue-200 rounded-lg overflow-hidden" style={{ 
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        <table style={{ 
          width: '100%', 
          height: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          flexGrow: 1
        }}>
          <thead>
            <tr className="bg-blue-600 text-white">
              <th style={{ 
                border: '1px solid #3B82F6', 
                padding: '4px 2px',
                textAlign: 'center', 
                fontWeight: 'bold',
                fontSize: '9px',
                width: '12%',
              }}>
                DERS SAATİ<br />
                <span style={{ fontSize: '7px', fontWeight: 'normal' }}>
                  {teacher.level === 'Ortaokul' ? '(Ortaokul Saatleri)' : '(Genel Saatler)'}
                </span>
              </th>
              {DAYS.map(day => (
                <th key={day} style={{ 
                  border: '1px solid #3B82F6', 
                  padding: '4px 2px', 
                  textAlign: 'center', 
                  fontWeight: 'bold',
                  fontSize: '9px',
                  width: '17.6%',
                }}>
                  {day.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Preparation Period */}
            <tr style={{ backgroundColor: '#EFF6FF' }}>
              <td style={{ 
                border: '1px solid #D1D5DB', 
                padding: '6px 4px', 
                textAlign: 'center', 
                fontWeight: 'bold', 
                backgroundColor: '#DBEAFE',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '40px'
              }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  backgroundColor: '#3B82F6', 
                  color: 'white', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  marginBottom: '2px'
                }}>
                  H
                </div>
                <div style={{ 
                  fontSize: '7px', 
                  color: '#374151',
                  fontWeight: 'normal',
                  textAlign: 'center',
                  lineHeight: '1'
                }}>
                  Hazırlık
                </div>
              </td>
              {DAYS.map(day => {
                const fixedInfo = getFixedPeriodInfo(day, 'prep', teacher.level);
                
                return (
                  <td key={`${day}-prep`} style={{ 
                    border: '1px solid #D1D5DB', 
                    padding: '3px',
                  }}>
                    <div style={{ 
                      backgroundColor: '#DBEAFE', 
                      border: '1px solid #BFDBFE', 
                      borderRadius: '4px', 
                      padding: '4px 2px', 
                      textAlign: 'center',
                      minHeight: '28px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: '#1E3A8A', 
                        fontSize: '9px',
                        lineHeight: '1.1',
                        textAlign: 'center'
                      }}>
                        {fixedInfo?.title || 'Hazırlık'}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>

            {PERIODS.map((period, periodIndex) => {
              const timeInfo = getTimeInfo(period);
              const isLunchPeriod = (
                (teacher.level === 'İlkokul' || teacher.level === 'Anaokulu') && period === '5'
              ) || (
                teacher.level === 'Ortaokul' && period === '6'
              );
              
              const showAfternoonBreakAfter = period === '8';
              
              return (
                <React.Fragment key={period}>
                  <tr style={{ 
                    backgroundColor: isLunchPeriod ? '#F0FDF4' : (periodIndex % 2 === 0 ? '#F9FAFB' : 'white')
                  }}>
                    <td style={{ 
                      border: '1px solid #D1D5DB', 
                      padding: '6px 4px', 
                      textAlign: 'center', 
                      fontWeight: 'bold', 
                      backgroundColor: isLunchPeriod ? '#DCFCE7' : '#DBEAFE',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '40px'
                    }}>
                      {isLunchPeriod ? (
                        <>
                          <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            backgroundColor: '#16A34A', 
                            color: 'white', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            marginBottom: '2px'
                          }}>
                            Y
                          </div>
                          <div style={{ 
                            fontSize: '7px', 
                            color: '#374151',
                            fontWeight: 'normal',
                            textAlign: 'center',
                            lineHeight: '1'
                          }}>
                            Yemek
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            backgroundColor: '#3B82F6', 
                            color: 'white', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            marginBottom: '2px'
                          }}>
                            {period}
                          </div>
                          <div style={{ 
                            fontSize: '6px', 
                            color: '#374151',
                            fontWeight: 'normal',
                            textAlign: 'center',
                            lineHeight: '1'
                          }}>
                            {timeInfo}
                          </div>
                        </>
                      )}
                    </td>
                    {DAYS.map(day => {
                      if (isLunchPeriod) {
                        const fixedInfo = getFixedPeriodInfo(day, period, teacher.level);
                        
                        return (
                          <td key={`${day}-${period}`} style={{ 
                            border: '1px solid #D1D5DB', 
                            padding: '3px',
                          }}>
                            <div style={{ 
                              backgroundColor: '#DCFCE7', 
                              border: '1px solid #BBF7D0', 
                              borderRadius: '4px', 
                              padding: '4px 2px', 
                              textAlign: 'center',
                              minHeight: '28px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              boxSizing: 'border-box'
                            }}>
                              <div style={{ 
                                fontWeight: 'bold', 
                                color: '#15803D', 
                                fontSize: '9px',
                                lineHeight: '1.1',
                                textAlign: 'center'
                              }}>
                                Yemek
                              </div>
                            </div>
                          </td>
                        );
                      }
                      
                      const slotInfo = getSlotInfo(day, period);
                      
                      return (
                        <td key={`${day}-${period}`} style={{ 
                          border: '1px solid #D1D5DB', 
                          padding: '3px',
                        }}>
                          {slotInfo ? (
                            <div style={{ 
                              backgroundColor: '#EFF6FF', 
                              border: '1px solid #BFDBFE', 
                              borderRadius: '4px', 
                              padding: '4px 2px', 
                              textAlign: 'center',
                              minHeight: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxSizing: 'border-box'
                            }}>
                              <div style={{ 
                                fontWeight: 'bold', 
                                color: '#1E3A8A', 
                                fontSize: '11px',
                                lineHeight: '1.1',
                                wordWrap: 'break-word',
                                textAlign: 'center',
                                width: '100%'
                              }}>
                                {slotInfo.classItem?.name}
                              </div>
                            </div>
                          ) : (
                            <div style={{ 
                              backgroundColor: '#F3F4F6', 
                              border: '1px solid #E5E7EB', 
                              borderRadius: '4px', 
                              padding: '4px 2px', 
                              textAlign: 'center',
                              minHeight: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxSizing: 'border-box'
                            }}>
                              <span style={{ 
                                color: '#9CA3AF', 
                                fontSize: '8px',
                                fontStyle: 'italic'
                              }}>
                                Boş
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* İkindi Kahvaltısı 8. ders sonrasında */}
                  {showAfternoonBreakAfter && (
                    <tr style={{ backgroundColor: '#FFFBEB' }}>
                      <td style={{ 
                        border: '1px solid #D1D5DB', 
                        padding: '6px 4px', 
                        textAlign: 'center', 
                        fontWeight: 'bold', 
                        backgroundColor: '#FEF3C7',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '40px'
                      }}>
                        <div style={{ 
                          width: '24px', 
                          height: '24px', 
                          backgroundColor: '#F59E0B', 
                          color: 'white', 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          marginBottom: '2px'
                        }}>
                          İ
                        </div>
                        <div style={{ 
                          fontSize: '6px', 
                          color: '#374151',
                          fontWeight: 'normal',
                          textAlign: 'center',
                          lineHeight: '1'
                        }}>
                          İkindi Kahvaltısı
                        </div>
                      </td>
                      {DAYS.map(day => {
                        const fixedInfo = getFixedPeriodInfo(day, 'afternoon-breakfast', teacher.level);
                        
                        return (
                          <td key={`${day}-afternoon-breakfast`} style={{ 
                            border: '1px solid #D1D5DB', 
                            padding: '3px',
                          }}>
                            <div style={{ 
                              backgroundColor: '#FEF3C7', 
                              border: '1px solid #FDE68A', 
                              borderRadius: '4px', 
                              padding: '4px 2px', 
                              textAlign: 'center',
                              minHeight: '28px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              boxSizing: 'border-box'
                            }}>
                              <div style={{ 
                                fontWeight: 'bold', 
                                color: '#92400E', 
                                fontSize: '8px',
                                lineHeight: '1.1',
                                textAlign: 'center'
                              }}>
                                İkindi Kahvaltısı
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg mt-1" style={{ padding: '4px', flexShrink: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ 
            margin: 0, 
            fontSize: '7px', 
            color: '#6B7280', 
            fontStyle: 'italic'
          }}>
            Bu program otomatik olarak oluşturulmuştur. Güncellemeler için okul yönetimine başvurunuz.
          </p>
          <p style={{ 
            margin: 0, 
            fontSize: '6px', 
            color: '#9CA3AF',
            marginTop: '2px'
          }}>
            Oluşturma Tarihi: {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR')} • 
            Seviye: {teacher.level} • Zaman Dilimi: {teacher.level === 'Ortaokul' ? 'Ortaokul Saatleri' : 'Genel Saatler'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SchedulePrintView;