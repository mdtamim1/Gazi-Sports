import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Sparkles, Flame, CheckCircle, Lock, ArrowRight, X, HelpCircle, Copy, Check } from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { fetchEventsFromBackend, fetchCustomerAchievements, addCustomerAchievement } from '../services/api';
import { SEOMeta } from '../components/layout/SEOMeta';

interface QuizQuestion {
  question: string;
  options: string[];
  correct: string;
}

interface EventData {
  id: string;
  title: string;
  description: string;
  reward_coupon_code: string;
  start_date: string;
  end_date: string;
  image_url: string;
  video_url?: string;
  quiz_data?: string;
  discount_value?: number;
  status: string;
}

interface Achievement {
  id: number;
  event_id: string;
  reward_code: string;
  claimed_at: string;
}

export default function EventsPage() {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventData[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlayEvent, setActivePlayEvent] = useState<EventData | null>(null);

  // Quiz game state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizSuccess, setQuizSuccess] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [rewardCode, setRewardCode] = useState('');
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  // Parse dynamic quiz questions from event data
  const quizQuestions = React.useMemo<QuizQuestion[]>(() => {
    if (!activePlayEvent || !activePlayEvent.quiz_data) return [];
    try {
      const parsed = typeof activePlayEvent.quiz_data === 'string'
        ? JSON.parse(activePlayEvent.quiz_data)
        : activePlayEvent.quiz_data;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse quiz data:', e);
      return [];
    }
  }, [activePlayEvent]);

  const loadData = async () => {
    setLoading(true);
    const evRes = await fetchEventsFromBackend();
    if (evRes && evRes.status === 'success') {
      setEvents(evRes.data || []);
    }

    if (customer && customer.email) {
      const achRes = await fetchCustomerAchievements(customer.email);
      if (achRes && achRes.status === 'success') {
        setAchievements(achRes.data || []);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [customer]);

  const handleStartPlay = (event: EventData) => {
    if (!customer) {
      alert("ইভেন্টে অংশগ্রহণ করতে প্রথমে আপনার জিমেইল অ্যাকাউন্ট দিয়ে লগইন করুন।");
      navigate('/account');
      return;
    }
    // Set play state
    setActivePlayEvent(event);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setQuizFinished(false);
    setQuizSuccess(false);
    setRewardCode('');
  };

  const handleOptionSelect = (option: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: option }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Calculate quiz results
      let allCorrect = true;
      quizQuestions.forEach((q, idx) => {
        if (answers[idx] !== q.correct) {
          allCorrect = false;
        }
      });

      setQuizFinished(true);
      if (allCorrect) {
        setQuizSuccess(true);
        handleClaimReward();
      } else {
        setQuizSuccess(false);
      }
    }
  };

  const handleClaimReward = async () => {
    if (!activePlayEvent || !customer || !customer.email) return;
    setClaimLoading(true);
    const res = await addCustomerAchievement(activePlayEvent.id, customer.email);
    if (res && res.status === 'success') {
      setRewardCode(res.data.reward_code);
      // Reload achievements list
      const achRes = await fetchCustomerAchievements(customer.email);
      if (achRes && achRes.status === 'success') {
        setAchievements(achRes.data || []);
      }
    } else {
      alert(res.message || "পুরস্কার ক্লেইম করা ব্যর্থ হয়েছে।");
    }
    setClaimLoading(false);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedMap(prev => ({ ...prev, [code]: true }));
    setTimeout(() => {
      setCopiedMap(prev => ({ ...prev, [code]: false }));
    }, 2000);
  };

  return (
    <>
      <SEOMeta 
        title="Gazi Sports Interactive Events" 
        description="Participate in Gazi Sports events, answer sports quizzes, and unlock exclusive discounts credited directly to your verified customer account." 
      />
      <div style={{ maxWidth: 'var(--sf-max-width)', margin: '0 auto', padding: '40px 24px', minHeight: '80vh' }}>
        {/* Banner */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #111 0%, #222 50%, #E92B2B 100%)',
            borderRadius: '20px',
            padding: '40px 30px',
            color: 'white',
            textAlign: 'center',
            marginBottom: '40px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', top: '10px', right: '20px', opacity: 0.1 }}><Trophy size={160} /></div>
          <span style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px 16px', borderRadius: '30px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sparkles size={14} style={{ color: '#fbbf24' }} /> কাস্টমার অ্যাচিভমেন্ট ও পুরস্কার
          </span>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            GAZI SPORTS EVENTS
          </h1>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#e2e8f0', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
            আমাদের বিভিন্ন ইভেন্টে অংশ নিয়ে সঠিক চ্যালেঞ্জ সম্পন্ন করুন এবং সরাসরি আপনার ওয়ালেটে কুপন ডিসকাউন্ট জিতে নিন!
          </p>
        </div>

        {/* Info Box */}
        <div style={{ background: 'rgba(233, 43, 43, 0.04)', borderLeft: '4px solid #E92B2B', padding: '16px 20px', borderRadius: '8px', marginBottom: '30px', fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.6 }}>
          💡 <strong>অংশগ্রহণের শর্তাবলী:</strong> ইভেন্টগুলোতে অংশ নিতে অবশ্যই একটি **বাস্তব জিমেইল (@gmail.com)** অ্যাকাউন্ট দিয়ে গাজী স্পোর্টসে একাউন্ট তৈরি করে লগইন করতে হবে। অর্জিত সকল কুপন ও অ্যাচিভমেন্ট আপনার আইডিতে লাইফটাইম সেভ থাকবে।
        </div>

        {/* Events Section */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #E92B2B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--sf-text-tertiary)' }}>ইভেন্ট লোড হচ্ছে...</p>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '12px', border: '1.5px solid var(--sf-border)' }}>
            <Trophy size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <h3 style={{ margin: 0 }}>কোনো সক্রিয় ইভেন্ট নেই</h3>
            <p style={{ color: 'var(--sf-text-tertiary)', marginTop: '6px' }}>নতুন কোনো ইভেন্ট পাবলিশ হলে তা এখানে দেখতে পাবেন।</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '30px' }}>
            {events.map((event) => {
              const matchedAchievement = achievements.find(a => String(a.event_id) === String(event.id));
              const isClaimed = !!matchedAchievement;
              const activeCode = isClaimed ? matchedAchievement.reward_code : event.reward_coupon_code;

              return (
                <div 
                  key={event.id}
                  style={{
                    background: 'white',
                    border: '1.5px solid var(--sf-border)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    transition: 'transform 0.3s ease'
                  }}
                >
                  <div style={{ height: '180px', width: '100%', overflow: 'hidden', position: 'relative' }}>
                    <img src={event.image_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', top: '12px', left: '12px', background: isClaimed ? '#10b981' : '#E92B2B', color: 'white', fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase' }}>
                      {isClaimed ? 'Unlocked' : 'Live'}
                    </span>
                    {event.discount_value && (
                      <span style={{ position: 'absolute', top: '12px', right: '12px', background: '#fbbf24', color: '#0f172a', fontSize: '0.75rem', fontWeight: 900, padding: '4px 12px', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                        🎁 {event.discount_value}% OFF
                      </span>
                    )}
                  </div>

                  <div style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--sf-text-primary)' }}>
                        {event.title}
                      </h3>
                      <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                        {event.description}
                      </p>
                      {event.video_url && (
                        <div style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', height: '180px', width: '100%', background: '#000' }}>
                          {event.video_url.startsWith('data:') || event.video_url.endsWith('.mp4') || event.video_url.endsWith('.webm') || event.video_url.endsWith('.ogg') || !event.video_url.includes('youtu') ? (
                            <video 
                              src={event.video_url} 
                              controls 
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <iframe 
                              src={getEmbedUrl(event.video_url)} 
                              title={event.title} 
                              style={{ width: '100%', height: '100%', border: 'none' }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      {isClaimed ? (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 800, fontSize: '0.85rem', marginBottom: '8px' }}>
                            <CheckCircle size={16} /> <span>চ্যালেঞ্জ সফল ও পুরস্কার ক্লেইমড!</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', border: '1.5px dashed #bbf7d0', padding: '8px 12px', borderRadius: '8px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#16a34a', fontSize: '1.1rem' }}>{activeCode}</span>
                            <button 
                              onClick={() => handleCopy(activeCode)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              {copiedMap[activeCode] ? <Check size={14} /> : <Copy size={14} />}
                              <span>{copiedMap[activeCode] ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartPlay(event)}
                          style={{
                            width: '100%',
                            background: '#1e293b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '14px',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'background 0.2s'
                          }}
                        >
                          <Flame size={16} style={{ color: '#f59e0b' }} />
                          <span>ইভেন্ট কুইজ খেলুন (Play Quiz)</span>
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quiz Modal */}
        {activePlayEvent && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: 'white', width: '100%', maxWidth: '520px', borderRadius: '24px', padding: '30px', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', color: '#0f172a' }}>
              {/* Close */}
              <button 
                onClick={() => setActivePlayEvent(null)}
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 8px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', color: '#0f172a' }}>
                <HelpCircle size={22} style={{ color: '#E92B2B' }} />
                <span>স্পোর্টস কুইজ চ্যালেঞ্জ</span>
              </h2>

              {!quizFinished ? (
                <div>
                  <div style={{ margin: '16px 0', display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800, color: '#E92B2B' }}>
                    <span>প্রশ্ন: {currentQuestionIndex + 1} / {quizQuestions.length}</span>
                    <span>সঠিক উত্তর দেয়া বাধ্যতামূলক</span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.5, margin: '0 0 20px 0', color: '#0f172a' }}>
                    {quizQuestions[currentQuestionIndex]?.question}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {quizQuestions[currentQuestionIndex]?.options.map((opt) => {
                      const isSelected = answers[currentQuestionIndex] === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => handleOptionSelect(opt)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '14px 18px',
                            background: isSelected ? 'rgba(233, 43, 43, 0.08)' : '#f8fafc',
                            border: `2px solid ${isSelected ? '#E92B2B' : '#e2e8f0'}`,
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: isSelected ? '#E92B2B' : '#334155',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={!answers[currentQuestionIndex]}
                    onClick={handleNext}
                    style={{
                      width: '100%',
                      marginTop: '24px',
                      background: answers[currentQuestionIndex] ? '#0f172a' : '#cbd5e1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px',
                      fontWeight: 800,
                      cursor: answers[currentQuestionIndex] ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s'
                    }}
                  >
                    {currentQuestionIndex === quizQuestions.length - 1 ? 'সাবমিট করুন' : 'পরবর্তী প্রশ্ন'}
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0 0 0' }}>
                  {quizSuccess ? (
                    <div>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#16a34a' }}>
                        <CheckCircle size={36} />
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a', margin: '0 0 8px 0' }}>কুইজ সফল হয়েছে!</h3>
                      <p style={{ color: '#334155', fontSize: '0.88rem', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                        সবগুলো প্রশ্নের সঠিক উত্তর প্রদানের মাধ্যমে আপনি পুরস্কার ভাউচারটি আনলক করেছেন।
                      </p>

                      {claimLoading ? (
                        <div style={{ padding: '16px 0', color: '#0f172a' }}>কুপন জেনারেট হচ্ছে...</div>
                      ) : (
                        <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '16px', padding: '20px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>আপনার কুপন কোড (Coupon Code)</span>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
                            <span style={{ fontSize: '1.6rem', fontFamily: 'monospace', fontWeight: 900, color: '#16a34a' }}>{rewardCode}</span>
                            <button 
                              onClick={() => handleCopy(rewardCode)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 700 }}
                            >
                              {copiedMap[rewardCode] ? <Check size={16} /> : <Copy size={16} />}
                              <span>{copiedMap[rewardCode] ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setActivePlayEvent(null)}
                        style={{
                          width: '100%',
                          marginTop: '24px',
                          background: '#E92B2B',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '14px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        বন্ধ করুন
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ef4444' }}>
                        <X size={36} />
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444', margin: '0 0 8px 0' }}>দুঃখিত! ভুল উত্তর দেওয়া হয়েছে।</h3>
                      <p style={{ color: '#334155', fontSize: '0.88rem', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                        আপনার যেকোনো প্রশ্নের উত্তর ভুল ছিল। পুরস্কার ভাউচার আনলক করতে সবগুলো উত্তর সঠিক হওয়া আবশ্যক।
                      </p>

                      <button
                        onClick={() => {
                          setCurrentQuestionIndex(0);
                          setAnswers({});
                          setQuizFinished(false);
                        }}
                        style={{
                          width: '100%',
                          background: '#1e293b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '14px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        আবার চেষ্টা করুন (Retry)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('embed/')) return url;
  let videoId = '';
  if (url.includes('shorts/')) {
    videoId = url.split('shorts/')[1]?.split('?')[0] || '';
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
  } else if (url.includes('v=')) {
    videoId = url.split('v=')[1]?.split('&')[0] || '';
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
};
