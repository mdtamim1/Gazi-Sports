import { useState, useEffect, useRef } from 'react';
import { Search, Send, MessageSquare, ShieldCheck, Clock, User, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { fetchChatHistory, markCustomerChatAsRead } from '../../services/api';

interface ChatMessage {
  id: string;
  customerId: string;
  customerName: string;
  sender: 'customer' | 'admin';
  message: string;
  timestamp: string;
  read: boolean;
}

interface ChatGroup {
  customerId: string;
  customerName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

export default function Inbox() {
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Group messages helper
  const groupMessages = (allChats: ChatMessage[]) => {
    const groupsMap: Record<string, ChatGroup> = {};
    allChats.forEach(msg => {
      const cid = msg.customerId;
      const isUnreadCustomerMsg = msg.sender === 'customer' && !msg.read;

      if (!groupsMap[cid]) {
        groupsMap[cid] = {
          customerId: cid,
          customerName: msg.customerName,
          lastMessage: msg.message,
          timestamp: msg.timestamp,
          unreadCount: isUnreadCustomerMsg ? 1 : 0
        };
      } else {
        groupsMap[cid].lastMessage = msg.message;
        groupsMap[cid].timestamp = msg.timestamp;
        if (isUnreadCustomerMsg) {
          groupsMap[cid].unreadCount += 1;
        }
      }
    });

    const sortedGroups = Object.values(groupsMap).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setChatGroups(sortedGroups);
  };

  // Sync state & localStorage
  const syncChatData = (updated: ChatMessage[]) => {
    setChats(updated);
    localStorage.setItem('storefront_chats', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    groupMessages(updated);
  };

  // Load chats from localStorage
  const loadChatsLocal = () => {
    const stored = localStorage.getItem('storefront_chats');
    if (stored) {
      try {
        const allChats: ChatMessage[] = JSON.parse(stored);
        setChats(allChats);
        groupMessages(allChats);
      } catch (e) {}
    }
  };

  useEffect(() => {
    const initializeChat = async () => {
      // 1. Fetch history from SQLite Database
      const history = await fetchChatHistory();
      if (history && history.length > 0) {
        syncChatData(history);
      } else {
        loadChatsLocal();
      }

      // 2. Open WebSocket
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const wsHost = isLocalDev ? 'localhost:5000' : 'api.tamimglobal.com';
      const wsUrl = `${wsProto}//${wsHost}/ws/chat`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          console.log('⚡ Connected to backend support chat WebSocket server.');
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'message') {
              const newMsg: ChatMessage = payload.data;
              
              setChats(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                const updated = [...prev, newMsg];
                localStorage.setItem('storefront_chats', JSON.stringify(updated));
                window.dispatchEvent(new Event('storage'));
                groupMessages(updated);
                return updated;
              });
            }
          } catch (e) {
            console.error('Error parsing WebSocket message content:', e);
          }
        };

        ws.onerror = (err) => {
          console.warn('WebSocket connection error. Operating in offline fallback polling mode.', err);
        };

        ws.onclose = () => {
          console.warn('WebSocket connection closed. Operating in offline fallback polling mode.');
        };
      } catch (err) {
        console.warn('WebSocket connection failed. Operating in offline fallback polling mode.', err);
      }
    };

    initializeChat();

    // Fallback polling just in case WebSocket is offline or for local synchronizations
    const timer = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        return;
      }
      loadChatsLocal();
    }, 3000);

    return () => {
      clearInterval(timer);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Scroll to bottom when selected chat or messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedCustomerId, chats]);

  // Mark selected customer messages as read
  useEffect(() => {
    if (selectedCustomerId) {
      markCustomerChatAsRead(selectedCustomerId);

      const stored = localStorage.getItem('storefront_chats');
      if (stored) {
        try {
          const allChats: ChatMessage[] = JSON.parse(stored);
          let modified = false;
          
          const updated = allChats.map(msg => {
            if (msg.customerId === selectedCustomerId && msg.sender === 'customer' && !msg.read) {
              modified = true;
              return { ...msg, read: true };
            }
            return msg;
          });

          if (modified) {
            syncChatData(updated);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [selectedCustomerId]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !replyText.trim()) return;

    const selectedGroup = chatGroups.find(g => g.customerId === selectedCustomerId);
    const customerName = selectedGroup ? selectedGroup.customerName : 'Customer';

    const newReply: ChatMessage = {
      id: `msg-reply-${Date.now()}`,
      customerId: selectedCustomerId,
      customerName,
      sender: 'admin',
      message: replyText.trim(),
      timestamp: new Date().toISOString(),
      read: true
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        customerId: selectedCustomerId,
        customerName,
        sender: 'admin',
        message: replyText.trim()
      }));
    } else {
      // Fallback local update
      const storedChats = localStorage.getItem('storefront_chats');
      let allChats: ChatMessage[] = [];
      if (storedChats) {
        try {
          allChats = JSON.parse(storedChats);
        } catch (e) {}
      }
      const updated = [...allChats, newReply];
      syncChatData(updated);
    }
    setReplyText('');
  };

  const handleAdminImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCustomerId) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const selectedGroup = chatGroups.find(g => g.customerId === selectedCustomerId);
      const customerName = selectedGroup ? selectedGroup.customerName : 'Customer';

      const newReply: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        customerId: selectedCustomerId,
        customerName,
        sender: 'admin',
        message: base64String,
        timestamp: new Date().toISOString(),
        read: true
      };

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'message',
          customerId: selectedCustomerId,
          customerName,
          sender: 'admin',
          message: base64String
        }));
      } else {
        const storedChats = localStorage.getItem('storefront_chats');
        let allChats: ChatMessage[] = [];
        if (storedChats) {
          try {
            allChats = JSON.parse(storedChats);
          } catch (e) {}
        }
        const updated = [...allChats, newReply];
        syncChatData(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  // Get active conversation messages
  const activeMessages = chats.filter(m => m.customerId === selectedCustomerId);

  // Filter groups by search term
  const filteredGroups = chatGroups.filter(g => 
    g.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = async () => {
    const history = await fetchChatHistory();
    if (history && history.length > 0) {
      syncChatData(history);
    } else {
      loadChatsLocal();
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb"><span>Home</span><span className="page-breadcrumb-sep">/</span><span>Inbox</span></div>
          <h1 className="page-title">Customer Support Inbox</h1>
          <p className="page-subtitle">Reply to customer queries and manage live chats</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handleRefresh}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '320px 1fr', 
        gap: '24px', 
        height: 'calc(100vh - 200px)', 
        minHeight: '500px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-xl)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden'
      }}>
        {/* Left list panel */}
        <div style={{ borderRight: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-primary)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search chats..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', height: '36px', paddingLeft: '34px', fontSize: 'var(--text-xs)' }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredGroups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ fontSize: 'var(--text-sm)' }}>No conversations found.</p>
              </div>
            ) : (
              filteredGroups.map((group, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedCustomerId(group.customerId)}
                  style={{ 
                    padding: '16px', 
                    borderBottom: '1px solid var(--border-primary)', 
                    cursor: 'pointer',
                    background: selectedCustomerId === group.customerId ? 'rgba(99, 102, 241, 0.15)' : 'none',
                    transition: 'background 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={e => { if (selectedCustomerId !== group.customerId) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                  onMouseLeave={e => { if (selectedCustomerId !== group.customerId) e.currentTarget.style.background = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white' }}>
                        {group.customerName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{group.customerName}</div>
                        <div style={{ 
                          fontSize: 'var(--text-xs)', 
                          color: 'var(--text-secondary)',
                          maxWidth: '160px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '2px'
                        }}>
                          {group.lastMessage.startsWith('data:image/') ? '📷 Image' : group.lastMessage.startsWith('PRODUCT_SHARE:') ? '🛒 Shared Product' : group.lastMessage}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(group.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {group.unreadCount > 0 && (
                        <span style={{ 
                          minWidth: '18px', 
                          height: '18px', 
                          borderRadius: '50%', 
                          background: '#ef4444', 
                          color: 'white', 
                          fontSize: '10px', 
                          fontWeight: 700, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          padding: '0 4px'
                        }}>
                          {group.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right chat panel */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {selectedCustomerId ? (
            <>
              {/* Header */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: 'white' }}>
                    {chatGroups.find(g => g.customerId === selectedCustomerId)?.customerName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {chatGroups.find(g => g.customerId === selectedCustomerId)?.customerName}
                    </h3>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--sf-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--sf-success)' }} /> Active Chat Session
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages scrolling area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(8, 11, 22, 0.4)' }}>
                {activeMessages.map((msg, idx) => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <div 
                      key={idx}
                      style={{ 
                        display: 'flex', 
                        justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                        width: '100%'
                      }}
                    >
                      <div 
                        style={{ 
                          maxWidth: '70%',
                          padding: '12px 16px',
                          borderRadius: '16px',
                          borderTopRightRadius: isAdmin ? '2px' : '16px',
                          borderTopLeftRadius: isAdmin ? '16px' : '2px',
                          background: isAdmin ? 'var(--gradient-primary)' : 'var(--bg-tertiary)',
                          color: isAdmin ? 'white' : 'var(--text-primary)',
                          border: isAdmin ? 'none' : '1px solid var(--border-primary)',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        {msg.message.startsWith('data:image/') ? (
                          <img 
                            src={msg.message} 
                            alt="Sent attachment" 
                            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }} 
                          />
                        ) : msg.message.startsWith('PRODUCT_SHARE:') ? (
                          (() => {
                            try {
                              const productInfo = JSON.parse(msg.message.substring(14));
                              return (
                                <a 
                                  href={`/product/${productInfo.id}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '8px', 
                                    textDecoration: 'none', 
                                    color: 'inherit',
                                    background: isAdmin ? 'rgba(255, 255, 255, 0.1)' : 'var(--bg-primary)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    width: '220px',
                                    border: '1px solid var(--border-primary)'
                                  }}
                                >
                                  <img 
                                    src={productInfo.image} 
                                    alt={productInfo.name} 
                                    style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} 
                                  />
                                  <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {productInfo.name}
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                    <span style={{ fontWeight: 800, fontSize: 'var(--text-sm)', color: isAdmin ? 'white' : 'var(--text-primary)' }}>৳{productInfo.price}</span>
                                    <span style={{ fontSize: '10px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Product Link</span>
                                  </div>
                                </a>
                              );
                            } catch (e) {
                              return <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{msg.message}</div>;
                            }
                          })()
                        ) : (
                          <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                        )}
                        <div style={{ 
                          fontSize: '10px', 
                          textAlign: 'right', 
                          marginTop: '6px', 
                          opacity: 0.6,
                          color: isAdmin ? 'white' : 'var(--text-muted)'
                        }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Reply box editor */}
              <form onSubmit={handleSendReply} style={{ padding: '16px 24px', borderTop: '1px solid var(--border-primary)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '8px', border: '1.5px solid var(--border-primary)', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'background 0.2s', backgroundColor: 'transparent' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <Plus size={20} />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAdminImageUpload} 
                    style={{ display: 'none' }} 
                  />
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Type support reply..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  style={{ flex: 1, height: '44px', padding: '0 16px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ height: '44px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Send size={16} /> Send Reply
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>No Chat Selected</h3>
              <p style={{ fontSize: 'var(--text-xs)', marginTop: '4px' }}>Choose a customer conversation from the list to start replying.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
