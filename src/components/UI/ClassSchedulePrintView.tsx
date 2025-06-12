import React from 'react';
import { Teacher, Class, Subject, DAYS, PERIODS, getTimeForPeriod, formatTimeRange } from '../../types';

interface ClassSchedulePrintViewProps {
  classItem: Class;
  schedule: { [day: string]: { [period: string]: { teacher: Teacher; subject?: Subject } | null } };
  teachers: Teacher[];
  subjects: Subject[];
}

const ClassSchedulePrintView: React.FC<ClassSchedulePrintViewProps> = ({
  classItem,
  schedule,
  teachers,
  subjects
}) => {
  // Check if a period is fixed (preparation, lunch, or afternoon breakfast)
  const isFixedPeriod = (day: string, period: string): boolean => {
    // For class schedules, we need to check if this is a fixed period based on the period and level
    if (period === 'prep') return true;
    if ((classItem.level === 'İlkokul' || classItem.level === 'Anaokulu') && period === '5') return true;
    if (classItem.level === 'Ortaokul' && period === '6') return true;
    if (period === 'afternoon-breakfast') return true;
    return false;
  };

  // Get fixed period display info with correct text
  const getFixedPeriodInfo = (period: string, level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul') => {
    if (period === 'prep') {
      return {
        title: 'Hazırlık',
        subtitle: level === 'Ortaokul' ? '08:30-08:40' : '08:30-08:50',
        color: 'bg-blue-100 border-blue-300 text-blue-800'
      };
    } else if ((level === 'İlkokul' || level === 'Anaokulu') && period === '5') {
      return {
        title: 'Yemek',
        subtitle: '11:50-12:25',
        color: 'bg-green-100 border-green-300 text-green-800'
      };
    } else if (level === 'Ortaokul' && period === '6') {
      return {
        title: 'Yemek',
        subtitle: '12:30-13:05',
        color: 'bg-green-100 border-green-300 text-green-800'
      };
    } else if (period === 'afternoon-breakfast') {
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
        if (schedule[day][period] && !isFixedPeriod(day, period)) {
          totalHours++;
        }
      });
    });
    return totalHours;
  };

  // Get subject for teacher - find the subject that matches teacher's branch
  const getSubjectForTeacher = (teacher: Teacher): Subject | undefined => {
    return subjects.find(subject => 
      subject.branch === teacher.branch && 
      subject.level === teacher.level
    );
  };

  // Zaman bilgisini al
  const getTimeInfo = (period: string) => {
    const timePeriod = getTimeForPeriod(period, classItem.level);
    if (timePeriod) {
      return formatTimeRange(timePeriod.startTime, timePeriod.endTime);
    }
    return `${period}. Ders`;
  };

  return (
    <div style={{ 
      width: '297mm', 
      height: '210mm',
      padding: '10mm',
      fontSize: '12px',
      lineHeight: '1.4',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      backgroundColor: 'white',
      color: '#000000'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '8mm',
        paddingBottom: '4mm',
        borderBottom: '2px solid #000000'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            margin: '0 0 4px 0',
            color: '#000000'
          }}>
            {classItem.name}
          </h1>
          <p style={{ 
            fontSize: '14px', 
            margin: 0,
            color: '#000000'
          }}>
            {classItem.level} - Ortaokul
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button style={{
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px 16px',
            fontSize: '12px',
            cursor: 'pointer'
          }}>
            📄 PDF İndir
          </button>
        </div>
      </div>

      {/* Schedule Table */}
      <table style={{ 
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '11px'
      }}>
        <thead>
          <tr>
            <th style={{ 
              border: '1px solid #000000',
              padding: '8px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              backgroundColor: '#e6f3ff',
              width: '80px'
            }}>
              SAAT
            </th>
            {DAYS.map(day => (
              <th key={day} style={{ 
                border: '1px solid #000000',
                padding: '8px 4px',
                textAlign: 'center',
                fontWeight: 'bold',
                backgroundColor: '#e6f3ff'
              }}>
                {day.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Hazırlık Period */}
          <tr style={{ backgroundColor: '#f0f8ff' }}>
            <td style={{ 
              border: '1px solid #000000',
              padding: '8px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              backgroundColor: '#e6f3ff'
            }}>
              Hazırlık
            </td>
            {DAYS.map(day => (
              <td key={`${day}-prep`} style={{ 
                border: '1px solid #000000',
                padding: '8px 4px',
                textAlign: 'center',
                backgroundColor: '#f0f8ff'
              }}>
                Hazırlık
              </td>
            ))}
          </tr>

          {PERIODS.map((period, periodIndex) => {
            const timeInfo = getTimeInfo(period);
            const isLunchPeriod = (
              (classItem.level === 'İlkokul' || classItem.level === 'Anaokulu') && period === '5'
            ) || (
              classItem.level === 'Ortaokul' && period === '6'
            );
            
            const showAfternoonBreakAfter = period === '8';
            
            return (
              <React.Fragment key={period}>
                <tr style={{ 
                  backgroundColor: isLunchPeriod ? '#f0fff0' : (periodIndex % 2 === 0 ? '#ffffff' : '#f8f9fa')
                }}>
                  <td style={{ 
                    border: '1px solid #000000',
                    padding: '8px 4px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: isLunchPeriod ? '#e6ffe6' : '#e6f3ff'
                  }}>
                    {isLunchPeriod ? 'Yemek' : `${period}.`}
                  </td>
                  {DAYS.map(day => {
                    if (isLunchPeriod) {
                      return (
                        <td key={`${day}-${period}`} style={{ 
                          border: '1px solid #000000',
                          padding: '8px 4px',
                          textAlign: 'center',
                          backgroundColor: '#f0fff0'
                        }}>
                          Yemek
                        </td>
                      );
                    }
                    
                    const slot = schedule[day][period];
                    
                    return (
                      <td key={`${day}-${period}`} style={{ 
                        border: '1px solid #000000',
                        padding: '8px 4px',
                        textAlign: 'center',
                        backgroundColor: periodIndex % 2 === 0 ? '#ffffff' : '#f8f9fa'
                      }}>
                        {slot ? (
                          <div>
                            <div style={{ 
                              fontWeight: 'bold',
                              fontSize: '10px',
                              marginBottom: '2px'
                            }}>
                              {slot.teacher.name.length > 12 
                                ? slot.teacher.name.substring(0, 12) + '...'
                                : slot.teacher.name
                              }
                            </div>
                            <div style={{ 
                              fontSize: '9px',
                              color: '#666666'
                            }}>
                              {(() => {
                                const subject = getSubjectForTeacher(slot.teacher);
                                const subjectName = subject?.name || slot.teacher.branch;
                                return subjectName.length > 10 
                                  ? subjectName.substring(0, 10) + '...'
                                  : subjectName;
                              })()}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#999999', fontSize: '9px' }}>Boş</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* İkindi Kahvaltısı 8. ders sonrasında */}
                {showAfternoonBreakAfter && (
                  <tr style={{ backgroundColor: '#fffbf0' }}>
                    <td style={{ 
                      border: '1px solid #000000',
                      padding: '8px 4px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      backgroundColor: '#fff3e0'
                    }}>
                      İkindi Kahvaltısı
                    </td>
                    {DAYS.map(day => (
                      <td key={`${day}-afternoon-breakfast`} style={{ 
                        border: '1px solid #000000',
                        padding: '8px 4px',
                        textAlign: 'center',
                        backgroundColor: '#fffbf0'
                      }}>
                        İkindi Kahvaltısı
                      </td>
                    ))}
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ClassSchedulePrintView;