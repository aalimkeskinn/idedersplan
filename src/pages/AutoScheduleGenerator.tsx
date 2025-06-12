import React, { useState } from 'react';
import { Zap, Settings, Play, Download, AlertTriangle, CheckCircle, Clock, Users, Building, BookOpen, Calendar } from 'lucide-react';
import { Teacher, Class, Subject, Schedule, getTimeForPeriod, formatTimeRange } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import { 
  ScheduleGeneratorEngine, 
  GenerationOptions, 
  GenerationResult,
  getDefaultGenerationOptions,
  validateGenerationOptions
} from '../utils/scheduleGenerator';
import Button from '../components/UI/Button';
import Select from '../components/UI/Select';
import Modal from '../components/UI/Modal';
import ConfirmationModal from '../components/UI/ConfirmationModal';

const AutoScheduleGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>(getDefaultGenerationOptions());
  const [showResultModal, setShowResultModal] = useState(false);

  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: classes } = useFirestore<Class>('classes');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { data: schedules, add: addSchedule, update: updateSchedule } = useFirestore<Schedule>('schedules');
  const { success, error, warning } = useToast();
  const { 
    confirmation, 
    showConfirmation, 
    hideConfirmation
  } = useConfirmation();

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      
      // Validate options
      const validation = validateGenerationOptions(generationOptions);
      if (validation.length > 0) {
        error('Validation Error', validation.join(', '));
        return;
      }

      // Initialize generator
      const generator = new ScheduleGeneratorEngine(teachers, classes, subjects, generationOptions);
      
      // Generate schedule
      const result = await generator.generateSchedules();
      
      setGenerationResult(result);
      setShowResultModal(true);
      
      if (result.success) {
        success('Schedule Generated', 'Schedule generated successfully!');
      } else {
        warning('Partial Success', 'Schedule generation completed with issues');
      }
    } catch (err) {
      console.error('Generation error:', err);
      error('Generation Failed', 'Failed to generate schedule');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!generationResult?.schedules) return;

    try {
      for (const schedule of generationResult.schedules) {
        const scheduleData: Omit<Schedule, 'id'> = {
          teacherId: schedule.teacherId,
          schedule: schedule.schedule,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await addSchedule(scheduleData);
      }
      
      success('Schedules Saved', 'All schedules saved successfully!');
      setShowResultModal(false);
    } catch (err) {
      console.error('Save error:', err);
      error('Save Failed', 'Failed to save schedules');
    }
  };

  const getGenerationStats = () => {
    if (!generationResult?.schedules) return null;

    let totalSlots = 0;
    let filledSlots = 0;

    generationResult.schedules.forEach(schedule => {
      Object.values(schedule.schedule).forEach(day => {
        Object.values(day).forEach(slot => {
          totalSlots++;
          if (slot?.classId) {
            filledSlots++;
          }
        });
      });
    });

    const emptySlots = totalSlots - filledSlots;

    return {
      totalSlots,
      filledSlots,
      emptySlots,
      fillRate: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0
    };
  };

  const stats = getGenerationStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Auto Schedule Generator</h1>
              <p className="text-gray-600">Automatically generate optimized class schedules</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowOptionsModal(true)}
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Options</span>
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Generate Schedule</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Data Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Teachers</p>
              <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Classes</p>
              <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Subjects</p>
              <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Schedules</p>
              <p className="text-2xl font-bold text-gray-900">{schedules.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Generation Result */}
      {generationResult && stats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Generation Result</h2>
            <div className="flex items-center space-x-2">
              {generationResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              <span className={`text-sm font-medium ${
                generationResult.success ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {generationResult.success ? 'Success' : 'Partial Success'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{stats.totalSlots}</p>
              <p className="text-sm text-gray-600">Total Slots</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.filledSlots}</p>
              <p className="text-sm text-gray-600">Filled Slots</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{stats.emptySlots}</p>
              <p className="text-sm text-gray-600">Empty Slots</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.fillRate}%</p>
              <p className="text-sm text-gray-600">Fill Rate</p>
            </div>
          </div>

          {generationResult.warnings.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-yellow-700 mb-2">Warnings:</h3>
              <ul className="text-sm text-yellow-600 space-y-1">
                {generationResult.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <Button
              onClick={handleSaveSchedule}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              <span>Save Schedule</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowResultModal(true)}
            >
              View Details
            </Button>
          </div>
        </div>
      )}

      {/* Options Modal */}
      <Modal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        title="Generation Options"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Periods per Day
            </label>
            <Select
              label=""
              value={generationOptions.maxDailyHours.toString()}
              onChange={(value) => setGenerationOptions(prev => ({
                ...prev,
                maxDailyHours: parseInt(value)
              }))}
              options={[
                { value: '6', label: '6 Periods' },
                { value: '7', label: '7 Periods' },
                { value: '8', label: '8 Periods' },
                { value: '9', label: '9 Periods' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mode
            </label>
            <Select
              label=""
              value={generationOptions.mode}
              onChange={(value) => setGenerationOptions(prev => ({
                ...prev,
                mode: value as GenerationOptions['mode']
              }))}
              options={[
                { value: 'balanced', label: 'Balanced Distribution' },
                { value: 'compact', label: 'Compact Schedule' },
                { value: 'spread', label: 'Spread Out' }
              ]}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="avoidConsecutive"
              checked={generationOptions.avoidConsecutive}
              onChange={(e) => setGenerationOptions(prev => ({
                ...prev,
                avoidConsecutive: e.target.checked
              }))}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="avoidConsecutive" className="text-sm text-gray-700">
              Avoid consecutive periods for same subject
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="prioritizeCore"
              checked={generationOptions.prioritizeCore}
              onChange={(e) => setGenerationOptions(prev => ({
                ...prev,
                prioritizeCore: e.target.checked
              }))}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="prioritizeCore" className="text-sm text-gray-700">
              Prioritize core subjects
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="respectTimeSlots"
              checked={generationOptions.respectTimeSlots}
              onChange={(e) => setGenerationOptions(prev => ({
                ...prev,
                respectTimeSlots: e.target.checked
              }))}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="respectTimeSlots" className="text-sm text-gray-700">
              Respect time slot constraints
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="preferMorningHours"
              checked={generationOptions.preferMorningHours}
              onChange={(e) => setGenerationOptions(prev => ({
                ...prev,
                preferMorningHours: e.target.checked
              }))}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="preferMorningHours" className="text-sm text-gray-700">
              Prefer morning hours
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowOptionsModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowOptionsModal(false)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Apply Options
            </Button>
          </div>
        </div>
      </Modal>

      {/* Result Details Modal */}
      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title="Schedule Generation Details"
        size="lg"
      >
        {generationResult && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Teachers Assigned</h3>
                <p className="text-lg font-semibold">{generationResult.statistics.teachersAssigned}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Classes Assigned</h3>
                <p className="text-lg font-semibold">{generationResult.statistics.classesAssigned}</p>
              </div>
            </div>

            {generationResult.warnings.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Warnings</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {generationResult.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {generationResult.conflicts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Conflicts</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <ul className="text-sm text-red-700 space-y-1">
                    {generationResult.conflicts.map((conflict, index) => (
                      <li key={index}>• {conflict}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Generated Schedules Preview</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="text-sm">
                  <p className="font-medium mb-2">
                    {generationResult.schedules.length} teacher schedules generated
                  </p>
                  {generationResult.schedules.slice(0, 3).map((schedule, index) => {
                    const teacher = teachers.find(t => t.id === schedule.teacherId);
                    const slotCount = Object.values(schedule.schedule).reduce((total, day) => 
                      total + Object.keys(day).length, 0
                    );
                    
                    return (
                      <div key={index} className="py-1">
                        <span className="font-medium">{teacher?.name || 'Unknown Teacher'}</span>: {slotCount} slots
                      </div>
                    );
                  })}
                  {generationResult.schedules.length > 3 && (
                    <p className="text-gray-500 mt-2">
                      ... and {generationResult.schedules.length - 3} more schedules
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowResultModal(false)}
              >
                Close
              </Button>
              <Button
                onClick={handleSaveSchedule}
                className="bg-green-600 hover:bg-green-700"
              >
                Save Schedules
              </Button>
            </div>
          </div>
        )}
      </Modal>

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

export default AutoScheduleGenerator;