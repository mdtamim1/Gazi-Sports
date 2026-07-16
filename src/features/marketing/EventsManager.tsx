import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Trash2, Calendar, Image, FileText, Gift, Sparkles, CheckCircle2, Video, HelpCircle, AlertCircle, Upload } from 'lucide-react';
import { fetchEventsFromBackend, createEventInBackend, deleteEventFromBackend } from '../../services/api';
import { convertToWebP } from '../../utils/imageCdn';
import '../storefront-manager/storefront-manager.css';

interface EventData {
  id: string;
  title: string;
  description: string;
  reward_coupon_code: string;
  start_date: string;
  end_date: string;
  image_url: string;
  video_url: string;
  quiz_data: string;
  discount_value: number;
  status: string;
  created_at?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: string;
}

export default function EventsManager() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // New Event Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardCouponCode, setRewardCouponCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [discountValue, setDiscountValue] = useState(15);
  const [status, setStatus] = useState('active');

  // Dynamic Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    { question: '১. কোন খেলায় শাটলকর্ক (shuttlecock) ব্যবহার করা হয়?', options: ['ফুটবল (Football)', 'ক্রিকেট (Cricket)', 'ব্যাডমিন্টন (Badminton)', 'টেনিস (Tennis)'], correct: 'ব্যাডমিন্টন (Badminton)' }
  ]);

  const loadEvents = async () => {
    setLoading(true);
    const res = await fetchEventsFromBackend();
    if (res && res.status === 'success') {
      setEvents(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleAddQuestion = () => {
    if (quizQuestions.length >= 5) {
      alert('You can add a maximum of 5 questions.');
      return;
    }
    setQuizQuestions([...quizQuestions, { question: '', options: ['', '', '', ''], correct: '' }]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (quizQuestions.length <= 1) {
      alert('An event must have at least 1 quiz question.');
      return;
    }
    setQuizQuestions(quizQuestions.filter((_, idx) => idx !== index));
  };

  const handleQuestionTextChange = (index: number, text: string) => {
    const updated = [...quizQuestions];
    updated[index].question = text;
    setQuizQuestions(updated);
  };

  const handleOptionChange = (questionIdx: number, optionIdx: number, value: string) => {
    const updated = [...quizQuestions];
    updated[questionIdx].options[optionIdx] = value;
    // Reset correct option if it was matching this option text
    updated[questionIdx].correct = '';
    setQuizQuestions(updated);
  };

  const handleCorrectOptionSelect = (questionIdx: number, correctText: string) => {
    const updated = [...quizQuestions];
    updated[questionIdx].correct = correctText;
    setQuizQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !rewardCouponCode) {
      alert('Title and Reward Coupon Code are required.');
      return;
    }

    // Validation: check if correct options are specified for all questions
    for (let i = 0; i < quizQuestions.length; i++) {
      if (!quizQuestions[i].question.trim()) {
        alert(`Question ${i + 1} text is empty.`);
        return;
      }
      if (quizQuestions[i].options.some(o => !o.trim())) {
        alert(`Question ${i + 1} has empty options.`);
        return;
      }
      if (!quizQuestions[i].correct) {
        alert(`Please select the correct option for Question ${i + 1}.`);
        return;
      }
    }

    const payload = {
      title,
      description,
      reward_coupon_code: rewardCouponCode.trim().toUpperCase(),
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      image_url: imageUrl || undefined,
      video_url: videoUrl || undefined,
      discount_value: discountValue,
      quiz_data: JSON.stringify(quizQuestions),
      status
    };

    const res = await createEventInBackend(payload);
    if (res && res.status === 'success') {
      alert('Event published successfully!');
      setIsFormOpen(false);
      // Reset form
      setTitle('');
      setDescription('');
      setRewardCouponCode('');
      setStartDate('');
      setEndDate('');
      setImageUrl('');
      setVideoUrl('');
      setDiscountValue(15);
      setQuizQuestions([
        { question: '১. কোন খেলায় শাটলকর্ক (shuttlecock) ব্যবহার করা হয়?', options: ['ফুটবল (Football)', 'ক্রিকেট (Cricket)', 'ব্যাডমিন্টন (Badminton)', 'টেনিস (Tennis)'], correct: 'ব্যাডমিন্টন (Badminton)' }
      ]);
      setStatus('active');
      loadEvents();
    } else {
      alert(res.message || 'Failed to create event.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event? This will also delete customer achievements associated with it.')) {
      return;
    }

    const res = await deleteEventFromBackend(id);
    if (res && res.status === 'success') {
      loadEvents();
    } else {
      alert(res.message || 'Failed to delete event.');
    }
  };

  return (
    <div className="marketing-panel" style={{ padding: '24px', background: 'var(--bg-primary)', minHeight: '85vh', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy style={{ color: '#fbbf24' }} /> Events & Challenges Manager
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Publish custom-made quizzes, videos, and specify coupon discount percentages for storefront events.
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          style={{
            background: 'linear-gradient(135deg, #E92B2B 0%, #c81c1c 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(233, 43, 43, 0.2)'
          }}
        >
          <Plus size={16} /> {isFormOpen ? 'Cancel' : 'Publish New Event'}
        </button>
      </div>

      {isFormOpen && (
        <form 
          onSubmit={handleSubmit}
          className="sfm-card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '30px',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '10px' }}>
            Event Configurations
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label className="sfm-label" style={{ display: 'block', marginBottom: '6px' }}>Event Title *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Summer Sports Quiz Gala"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="sfm-input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="sfm-label" style={{ display: 'block', marginBottom: '6px' }}>Reward Coupon Code *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. SUMMERSPECIAL"
                value={rewardCouponCode}
                onChange={e => setRewardCouponCode(e.target.value)}
                className="sfm-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label className="sfm-label" style={{ display: 'block', marginBottom: '6px' }}>Discount Value (%) *</label>
              <input 
                type="number" 
                required 
                min={1}
                max={99}
                value={discountValue}
                onChange={e => setDiscountValue(Number(e.target.value))}
                className="sfm-input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="sfm-label" style={{ display: 'block', marginBottom: '6px' }}>Status</label>
              <select 
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="sfm-select"
                style={{ width: '100%' }}
              >
                <option value="active" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Active (Live)</option>
                <option value="inactive" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="sfm-label" style={{ display: 'block', marginBottom: '6px' }}>Event Description</label>
            <textarea 
              rows={3}
              placeholder="e.g. কুইজটির সঠিক উত্তর দিয়ে জিতে নিন স্পেশাল ডিসকাউন্ট কুপন..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="sfm-textarea"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label className="sfm-label" style={{ display: 'block', marginBottom: '6px' }}>Event Image (URL or Upload File)</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="e.g. https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="sfm-input"
                  style={{ flex: 1 }}
                />
                <label className="sfm-label" style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  height: '42px',
                  boxSizing: 'border-box',
                  margin: 0
                }}>
                  <Upload size={14} /> Upload Photo
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const webpBase64 = await convertToWebP(file);
                          setImageUrl(webpBase64);
                        } catch (err) {
                          alert('ইমেজ রূপান্তর করতে ব্যর্থ হয়েছে।');
                        }
                      }
                    }} 
                  />
                </label>
              </div>
              {imageUrl && (
                <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                  <img src={imageUrl} alt="Preview" style={{ height: '60px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-primary)' }} />
                  <button 
                    type="button" 
                    onClick={() => setImageUrl('')} 
                    style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}
                  >✕</button>
                </div>
              )}
            </div>
            <div>
              <label className="sfm-label" style={{ display: 'block', marginBottom: '6px' }}>Event Video (YouTube Link or Upload File)</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="e.g. https://www.youtube.com/embed/..."
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  className="sfm-input"
                  style={{ flex: 1 }}
                />
                <label className="sfm-label" style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  height: '42px',
                  boxSizing: 'border-box',
                  margin: 0
                }}>
                  <Upload size={14} /> Upload Video
                  <input 
                    type="file" 
                    accept="video/*" 
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setVideoUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                </label>
              </div>
              {videoUrl && (
                <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                  {videoUrl.startsWith('data:') || videoUrl.endsWith('.mp4') || videoUrl.endsWith('.webm') || videoUrl.endsWith('.ogg') || !videoUrl.includes('youtu') ? (
                    <video src={videoUrl} controls style={{ height: '60px', borderRadius: '6px', border: '1px solid var(--border-primary)' }} />
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-primary)' }}>YouTube Video Configured</div>
                  )}
                  <button 
                    type="button" 
                    onClick={() => setVideoUrl('')} 
                    style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}
                  >✕</button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div>
              <label className="sfm-label" style={{ display: 'block', marginBottom: '6px' }}>Start Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="sfm-input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="sfm-label" style={{ display: 'block', marginBottom: '6px' }}>End Date</label>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="sfm-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* DYNAMIC QUIZ BUILDER */}
          <div style={{ border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px', background: 'rgba(15, 19, 41, 0.4)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HelpCircle size={18} style={{ color: '#E92B2B' }} />
                <span>Configure Quiz Questions ({quizQuestions.length}/5)</span>
              </h4>
              <button
                type="button"
                onClick={handleAddQuestion}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={12} /> Add Question
              </button>
            </div>

            {quizQuestions.map((q, qIdx) => (
              <div 
                key={qIdx} 
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-primary)', 
                  borderRadius: '10px', 
                  padding: '16px', 
                  marginBottom: qIdx === quizQuestions.length - 1 ? 0 : '16px' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#E92B2B' }}>Question {qIdx + 1}</span>
                  {quizQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter question text (e.g. ১. ফুটবল ম্যাচ কত মিনিটের হয়?)"
                    value={q.question}
                    onChange={e => handleQuestionTextChange(qIdx, e.target.value)}
                    className="sfm-input"
                    style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Options Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx}>
                      <input 
                        type="text" 
                        required
                        placeholder={`Option ${optIdx + 1}`}
                        value={opt}
                        onChange={e => handleOptionChange(qIdx, optIdx, e.target.value)}
                        className="sfm-input"
                        style={{ width: '100%', height: '36px', fontSize: '0.82rem' }}
                      />
                    </div>
                  ))}
                </div>

                {/* Correct Option Dropdown Selector */}
                <div>
                  <label className="sfm-label" style={{ display: 'block', marginBottom: '4px' }}>Correct Answer *</label>
                  <select
                    required
                    value={q.correct}
                    onChange={e => handleCorrectOptionSelect(qIdx, e.target.value)}
                    className="sfm-select"
                    style={{ width: '100%', height: '36px', fontSize: '0.82rem' }}
                  >
                    <option value="" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>-- Select Correct Answer --</option>
                    {q.options.map((opt) => opt.trim() && (
                      <option key={opt} value={opt} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button 
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #E92B2B 0%, #c81c1c 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(233, 43, 43, 0.2)'
            }}
          >
            Publish Event
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-primary)', fontWeight: 700 }}>Loading events...</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
          No events found. Click "Publish New Event" to create one.
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text-primary)' }}>Event Info</th>
                <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text-primary)' }}>Reward Code & Discount</th>
                <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text-primary)' }}>Timeline</th>
                <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text-primary)' }}>Status</th>
                <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={event.image_url} alt="" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{event.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                          {event.description}
                        </div>
                        {event.video_url && (
                          <div style={{ fontSize: '0.72rem', color: '#E92B2B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Video size={10} /> <span>Video link configured</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontFamily: 'monospace', background: 'rgba(22, 163, 74, 0.1)', color: '#10b981', border: '1px solid rgba(22, 163, 74, 0.2)', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, width: 'fit-content' }}>
                        {event.reward_coupon_code}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        🎁 {event.discount_value}% Discount
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      <span>{event.start_date} to {event.end_date}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ background: event.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)', color: event.status === 'active' ? '#10b981' : '#94a3b8', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, display: 'inline-block' }}>
                      {event.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(event.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      title="Delete Event"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
