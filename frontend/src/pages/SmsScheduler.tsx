import React, { useState, useEffect } from 'react';
import { Clock, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SmsJob {
  jobId: string;
  number: string;
  message: string;
  interval?: {
    value: number;
    unit: string;
  };
  dateTime?: string;
}

const SmsScheduler = () => {
  const [number, setNumber] = useState('');
  const [message, setMessage] = useState('');
  const [scheduleType, setScheduleType] = useState<'onetime' | 'periodic'>('onetime');
  const [intervalValue, setIntervalValue] = useState(5);
  const [intervalUnit, setIntervalUnit] = useState('seconds');
  const [dateTime, setDateTime] = useState('');
  const [scheduledJobs, setScheduledJobs] = useState<SmsJob[]>([]);

  useEffect(() => {
    fetchScheduledJobs();
  }, []);

  useEffect(() => {
    console.log('Scheduled SMS Jobs:', scheduledJobs);
  }, [scheduledJobs]);

  const fetchScheduledJobs = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/scheduled-sms');
      const data = await response.json();

      // Transform and validate the jobs data with detailed logging
      const jobsArray: SmsJob[] = Array.isArray(data.jobs)
        ? data.jobs.map((jobData: any, index: number) => {
            console.log(`Raw job data #${index}:`, JSON.stringify(jobData, null, 2)); // Log raw data with formatting
            const job: SmsJob = {
              jobId: jobData.jobId || `job-${Date.now()}-${Math.random()}`,
              number: jobData.number || '',
              message: jobData.message || '',
              interval: undefined,
              dateTime: undefined,
            };

            // Validate and set interval with detailed checks
            if (
              jobData.interval &&
              typeof jobData.interval === 'object' &&
              'value' in jobData.interval &&
              'unit' in jobData.interval &&
              Number.isInteger(Number(jobData.interval.value)) &&
              Number(jobData.interval.value) > 0 &&
              ['seconds', 'minutes', 'hours', 'days'].includes(jobData.interval.unit)
            ) {
              job.interval = {
                value: Number(jobData.interval.value),
                unit: jobData.interval.unit,
              };
              console.log(`Validated interval for job #${index}:`, job.interval);
            } else {
              console.warn(
                `Invalid or missing interval for job #${index}:`,
                jobData.interval,
                'Details:',
                {
                  isObject: typeof jobData.interval === 'object',
                  hasValue: 'value' in (jobData.interval || {}),
                  hasUnit: 'unit' in (jobData.interval || {}),
                  value: jobData.interval?.value,
                  unit: jobData.interval?.unit,
                  isValidValue: Number.isInteger(Number(jobData.interval?.value)) && Number(jobData.interval?.value) > 0,
                  isValidUnit: ['seconds', 'minutes', 'hours', 'days'].includes(jobData.interval?.unit),
                }
              );
            }

            // Validate and set dateTime if present
            if (jobData.dateTime && !isNaN(Date.parse(jobData.dateTime))) {
              job.dateTime = jobData.dateTime;
              console.log(`Validated dateTime for job #${index}:`, job.dateTime);
            } else {
              console.warn(`Invalid or missing dateTime for job #${index}:`, jobData.dateTime);
            }

            return job;
          })
        : [];

      setScheduledJobs(jobsArray);
    } catch (error) {
      console.error('Error fetching scheduled jobs:', error);
      toast.error('Failed to fetch scheduled jobs');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      number,
      message,
      ...(scheduleType === 'periodic'
        ? { interval: { value: intervalValue, unit: intervalUnit } }
        : { dateTime }),
    };

    console.log('Sending payload:', JSON.stringify(payload, null, 2)); // Log payload for debugging

    try {
      const response = await fetch('http://localhost:4000/api/schedule-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text(); // Log raw response for errors
        console.error('Server error response:', errorText);
        throw new Error('Failed to schedule SMS');
      }

      toast.success('SMS scheduled successfully');
      fetchScheduledJobs();

      // Reset form
      setNumber('');
      setMessage('');
      setIntervalValue(5);
      setIntervalUnit('seconds');
      setDateTime('');
    } catch (error) {
      console.error('Error scheduling SMS:', error);
      toast.error('Failed to schedule SMS');
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/delete-sms/${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete job');

      toast.success('Job deleted successfully');
      fetchScheduledJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">SMS Scheduler</h1>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="10 digit phone number"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Schedule Type</label>
            <select
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as 'onetime' | 'periodic')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="onetime">One-time</option>
              <option value="periodic">Periodic</option>
            </select>
          </div>

          {scheduleType === 'periodic' ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Interval Value</label>
                <input
                  type="number"
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter interval value"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Interval Unit</label>
                <select
                  value={intervalUnit}
                  onChange={(e) => setIntervalUnit(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Send At</label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Send className="h-5 w-5 mr-2" />
            Schedule SMS
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Scheduled Jobs</h2>
        <div className="space-y-4">
          {scheduledJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No scheduled jobs found</p>
          ) : (
            scheduledJobs.map((job, index) => (
              <div key={job.jobId || index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{job.number}</h3>
                    <p className="text-sm text-gray-500 mt-1">{job.message}</p>
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {job.interval
                        ? `Every ${job.interval.value} ${job.interval.unit}`
                        : job.dateTime
                        ? `Send at: ${new Date(job.dateTime).toLocaleString()}`
                        : 'Invalid Schedule'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(job.jobId)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SmsScheduler;