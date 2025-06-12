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
      padding: '6mm',
      fontSize: '10px',
      lineHeight: '1.3',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      boxSizing: 'border-box',
      overflow: 'hidden',
      color: '#1a1a1a'
    }}>
      {/* Header - IMPROVED: Better spacing and typography */}
      <div style={{ 
        background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
        color: 'white', 
        borderRadius: '8px', 
        marginBottom: '4mm',
        padding: '8px',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: '44px', 
              height: '44px', 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginRight: '12px',
              padding: '4px',
              boxSizing: 'border-box',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
                    parent.innerHTML = '<span style="color: #3B82F6; font-weight: bold; font-size: 14px;">İDE</span>';
                  }
                }}
              />
            </div>
            <div>
              <h1 style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                margin: 0,
                letterSpacing: '0.5px'
              }}>
                HAFTALIK DERS PROGRAMI
              </h1>
              <p style={{ 
                fontSize: '10px', 
                margin: 0, 
                opacity: 0.9,
                marginTop: '2px',
                fontWeight: '500'
              }}>
                İDE Okulları - {new Date().getFullYear()}-{new Date().getFullYear() + 1} Eğitim Öğretim Yılı
              </p>
            </div>
          </div>
          <div style={{ 
            textAlign: 'right', 
            fontSize: '9px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '6px 8px',
            borderRadius: '6px'
          }}>
            <p style={{ margin: 0, fontWeight: '600' }}>Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
            <p style={{ margin: 0, marginTop: '2px', fontWeight: '500' }}>Seviye: {teacher.level}</p>
          </div>
        </div>
      </div>

      {/* Teacher Info - IMPROVED: Better layout and typography */}
      <div style={{ 
        backgroundColor: '#F8FAFC', 
        border: '2px solid #E2E8F0', 
        borderRadius: '8px', 
        marginBottom: '4mm',
        padding: '8px',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        {/* PROMINENT TEACHER NAME SECTION */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '8px', 
          padding: '6px',
          background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
          borderRadius: '6px',
          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: 'white', 
            fontSize: '18px', 
            fontWeight: 'bold',
            letterSpacing: '1px',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }}>
            {teacher.name.toUpperCase()}
          </h2>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '8px',
          fontSize: '10px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              margin: 0, 
              color: '#64748B', 
              fontSize: '9px', 
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Branş
            </p>
            <p style={{ 
              margin: 0, 
              fontWeight: 'bold', 
              fontSize: '12px',
              color: '#1E293B',
              marginTop: '2px'
            }}>
              {teacher.branch}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              margin: 0, 
              color: '#64748B', 
              fontSize: '9px', 
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Seviye
            </p>
            <p style={{ 
              margin: 0, 
              fontWeight: 'bold', 
              fontSize: '12px',
              color: '#1E293B',
              marginTop: '2px'
            }}>
              {teacher.level}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              margin: 0, 
              color: '#64748B', 
              fontSize: '9px', 
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Haftalık Toplam
            </p>
            <p style={{ 
              margin: 0, 
              fontWeight: 'bold', 
              color: '#059669', 
              fontSize: '12px',
              marginTop: '2px'
            }}>
              {calculateWeeklyHours()} saat
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              margin: 0, 
              color: '#64748B', 
              fontSize: '9px', 
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Program Türü
            </p>
            <p style={{ 
              margin: 0, 
              fontWeight: 'bold', 
              fontSize: '12px',
              color: '#1E293B',
              marginTop: '2px'
            }}>
              Öğretmen
            </p>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '8px', 
          paddingTop: '6px', 
          borderTop: '1px solid #E2E8F0',
          textAlign: 'center'
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '9px', 
            color: '#64748B',
            fontWeight: '500'
          }}>
            Müdür İmzası: ________________________ &nbsp;&nbsp;&nbsp;&nbsp; Öğretmen İmzası: ________________________
          </p>
        </div>
      </div>

      {/* Schedule Table - IMPROVED: Better spacing and alignment */}
      <div style={{ 
        border: '2px solid #3B82F6', 
        borderRadius: '8px', 
        overflow: 'hidden',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        boxShadow: '0 4px 6px rgba(59, 130, 246, 0.1)'
      }}>
        <table style={{ 
          width: '100%', 
          height: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          flexGrow: 1,
          fontSize: '10px'
        }}>
          <thead>
            <tr style={{ 
              background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
              color: 'white'
            }}>
              <th style={{ 
                border: '1px solid #1E40AF', 
                padding: '8px 4px',
                textAlign: 'center', 
                fontWeight: 'bold',
                fontSize: '10px',
                width: '12%',
                verticalAlign: 'middle',
                letterSpacing: '0.5px'
              }}>
                DERS SAATİ<br />
                <span style={{ 
                  fontSize: '8px', 
                  fontWeight: 'normal',
                  opacity: 0.9
                }}>
                  {teacher.level === 'Ortaokul' ? '(Ortaokul Saatleri)' : '(Genel Saatler)'}
                </span>
              </th>
              {DAYS.map(day => (
                <th key={day} style={{ 
                  border: '1px solid #1E40AF', 
                  padding: '8px 4px', 
                  textAlign: 'center', 
                  fontWeight: 'bold',
                  fontSize: '10px',
                  width: '17.6%',
                  verticalAlign: 'middle',
                  letterSpacing: '0.5px'
                }}>
                  {day.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Preparation Period - IMPROVED: Better styling */}
            <tr style={{ backgroundColor: '#EFF6FF' }}>
              <td style={{ 
                border: '1px solid #CBD5E1', 
                padding: '8px 4px', 
                textAlign: 'center', 
                fontWeight: 'bold', 
                backgroundColor: '#DBEAFE',
                verticalAlign: 'middle'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '44px'
                }}>
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    background: 'linear-gradient(135deg, #3B82F6, #1E40AF)', 
                    color: 'white', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '3px',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                  }}>
                    H
                  </div>
                  <div style={{ 
                    fontSize: '8px', 
                    color: '#1E40AF',
                    fontWeight: '600',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    Hazırlık
                  </div>
                </div>
              </td>
              {DAYS.map(day => {
                const fixedInfo = getFixedPeriodInfo(day, 'prep', teacher.level);
                
                return (
                  <td key={`${day}-prep`} style={{ 
                    border: '1px solid #CBD5E1', 
                    padding: '4px',
                    verticalAlign: 'middle'
                  }}>
                    <div style={{ 
                      backgroundColor: '#DBEAFE', 
                      border: '2px solid #93C5FD', 
                      borderRadius: '6px', 
                      padding: '6px 4px', 
                      textAlign: 'center',
                      minHeight: '32px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                      boxShadow: '0 1px 3px rgba(59, 130, 246, 0.1)'
                    }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: '#1E3A8A', 
                        fontSize: '10px',
                        lineHeight: '1.2',
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
                    backgroundColor: isLunchPeriod ? '#F0FDF4' : (periodIndex % 2 === 0 ? '#FAFAFA' : 'white')
                  }}>
                    <td style={{ 
                      border: '1px solid #CBD5E1', 
                      padding: '8px 4px', 
                      textAlign: 'center', 
                      fontWeight: 'bold', 
                      backgroundColor: isLunchPeriod ? '#DCFCE7' : '#DBEAFE',
                      verticalAlign: 'middle'
                    }}>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '44px'
                      }}>
                        {isLunchPeriod ? (
                          <>
                            <div style={{ 
                              width: '28px', 
                              height: '28px', 
                              background: 'linear-gradient(135deg, #16A34A, #15803D)', 
                              color: 'white', 
                              borderRadius: '50%', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              marginBottom: '3px',
                              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)'
                            }}>
                              Y
                            </div>
                            <div style={{ 
                              fontSize: '8px', 
                              color: '#15803D',
                              fontWeight: '600',
                              textAlign: 'center',
                              lineHeight: '1.2'
                            }}>
                              Yemek
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ 
                              width: '28px', 
                              height: '28px', 
                              background: 'linear-gradient(135deg, #3B82F6, #1E40AF)', 
                              color: 'white', 
                              borderRadius: '50%', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              marginBottom: '3px',
                              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                            }}>
                              {period}
                            </div>
                            <div style={{ 
                              fontSize: '7px', 
                              color: '#1E40AF',
                              fontWeight: '500',
                              textAlign: 'center',
                              lineHeight: '1.2'
                            }}>
                              {timeInfo}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    {DAYS.map(day => {
                      if (isLunchPeriod) {
                        return (
                          <td key={`${day}-${period}`} style={{ 
                            border: '1px solid #CBD5E1', 
                            padding: '4px',
                            verticalAlign: 'middle'
                          }}>
                            <div style={{ 
                              backgroundColor: '#DCFCE7', 
                              border: '2px solid #86EFAC', 
                              borderRadius: '6px', 
                              padding: '6px 4px', 
                              textAlign: 'center',
                              minHeight: '32px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              boxSizing: 'border-box',
                              boxShadow: '0 1px 3px rgba(22, 163, 74, 0.1)'
                            }}>
                              <div style={{ 
                                fontWeight: 'bold', 
                                color: '#15803D', 
                                fontSize: '10px',
                                lineHeight: '1.2',
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
                          border: '1px solid #CBD5E1', 
                          padding: '4px',
                          verticalAlign: 'middle'
                        }}>
                          {slotInfo ? (
                            <div style={{ 
                              backgroundColor: '#EFF6FF', 
                              border: '2px solid #93C5FD', 
                              borderRadius: '6px', 
                              padding: '6px 4px', 
                              textAlign: 'center',
                              minHeight: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxSizing: 'border-box',
                              boxShadow: '0 1px 3px rgba(59, 130, 246, 0.1)'
                            }}>
                              <div style={{ 
                                fontWeight: 'bold', 
                                color: '#1E3A8A', 
                                fontSize: '11px',
                                lineHeight: '1.3',
                                wordWrap: 'break-word',
                                textAlign: 'center',
                                width: '100%'
                              }}>
                                {slotInfo.classItem?.name}
                              </div>
                            </div>
                          ) : (
                            <div style={{ 
                              backgroundColor: '#F8FAFC', 
                              border: '1px solid #E2E8F0', 
                              borderRadius: '6px', 
                              padding: '6px 4px', 
                              textAlign: 'center',
                              minHeight: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxSizing: 'border-box'
                            }}>
                              <span style={{ 
                                color: '#94A3B8', 
                                fontSize: '9px',
                                fontStyle: 'italic',
                                fontWeight: '500'
                              }}>
                                Boş
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* İkindi Kahvaltısı 8. ders sonrasında - IMPROVED */}
                  {showAfternoonBreakAfter && (
                    <tr style={{ backgroundColor: '#FFFBEB' }}>
                      <td style={{ 
                        border: '1px solid #CBD5E1', 
                        padding: '8px 4px', 
                        textAlign: 'center', 
                        fontWeight: 'bold', 
                        backgroundColor: '#FEF3C7',
                        verticalAlign: 'middle'
                      }}>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '44px'
                        }}>
                          <div style={{ 
                            width: '28px', 
                            height: '28px', 
                            background: 'linear-gradient(135deg, #F59E0B, #D97706)', 
                            color: 'white', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            marginBottom: '3px',
                            boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                          }}>
                            İ
                          </div>
                          <div style={{ 
                            fontSize: '7px', 
                            color: '#92400E',
                            fontWeight: '600',
                            textAlign: 'center',
                            lineHeight: '1.2'
                          }}>
                            İkindi Kahvaltısı
                          </div>
                        </div>
                      </td>
                      {DAYS.map(day => {
                        return (
                          <td key={`${day}-afternoon-breakfast`} style={{ 
                            border: '1px solid #CBD5E1', 
                            padding: '4px',
                            verticalAlign: 'middle'
                          }}>
                            <div style={{ 
                              backgroundColor: '#FEF3C7', 
                              border: '2px solid #FDE68A', 
                              borderRadius: '6px', 
                              padding: '6px 4px', 
                              textAlign: 'center',
                              minHeight: '32px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              boxSizing: 'border-box',
                              boxShadow: '0 1px 3px rgba(245, 158, 11, 0.1)'
                            }}>
                              <div style={{ 
                                fontWeight: 'bold', 
                                color: '#92400E', 
                                fontSize: '9px',
                                lineHeight: '1.2',
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

      {/* Footer - IMPROVED: Better typography and spacing */}
      <div style={{ 
        backgroundColor: '#F8FAFC', 
        border: '1px solid #E2E8F0', 
        borderRadius: '8px', 
        marginTop: '3mm',
        padding: '6px',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ 
            margin: 0, 
            fontSize: '8px', 
            color: '#64748B', 
            fontStyle: 'italic',
            fontWeight: '500'
          }}>
            Bu program otomatik olarak oluşturulmuştur. Güncellemeler için okul yönetimine başvurunuz.
          </p>
          <p style={{ 
            margin: 0, 
            fontSize: '7px', 
            color: '#94A3B8',
            marginTop: '3px',
            fontWeight: '400'
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