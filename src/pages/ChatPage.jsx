import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { BACKEND_URL } from '../config';
import { fetchRoomMessages, fetchMessageContext } from '../api/messages';
import {
  fetchChats,
  fetchUnreadCounts,
  startDirectChat,
  createGroupChat,
  addGroupMembers,
  fetchGroupMembers,
  discoverChannels,
  searchChannels,
  joinChannel,
} from '../api/chats';
import { uploadFile } from '../api/attachments';
import MessageContent from '../components/MessageContent';
import MessageAttachment from '../components/MessageAttachment';
import PendingUploadBubble from '../components/PendingUploadBubble';
import CopyButton from '../components/CopyButton';
import EditButton from '../components/EditButton';
import MessageReceipt from '../components/MessageReceipt';
import { indexReadStates, getMessageReceiptStatus } from '../utils/readReceipts';
import ReplyButton, { truncateReply } from '../components/ReplyButton';
import UserSearchModal from '../components/UserSearchModal';
import CreateGroupModal from '../components/CreateGroupModal';
import SettingsModal from '../components/SettingsModal';
import ProfileModal from '../components/ProfileModal';
import MessageLikeButton from '../components/MessageLikeButton';
import Avatar from '../components/Avatar';
import {
  showMessageNotification,
  messagePreview,
  requestNotificationPermission,
  getNotificationPrefs,
  canNotify,
} from '../utils/notifications';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useCall } from '../hooks/useCall';
import ChannelSearchModal from '../components/ChannelSearchModal';
import CreateChannelModal from '../components/CreateChannelModal';
import WallpaperPicker from '../components/WallpaperPicker';
import CallModal from '../components/CallModal';
import ChatWallpaper from '../components/ChatWallpaper';
import ChatMessageSearch from '../components/ChatMessageSearch';
import ChatActionsMenu from '../components/ChatActionsMenu';
import { fetchStarsFeed, deleteStar } from '../api/social';
import StarsBar from '../components/StarsBar';
import CreateStarModal from '../components/CreateStarModal';
import ViewStarsModal from '../components/ViewStarsModal';
import StarReplyPreview from '../components/StarReplyPreview';
import GroupProfileModal from '../components/GroupProfileModal';
import ConnectionBanner from '../components/ConnectionBanner';
import CallMessageBubble from '../components/CallMessageBubble';
import ComposerPlusMenu from '../components/ComposerPlusMenu';
import RoomTypeIcon from '../components/RoomTypeIcon';
import { sendGif } from '../api/gifs';
import {
  Send,
  Menu,
  ChevronLeft,
  X,
  Users,
  Hash,
  MessageCirclePlus,
  MessageCircle,
  Search,
  Pencil,
  LogOut,
} from 'lucide-react';
import VirtualMessageList from '../components/VirtualMessageList';
import { useToast } from '../context/ToastContext';
import { applyMessageToChatLists, applyEditToChatLists } from '../utils/chatPreview';
import { enqueueMessage, getQueuedMessages, removeQueuedMessage } from '../utils/offlineQueue';
import { cacheRoomMessages, getCachedRoomMessages } from '../utils/messageCache';
import { mergeMessages } from '../utils/mergeMessages';

function roomLabel(room) {
  if (!room) return '';
  if (room.type === 'direct') return room.display_name || room.peer?.username || 'Chat';
  if (room.type === 'group') return room.display_name || room.name;
  return room.name ? `#${room.name}` : 'Channel';
}

function unreadMapFromRooms(...roomLists) {
  const counts = {};
  roomLists.flat().forEach((room) => {
    const n = room?.unread_count || 0;
    if (n > 0) counts[room.id] = n;
  });
  return counts;
}

function mergeUnreadMaps(...maps) {
  const merged = {};
  maps.forEach((map) => {
    Object.entries(map || {}).forEach(([id, count]) => {
      const n = parseInt(count, 10) || 0;
      if (n > 0) merged[id] = Math.max(merged[id] || 0, n);
    });
  });
  return merged;
}

function filterRooms(rooms, query) {
  const q = query.trim().toLowerCase();
  if (!q) return rooms;
  return rooms.filter((room) => {
    const label = roomLabel(room).toLowerCase();
    const last = (room.last_message || '').toLowerCase();
    const peer = (room.peer?.username || '').toLowerCase();
    const desc = (room.description || '').toLowerCase();
    return label.includes(q) || last.includes(q) || peer.includes(q) || desc.includes(q);
  });
}

function sumUnread(rooms, unread) {
  return rooms.reduce((sum, room) => sum + (unread[room.id] || 0), 0);
}

export default function ChatPage() {
  const { user, token, logout, updateSession } = useAuth();
  const {
    joinRoom,
    joinRooms,
    setPresenceRoom,
    syncPresence,
    sendMessage,
    sendTyping,
    markRead,
    on,
    onReconnect,
    wake,
    connected,
    reconnecting,
    socket,
  } = useSocket(token);
  const { toast } = useToast();
  const {
    callState,
    callError,
    isMuted,
    speakerOn,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    isCameraOff,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    remoteAudioRef,
    remoteVideoRef,
    localVideoRef,
    clearCallError,
  } = useCall(socket, user, connected);
  const [publicRooms, setPublicRooms] = useState([]);
  const [directChats, setDirectChats] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [typingUsers, setTypingUsers] = useState([]);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileShowList, setMobileShowList] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [roomReads, setRoomReads] = useState({});
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showChannelSearch, setShowChannelSearch] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [createChannelName, setCreateChannelName] = useState('');
  const [showWallpaper, setShowWallpaper] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('chats');
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const [messageActionsId, setMessageActionsId] = useState(null);
  const [discoverList, setDiscoverList] = useState([]);
  const [channelSearchResults, setChannelSearchResults] = useState([]);
  const [joiningChannelId, setJoiningChannelId] = useState(null);
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [profileUserId, setProfileUserId] = useState(null);
  const [starsFeed, setStarsFeed] = useState([]);
  const [showCreateStar, setShowCreateStar] = useState(false);
  const [viewingStars, setViewingStars] = useState(null);
  const [showGroupProfile, setShowGroupProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendingGif, setSendingGif] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [unread, setUnread] = useState({});
  const messagesAreaRef = useRef(null);
  const messageListRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastPendingSendRef = useRef(null);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const activeRoomIdRef = useRef(null);
  const userRef = useRef(user);
  const allRoomsRef = useRef([]);
  const hadSocketConnectionRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    allRoomsRef.current = [...directChats, ...groupChats, ...publicRooms];
  }, [directChats, groupChats, publicRooms]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const chatListSetters = useMemo(
    () => ({ setDirectChats, setGroupChats, setPublicRooms }),
    []
  );

  const flushOfflineQueue = useCallback(() => {
    if (!connected) return;
    const queued = getQueuedMessages();
    if (queued.length === 0) return;
    queued.forEach((item) => {
      const sent = sendMessage(item.roomId, item.content, item.replyToId);
      if (sent) removeQueuedMessage(item.id);
    });
    if (getQueuedMessages().length === 0 && queued.length > 0) {
      toast('Queued messages sent', 'success');
    }
  }, [connected, sendMessage, toast]);

  useEffect(() => {
    if (connected) flushOfflineQueue();
  }, [connected, flushOfflineQueue]);

  const loadStarsFeed = useCallback(async () => {
    try {
      const feed = await fetchStarsFeed();
      setStarsFeed(feed);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadStarsFeed();
  }, [loadStarsFeed]);

  useEffect(() => {
    if (sidebarTab !== 'channels') return;
    discoverChannels()
      .then(setDiscoverList)
      .catch(() => setDiscoverList([]));
  }, [sidebarTab]);

  useEffect(() => {
    if (sidebarTab !== 'channels') {
      setChannelSearchResults([]);
      return undefined;
    }
    const q = listSearchQuery.trim();
    if (q.length < 1) {
      setChannelSearchResults([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      searchChannels(q)
        .then(setChannelSearchResults)
        .catch(() => setChannelSearchResults([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [sidebarTab, listSearchQuery]);

  useEffect(() => {
    setShowMessageSearch(false);
    setHighlightMessageId(null);
  }, [activeRoom?.id]);

  useEffect(() => {
    if (isMobile) setSidebarOpen(true);
    if (isMobile && !activeRoom) setMobileShowList(true);
  }, [isMobile, activeRoom]);

  const loadUnreadCounts = useCallback(async () => {
    try {
      const counts = await fetchUnreadCounts();
      const activeId = activeRoomIdRef.current;
      if (activeId) counts[activeId] = 0;
      setUnread(counts);
    } catch {
      /* ignore */
    }
  }, []);

  const totalUnread = Object.values(unread).reduce((sum, n) => sum + n, 0);

  const sortByUnreadThenRecent = useCallback((rooms) => {
    return [...rooms].sort((a, b) => {
      const unreadDiff = (unread[b.id] || 0) - (unread[a.id] || 0);
      if (unreadDiff !== 0) return unreadDiff;
      const ta = a.last_message_at || a.created_at;
      const tb = b.last_message_at || b.created_at;
      return new Date(tb) - new Date(ta);
    });
  }, [unread]);

  const chatRooms = useMemo(
    () => sortByUnreadThenRecent([...directChats, ...groupChats]),
    [directChats, groupChats, sortByUnreadThenRecent]
  );

  const channelRooms = useMemo(
    () => sortByUnreadThenRecent([...publicRooms]),
    [publicRooms, sortByUnreadThenRecent]
  );

  const filteredChatRooms = useMemo(
    () => filterRooms(chatRooms, listSearchQuery),
    [chatRooms, listSearchQuery]
  );

  const filteredChannelRooms = useMemo(
    () => filterRooms(channelRooms, listSearchQuery),
    [channelRooms, listSearchQuery]
  );

  const chatsUnread = useMemo(() => sumUnread(chatRooms, unread), [chatRooms, unread]);
  const channelsUnread = useMemo(() => sumUnread(channelRooms, unread), [channelRooms, unread]);

  const sidebarRooms = sidebarTab === 'channels' ? channelRooms : chatRooms;

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) EganirA` : 'EganirA';
  }, [totalUnread]);

  const findRoomById = useCallback((roomId) => {
    return allRoomsRef.current.find((r) => r.id === roomId);
  }, []);

  const openRoomById = useCallback((roomId) => {
    const room = findRoomById(roomId);
    if (room) {
      setActiveRoom(room);
      setUnread((prev) => ({ ...prev, [roomId]: 0 }));
      if (window.matchMedia('(max-width: 767px)').matches) setMobileShowList(false);
    }
  }, [findRoomById]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const onSwMessage = (event) => {
      if (event.data?.type === 'eganira_notification' && event.data.roomId) {
        openRoomById(event.data.roomId);
      }
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onSwMessage);
  }, [openRoomById]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    if (!roomId) return;
    const room = findRoomById(roomId);
    if (room) {
      openRoomById(roomId);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [directChats, groupChats, publicRooms, findRoomById, openRoomById]);

  const SCROLL_THRESHOLD = 80;
  const LOAD_OLDER_THRESHOLD = 120;

  const isNearBottom = useCallback(() => {
    const el = messagesAreaRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messageListRef.current) {
      messageListRef.current.scrollToBottom(behavior);
      return;
    }
    const el = messagesAreaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const loadInitialMessages = useCallback(async (roomId) => {
    try {
      const { messages: data, hasMore } = await fetchRoomMessages(roomId);
      setMessages(data);
      setHasMoreOlder(hasMore);
      cacheRoomMessages(roomId, data);
      requestAnimationFrame(() => scrollToBottom('auto'));
    } catch {
      const cached = getCachedRoomMessages(roomId);
      if (cached?.length) {
        setMessages(cached);
        setHasMoreOlder(false);
        toast('Showing cached messages (offline)', 'warning');
        requestAnimationFrame(() => scrollToBottom('auto'));
      } else {
        toast('Could not load messages', 'error');
      }
    }
  }, [scrollToBottom, toast]);

  const syncActiveRoomMessages = useCallback(async () => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;
    try {
      const { messages: latest } = await fetchRoomMessages(roomId);
      setMessages((prev) => {
        const merged = mergeMessages(prev, latest);
        cacheRoomMessages(roomId, merged);
        return merged;
      });
      if (stickToBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom('smooth'));
      }
    } catch {
      /* keep existing messages */
    }
  }, [scrollToBottom]);

  const resyncAfterReconnect = useCallback(() => {
    const roomIds = allRoomsRef.current.map((r) => r.id).filter(Boolean);
    if (roomIds.length) joinRooms(roomIds);
    syncPresence();
    loadUnreadCounts();
    syncActiveRoomMessages();
  }, [joinRooms, syncPresence, loadUnreadCounts, syncActiveRoomMessages]);

  useEffect(() => {
    if (!connected) return;
    if (!hadSocketConnectionRef.current) {
      hadSocketConnectionRef.current = true;
      return;
    }
    resyncAfterReconnect();
  }, [connected, resyncAfterReconnect]);

  useEffect(() => onReconnect(resyncAfterReconnect), [onReconnect, resyncAfterReconnect]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      wake();
      syncPresence();
      loadUnreadCounts();
      syncActiveRoomMessages();
    };
    const onPageShow = () => onVisible();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', onVisible);
    };
  }, [wake, syncPresence, loadUnreadCounts, syncActiveRoomMessages]);

  const fetchReadState = useCallback(async (roomId) => {
    if (!roomId) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/rooms/${roomId}/read-state`);
      setRoomReads((prev) => ({ ...prev, [roomId]: indexReadStates(res.data.reads) }));
    } catch {
      /* ignore */
    }
  }, []);

  const markRoomAsRead = useCallback(() => {
    if (!activeRoom || messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (latest?.id) markRead(activeRoom.id, latest.id);
  }, [activeRoom, messages, markRead]);

  const loadOlderMessages = useCallback(async () => {
    if (!activeRoom || loadingOlderRef.current || !hasMoreOlder) return;
    const oldest = messages[0];
    if (!oldest?.id) return;

    const el = messagesAreaRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;
    const prevScrollTop = el?.scrollTop ?? 0;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const { messages: older, hasMore } = await fetchRoomMessages(activeRoom.id, {
        before: oldest.id,
      });
      if (older.length > 0) {
        setMessages((prev) => {
          const next = mergeMessages(older, prev);
          cacheRoomMessages(activeRoom.id, next);
          return next;
        });
        requestAnimationFrame(() => {
          if (el) {
            el.scrollTop = el.scrollHeight - prevScrollHeight + prevScrollTop;
          }
        });
      }
      setHasMoreOlder(hasMore);
    } catch {
      /* keep hasMoreOlder so user can retry */
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [activeRoom, hasMoreOlder, messages]);

  const refreshChats = useCallback(async () => {
    const { direct, groups } = await fetchChats();
    setDirectChats(direct);
    setGroupChats(groups);
    joinRooms([...direct, ...groups].map((r) => r.id));
    const fromRooms = unreadMapFromRooms(direct, groups);
    const activeId = activeRoomIdRef.current;
    if (activeId) fromRooms[activeId] = 0;
    setUnread((prev) => {
      const merged = mergeUnreadMaps(prev, fromRooms);
      if (activeId) merged[activeId] = 0;
      return merged;
    });
    return { direct, groups };
  }, [joinRooms]);

  const dedupeRooms = useCallback((list) => {
    const byName = new Map();
    list.forEach((room) => {
      const existing = byName.get(room.name);
      if (!existing || new Date(room.created_at) < new Date(existing.created_at)) {
        byName.set(room.name, room);
      }
    });
    return [...byName.values()].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      axios.get(`${BACKEND_URL}/api/rooms`),
      fetchChats(),
      fetchUnreadCounts().catch(() => ({})),
    ]).then(([roomsRes, chats, unreadCountsApi]) => {
      const unique = dedupeRooms(roomsRes.data.map((r) => ({ ...r, type: r.type || 'public' })));
      setPublicRooms(unique);
      setDirectChats(chats.direct);
      setGroupChats(chats.groups);
      const allRooms = [...chats.direct, ...chats.groups, ...unique];
      joinRooms(allRooms.map((r) => r.id));

      const counts = mergeUnreadMaps(
        unreadMapFromRooms(chats.direct, chats.groups, unique),
        unreadCountsApi
      );
      setUnread(counts);

      const onMobile = window.matchMedia('(max-width: 767px)').matches;
      if (onMobile) {
        setMobileShowList(true);
        return;
      }

      const pickUnread = allRooms
        .filter((r) => counts[r.id] > 0)
        .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))[0];
      const pick = pickUnread || allRooms[0];
      if (pick) {
        setActiveRoom(pick);
        setUnread((prev) => ({ ...prev, [pick.id]: 0 }));
      }
    }).catch(() => {});
  }, [user?.id, dedupeRooms, joinRooms]);

  useEffect(() => {
    activeRoomIdRef.current = activeRoom?.id ?? null;
  }, [activeRoom?.id]);

  useEffect(() => {
    if (!activeRoom) return;
    stickToBottomRef.current = true;
    setMessages([]);
    setHasMoreOlder(false);
    joinRoom(activeRoom.id);
    setPresenceRoom(activeRoom.id);
    setUnread((prev) => ({ ...prev, [activeRoom.id]: 0 }));
    loadInitialMessages(activeRoom.id);
    fetchReadState(activeRoom.id);
    setTypingUsers([]);
    setOnlineUsers([]);
    setReplyingTo(null);
    setEditingMessageId(null);
    setMessageActionsId(null);
    setEditDraft('');
    setEditError(null);
    setPendingUpload((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, [activeRoom, joinRoom, setPresenceRoom, loadInitialMessages, fetchReadState]);

  useEffect(() => {
    if (!connected || !activeRoom || messages.length === 0) return;
    const timer = setTimeout(markRoomAsRead, 400);
    return () => clearTimeout(timer);
  }, [connected, activeRoom?.id, messages, markRoomAsRead]);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesAreaRef.current;
    if (!el) return;
    stickToBottomRef.current = isNearBottom();
  }, [isNearBottom]);

  useEffect(() => {
    const el = messagesAreaRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', handleMessagesScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleMessagesScroll);
  }, [handleMessagesScroll, activeRoom?.id]);

  useEffect(() => {
    if (!messageActionsId || !isMobile) return undefined;
    const close = (e) => {
      if (e.target.closest(`#msg-${messageActionsId}`)) return;
      setMessageActionsId(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [messageActionsId, isMobile]);

  useEffect(() => {
    if (!socket) return undefined;

    const offMsg = on('new_message', (msg) => {
      const isActiveRoom = msg.room_id === activeRoomIdRef.current;
      const isOwn = msg.username === userRef.current?.username;

      if (!isOwn && msg.room_id) {
        const tabHidden = document.hidden;
        const prefs = getNotificationPrefs();
        const shouldNotify = prefs.enabled && (!isActiveRoom || tabHidden);

        if (shouldNotify) {
          const room = allRoomsRef.current.find((r) => r.id === msg.room_id);
          const chatName = room ? roomLabel(room) : msg.username;
          const notifyTitle = room?.type === 'direct' ? msg.username : `${msg.username} in ${chatName}`;
          showMessageNotification({
            title: notifyTitle,
            body: messagePreview(msg),
            roomId: msg.room_id,
            onClick: () => openRoomById(msg.room_id),
          });
        }

        if (!isActiveRoom) {
          setUnread((prev) => ({
            ...prev,
            [msg.room_id]: (prev[msg.room_id] || 0) + 1,
          }));
        }
      }

      if (isActiveRoom) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const next = [...prev, msg];
          cacheRoomMessages(msg.room_id, next);
          return next;
        });
      }

      applyMessageToChatLists(msg.room_id, msg, chatListSetters, userRef.current?.id);
    });
    const offMsgError = on('message_error', ({ roomId, error }) => {
      const pending = lastPendingSendRef.current;
      if (pending && pending.roomId === roomId) {
        setInput(pending.content);
        if (pending.replyToId) {
          setReplyingTo(pending.replyTo);
        }
        lastPendingSendRef.current = null;
      }
      toast(error || 'Failed to send message', 'error');
    });
    const offRoom = on('room_added', ({ roomId }) => {
      if (roomId) joinRoom(roomId);
      refreshChats();
    });
    const offOnline = on('online_users', ({ roomId, users }) => {
      if (roomId !== activeRoomIdRef.current) return;
      setOnlineUsers(users || []);
    });
    const offPresenceSnapshot = on('presence_snapshot', ({ onlineUserIds: ids }) => {
      setOnlineUserIds(new Set((ids || []).map(String)));
    });
    const offUserPresence = on('user_presence', ({ userId, online }) => {
      if (!userId) return;
      const id = String(userId);
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(id);
        else next.delete(id);
        return next;
      });
    });
    syncPresence();
    const offTyping = on('user_typing', ({ username, isTyping, roomId }) => {
      if (roomId !== activeRoomIdRef.current) return;
      if (username === userRef.current?.username) return;
      setTypingUsers((prev) =>
        isTyping ? [...new Set([...prev, username])] : prev.filter((u) => u !== username)
      );
    });
    const offEdited = on('message_edited', (msg) => {
      const isActiveRoom = msg.room_id === activeRoomIdRef.current;
      if (isActiveRoom) {
        setMessages((prev) => {
          const next = prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m));
          cacheRoomMessages(msg.room_id, next);
          const last = next[next.length - 1];
          applyEditToChatLists(msg.room_id, msg, chatListSetters, last?.id === msg.id);
          return next;
        });
      } else {
        applyEditToChatLists(msg.room_id, msg, chatListSetters, false);
      }
    });
    const offLike = on('message_like_updated', (payload) => {
      if (payload.room_id !== activeRoomIdRef.current) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== payload.message_id) return m;
          const likedByMe = payload.user_id === userRef.current?.id
            ? payload.liked
            : (m.likes?.liked_by_me || false);
          return {
            ...m,
            likes: { count: payload.like_count, liked_by_me: likedByMe },
          };
        })
      );
    });
    const offRead = on('read_receipt', (receipt) => {
      if (!receipt?.room_id || !receipt?.user_id) return;
      setRoomReads((prev) => ({
        ...prev,
        [receipt.room_id]: {
          ...(prev[receipt.room_id] || {}),
          [receipt.user_id]: {
            lastReadMessageId: receipt.last_read_message_id,
            lastReadAt: receipt.last_read_at,
          },
        },
      }));
    });
    const offStar = on('star_posted', () => {
      loadStarsFeed();
    });
    const offFollower = on('new_follower', ({ follower }) => {
      if (!follower?.username) return;
      const body = `${follower.username} started following you`;
      if (canNotify()) {
        const notification = new Notification('EganirA', {
          body,
          icon: '/logo.png',
          tag: `follow-${follower.id}`,
        });
        notification.onclick = () => {
          window.focus();
          setProfileUserId(follower.id);
          notification.close();
        };
      }
    });
    return () => {
      offMsg?.();
      offMsgError?.();
      offRoom?.();
      offOnline?.();
      offPresenceSnapshot?.();
      offUserPresence?.();
      offTyping?.();
      offEdited?.();
      offLike?.();
      offRead?.();
      offStar?.();
      offFollower?.();
    };
  }, [socket, on, syncPresence, refreshChats, openRoomById, joinRoom, loadStarsFeed, chatListSetters, toast]);

  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages, scrollToBottom]);

  const insertEmoji = (emoji) => {
    const el = inputRef.current;
    if (!el) {
      setInput((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = input.slice(0, start) + emoji + input.slice(end);
    setInput(next);
    requestAnimationFrame(() => {
      const pos = start + emoji.length;
      el.selectionStart = pos;
      el.selectionEnd = pos;
      el.focus();
    });
    sendTyping(activeRoom?.id, true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(activeRoom?.id, false), 1500);
  };

  const handleSend = (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !activeRoom) return;

    const replyToId = replyingTo?.id ?? null;
    const replySnapshot = replyingTo;

    if (!connected || isOffline) {
      enqueueMessage({ roomId: activeRoom.id, content, replyToId });
      setInput('');
      setReplyingTo(null);
      sendTyping(activeRoom.id, false);
      toast('Message queued — will send when reconnected', 'warning');
      return;
    }

    lastPendingSendRef.current = {
      roomId: activeRoom.id,
      content,
      replyToId,
      replyTo: replySnapshot,
    };
    const sent = sendMessage(activeRoom.id, content, replyToId);
    if (!sent) {
      enqueueMessage({ roomId: activeRoom.id, content, replyToId });
      toast('Message queued — will send when reconnected', 'warning');
    } else {
      setTimeout(() => {
        if (lastPendingSendRef.current?.content === content) {
          lastPendingSendRef.current = null;
        }
      }, 8000);
    }
    setInput('');
    setReplyingTo(null);
    sendTyping(activeRoom.id, false);
    stickToBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom('smooth'));
  };

  const handleGifSelect = async (gif) => {
    if (!gif?.gifUrl || !activeRoom || sendingGif || uploading) return;

    setSendingGif(true);
    stickToBottomRef.current = true;
    try {
      const msg = await sendGif(activeRoom.id, gif.gifUrl, {
        title: gif.title,
        replyToId: replyingTo?.id ?? null,
      });
      setReplyingTo(null);
      if (msg.room_id === activeRoomIdRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const next = [...prev, msg];
          cacheRoomMessages(activeRoom.id, next);
          return next;
        });
        requestAnimationFrame(() => scrollToBottom('smooth'));
      }
      applyMessageToChatLists(activeRoom.id, msg, chatListSetters, user?.id);
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to send GIF', 'error');
    } finally {
      setSendingGif(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeRoom || uploading) return;

    const caption = input.trim();
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

    setUploading(true);
    setPendingUpload({ file, progress: 0, previewUrl, caption });
    stickToBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom('smooth'));

    try {
      await uploadFile(activeRoom.id, file, {
        content: caption,
        replyToId: replyingTo?.id ?? null,
        onProgress: (percent) => {
          setPendingUpload((prev) => (prev ? { ...prev, progress: percent } : prev));
        },
      });
      setInput('');
      setReplyingTo(null);
      requestAnimationFrame(() => scrollToBottom('smooth'));
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to upload file';
      toast(message, 'error');
    } finally {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPendingUpload(null);
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    sendTyping(activeRoom?.id, true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(activeRoom?.id, false), 1500);
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const startReply = (msg) => {
    setReplyingTo({
      id: msg.id,
      username: msg.username,
      content: msg.content,
    });
    inputRef.current?.focus();
  };

  const startEdit = (msg) => {
    setEditingMessageId(msg.id);
    setEditDraft(msg.content || '');
    setEditError(null);
    setReplyingTo(null);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditDraft('');
    setEditError(null);
  };

  const saveEdit = async (msg) => {
    const trimmed = editDraft.trim();
    if (!trimmed && !msg.attachment) {
      setEditError('Message cannot be empty');
      return;
    }
    if (!activeRoom) return;

    setEditSaving(true);
    setEditError(null);
    try {
      const res = await axios.patch(
        `${BACKEND_URL}/api/rooms/${activeRoom.id}/messages/${msg.id}`,
        { content: editDraft }
      );
      const updated = res.data.message;
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === msg.id ? updated : m));
        cacheRoomMessages(activeRoom.id, next);
        const last = next[next.length - 1];
        applyEditToChatLists(activeRoom.id, updated, chatListSetters, last?.id === msg.id);
        return next;
      });
      cancelEdit();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Could not save edit');
    } finally {
      setEditSaving(false);
    }
  };

  const groupMessages = (msgs) => {
    const grouped = [];
    msgs.forEach((msg, i) => {
      const prev = msgs[i - 1];
      const isCall = msg.message_type === 'call' || (msg.call_status && msg.call_type);
      const prevIsCall = prev?.message_type === 'call' || (prev?.call_status && prev?.call_type);
      const sameUser = !isCall && !prevIsCall && prev?.username === msg.username;
      const sameMinute = prev && Math.abs(new Date(msg.created_at) - new Date(prev.created_at)) < 60000;
      grouped.push({ ...msg, grouped: sameUser && sameMinute });
    });
    return grouped;
  };

  const groupedMessages = useMemo(() => groupMessages(messages), [messages]);

  const selectRoom = (room) => {
    if (room?.type === 'public') setSidebarTab('channels');
    else setSidebarTab('chats');
    setActiveRoom(room);
    setUnread((prev) => ({ ...prev, [room.id]: 0 }));
    if (isMobile) setMobileShowList(false);
  };

  const handleStartDirect = async (targetUser) => {
    const room = await startDirectChat(targetUser.id);
    if (!room?.id) throw new Error('Could not open chat');
    const chatRoom = { ...room, type: 'direct' };
    setDirectChats((prev) => {
      const exists = prev.find((r) => r.id === chatRoom.id);
      if (exists) {
        return prev.map((r) => (r.id === chatRoom.id ? { ...r, ...chatRoom } : r));
      }
      return [chatRoom, ...prev];
    });
    joinRoom(chatRoom.id);
    selectRoom(chatRoom);
    setShowNewChat(false);
  };

  const handleCreateGroup = async (name, memberIds) => {
    const room = await createGroupChat(name, memberIds);
    setGroupChats((prev) => [room, ...prev]);
    joinRoom(room.id);
    selectRoom(room);
    setShowNewGroup(false);
  };

  const handleAddGroupMembers = async (selectedUsers) => {
    if (!activeRoom?.id) return;
    const memberIds = selectedUsers.map((u) => u.id);
    const result = await addGroupMembers(activeRoom.id, memberIds);
    setGroupChats((prev) =>
      prev.map((r) =>
        r.id === activeRoom.id ? { ...r, member_count: result.member_count } : r
      )
    );
    setActiveRoom((prev) =>
      prev?.id === activeRoom.id ? { ...prev, member_count: result.member_count } : prev
    );
    setShowAddMembers(false);
  };

  const handleChannelJoin = (room) => {
    setPublicRooms((prev) => {
      if (prev.find((r) => r.id === room.id)) return prev;
      return [...prev, room];
    });
    joinRoom(room.id);
    selectRoom(room);
  };

  const handleCreateChannel = (room) => {
    handleChannelJoin(room);
    setShowCreateChannel(false);
  };

  const openAddMembers = async () => {
    if (!activeRoom?.id) return;
    try {
      const members = await fetchGroupMembers(activeRoom.id);
      setGroupMemberIds(members.map((m) => m.id));
      setShowAddMembers(true);
    } catch {
      setGroupMemberIds([]);
      setShowAddMembers(true);
    }
  };

  const handleStartCall = async (callType = 'audio') => {
    if (!activeRoom?.peer) return;
    if (!connected) {
      clearCallError();
      toast('Cannot start call — not connected', 'error');
      return;
    }
    try {
      await startCall(activeRoom.peer, callType);
    } catch {
      /* error shown in CallModal */
    }
  };

  const handleJumpToMessage = async (messageId) => {
    if (!activeRoom?.id) return;
    setShowMessageSearch(false);
    setHighlightMessageId(messageId);
    const exists = messages.some((m) => m.id === messageId);
    if (!exists) {
      try {
        const data = await fetchMessageContext(activeRoom.id, messageId);
        setMessages(data.messages || []);
        setHasMoreOlder(true);
      } catch {
        return;
      }
    }
    requestAnimationFrame(() => {
      const idx = messageListRef.current?.getIndexForMessageId(messageId);
      if (typeof idx === 'number' && idx >= 0) {
        messageListRef.current.scrollToIndex(idx, { align: 'center', behavior: 'smooth' });
      } else {
        document.getElementById(`msg-${messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    setTimeout(() => setHighlightMessageId(null), 2500);
  };

  const handleQuickJoinChannel = async (channel) => {
    if (channel.joined) {
      const room = publicRooms.find((r) => r.id === channel.id) || { ...channel, type: 'public' };
      selectRoom(room);
      return;
    }
    setJoiningChannelId(channel.id);
    try {
      const room = await joinChannel(channel.id);
      handleChannelJoin(room);
    } catch {
      /* ignore */
    } finally {
      setJoiningChannelId(null);
    }
  };

  const handleStarPosted = (star) => {
    setStarsFeed((prev) => {
      const next = [...prev];
      const meIdx = next.findIndex((item) => item.is_me);
      const meUser = {
        id: user.id,
        username: user.username,
        surname: user.surname || null,
        avatar_color: user.avatar_color,
        avatar_url: user.avatar_url || null,
      };
      if (meIdx >= 0) {
        next[meIdx] = {
          ...next[meIdx],
          stars: [...(next[meIdx].stars || []), star],
        };
      } else {
        next.unshift({
          user: meUser,
          is_me: true,
          followed_by_me: true,
          stars: [star],
        });
      }
      return next;
    });
  };

  const handleDeleteStar = async (starId) => {
    try {
      await deleteStar(starId);
      setViewingStars(null);
      loadStarsFeed();
    } catch {
      /* ignore */
    }
  };

  const handleReplyToStar = async ({ feedItem, star, text }) => {
    const ownerId = feedItem?.user?.id;
    if (!ownerId || feedItem?.is_me || !star?.id || !text?.trim()) return;

    if (!connected) {
      toast('Connect to the internet to reply to a star', 'error');
      return;
    }

    try {
      const room = await startDirectChat(ownerId);
      if (!room?.id) throw new Error('Could not open chat');

      const chatRoom = { ...room, type: 'direct' };
      setDirectChats((prev) => {
        const exists = prev.find((r) => r.id === chatRoom.id);
        if (exists) {
          return prev.map((r) => (r.id === chatRoom.id ? { ...r, ...chatRoom } : r));
        }
        return [chatRoom, ...prev];
      });
      joinRoom(chatRoom.id);

      const sent = sendMessage(chatRoom.id, text.trim(), null, star.id);
      if (!sent) {
        toast('Could not send reply — try again', 'error');
        return;
      }

      setViewingStars(null);
      selectRoom(chatRoom);
      stickToBottomRef.current = true;
      requestAnimationFrame(() => scrollToBottom('smooth'));
    } catch (err) {
      toast(err.response?.data?.error || 'Could not send star reply', 'error');
      throw err;
    }
  };

  const UnreadBadge = ({ count, className = '' }) => {
    if (!count) return null;
    return (
      <span
        className={`min-w-[20px] h-5 px-1.5 rounded-full bg-wa-accent text-white text-[11px] font-bold flex items-center justify-center shrink-0 ${className}`}
      >
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  const isUserOnline = (userId) => Boolean(userId && onlineUserIds.has(String(userId)));

  const avatarWithPresence = (username, color, avatarUrl, size, userId) => (
    <div className="relative shrink-0">
      <Avatar username={username} color={color} avatarUrl={avatarUrl} size={size} />
      {isUserOnline(userId) && (
        <span
          className="absolute bottom-0 right-0 block w-3 h-3 rounded-full bg-emerald-400 border-2 border-wa-dark"
          title="Online"
          aria-hidden
        />
      )}
    </div>
  );

  const renderChatItem = (room, compact = false) => {
    const label = roomLabel(room);
    const avatarColor = room.type === 'direct' ? room.peer?.avatar_color : null;
    const avatarUrl = room.type === 'direct' ? room.peer?.avatar_url : null;
    const avatarName = room.type === 'direct' ? room.peer?.username : label;
    const peerId = room.type === 'direct' ? room.peer?.id : null;
    const unreadCount = unread[room.id] || 0;
    const hasUnread = unreadCount > 0;

    if (compact) {
      return (
        <button
          key={room.id}
          type="button"
          className={`relative mx-auto rounded-full transition-opacity ${
            activeRoom?.id === room.id ? 'ring-2 ring-wa-accent' : 'hover:opacity-90'
          }`}
          onClick={() => selectRoom(room)}
          title={hasUnread ? `${label} (${unreadCount} unread)` : label}
        >
          {room.type === 'direct' ? (
            avatarWithPresence(avatarName, avatarColor, avatarUrl, 36, peerId)
          ) : (
            <span className="w-9 h-9 rounded-full bg-wa-surface flex items-center justify-center">
              <RoomTypeIcon room={room} size={18} />
            </span>
          )}
          {hasUnread && (
            <UnreadBadge
              count={unreadCount}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-[10px] px-1"
            />
          )}
        </button>
      );
    }

    return (
      <button
        key={room.id}
        type="button"
        className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-left transition-colors ${
          activeRoom?.id === room.id
            ? 'bg-wa-accent/25 backdrop-blur-sm ring-1 ring-wa-accent/30'
            : 'hover:bg-wa-surface/90 backdrop-blur-sm'
        }`}
        onClick={() => selectRoom(room)}
      >
        {room.type === 'direct' ? (
          avatarWithPresence(avatarName, avatarColor, avatarUrl, 40, peerId)
        ) : (
          <span className="w-10 h-10 rounded-full bg-wa-surface flex items-center justify-center shrink-0">
            <RoomTypeIcon room={room} size={20} />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-sm truncate ${hasUnread ? 'font-bold text-slate-50' : 'font-semibold text-slate-100'}`}>
            {label}
          </div>
          {room.last_message && (
            <div className={`text-xs truncate ${hasUnread ? 'font-semibold text-slate-300' : 'text-wa-muted'}`}>
              {truncateReply(room.last_message, 40)}
            </div>
          )}
        </div>
        <UnreadBadge count={unreadCount} />
      </button>
    );
  };

  const peerIsOnline = activeRoom?.type === 'direct' && activeRoom.peer?.id
    ? isUserOnline(activeRoom.peer.id)
    : false;

  const headerAvatar = activeRoom?.type === 'direct' && activeRoom.peer
    ? avatarWithPresence(
        activeRoom.peer.username,
        activeRoom.peer.avatar_color,
        activeRoom.peer.avatar_url,
        36,
        activeRoom.peer.id,
      )
    : null;

  const placeholder = activeRoom?.type === 'direct'
    ? `Message ${roomLabel(activeRoom)}…`
    : activeRoom?.type === 'group'
      ? `Message ${roomLabel(activeRoom)}…`
      : `Message #${activeRoom?.name || '...'} (Shift+Enter for new line)`;

  const isOwn = (msg) => msg.username === user?.username;

  const updateMessageLikes = (messageId, likes) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, likes } : m))
    );
  };

  const openProfile = (targetUserId) => {
    if (targetUserId) setProfileUserId(targetUserId);
  };

  const showSidebar = !isMobile || mobileShowList;
  const showChat = !isMobile || !mobileShowList;
  const mobileComposerDock = isMobile && showChat && activeRoom;

  return (
    <div className="flex h-full min-h-0 max-h-full overflow-hidden">
      {showNewChat && (
        <UserSearchModal title="New chat" onSelect={handleStartDirect} onClose={() => setShowNewChat(false)} />
      )}
      {showNewGroup && (
        <CreateGroupModal onCreate={handleCreateGroup} onClose={() => setShowNewGroup(false)} />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {profileUserId && (
        <ProfileModal
          userId={profileUserId}
          onClose={() => setProfileUserId(null)}
          onOpenProfile={(id) => setProfileUserId(id)}
          onEditProfile={() => setShowSettings(true)}
          onCall={profileUserId !== user?.id ? async (profile, callType = 'audio') => {
            try {
              await startCall(profile, callType);
            } catch {
              /* permission denied */
            }
          } : undefined}
        />
      )}
      {showAddMembers && (
        <UserSearchModal
          title="Add to group"
          multiSelect
          excludeIds={groupMemberIds}
          onConfirm={handleAddGroupMembers}
          onClose={() => setShowAddMembers(false)}
        />
      )}
      {showCreateChannel && (
        <CreateChannelModal
          initialName={createChannelName}
          onCreate={handleCreateChannel}
          onClose={() => {
            setShowCreateChannel(false);
            setCreateChannelName('');
          }}
        />
      )}
      {showChannelSearch && (
        <ChannelSearchModal
          onJoin={handleChannelJoin}
          onClose={() => setShowChannelSearch(false)}
          onCreate={(name = '') => {
            setCreateChannelName(name);
            setShowChannelSearch(false);
            setShowCreateChannel(true);
          }}
        />
      )}
      {showWallpaper && (
        <WallpaperPicker
          current={user?.chat_wallpaper || 'default'}
          updateSession={updateSession}
          onSelect={() => {}}
          onClose={() => setShowWallpaper(false)}
        />
      )}
      {showCreateStar && (
        <CreateStarModal
          onPosted={handleStarPosted}
          onClose={() => setShowCreateStar(false)}
        />
      )}
      {viewingStars && (
        <ViewStarsModal
          feedItem={viewingStars}
          viewerId={user?.id}
          onClose={() => setViewingStars(null)}
          onDelete={handleDeleteStar}
          onReply={handleReplyToStar}
        />
      )}
      {showGroupProfile && activeRoom?.type === 'group' && (
        <GroupProfileModal
          room={activeRoom}
          onClose={() => setShowGroupProfile(false)}
          onAddMembers={openAddMembers}
          onViewProfile={(id) => {
            setShowGroupProfile(false);
            setProfileUserId(id);
          }}
        />
      )}
      <CallModal
        callState={callState}
        callError={callError}
        isMuted={isMuted}
        speakerOn={speakerOn}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleSpeaker={toggleSpeaker}
        isCameraOff={isCameraOff}
        onDismissError={clearCallError}
        remoteVideoRef={remoteVideoRef}
        localVideoRef={localVideoRef}
        onAccept={() => {
          if (callState?.status === 'incoming') {
            acceptCall({
              callId: callState.callId,
              callType: callState.callType,
              from: callState.peer,
              sdp: callState.sdp,
            });
          }
        }}
        onReject={() => {
          if (callState?.peer && callState?.callId) {
            rejectCall({ from: callState.peer, callId: callState.callId });
          }
        }}
        onEnd={endCall}
        remoteAudioRef={remoteAudioRef}
      />

      <aside
        className={`flex flex-col sidebar-background border-r border-wa-border transition-all duration-200 ${
          isMobile
            ? showSidebar
              ? 'fixed inset-0 z-30 w-full min-w-0'
              : 'hidden'
            : sidebarOpen
              ? 'w-[280px] lg:w-[320px] min-w-[280px]'
              : 'w-16 min-w-[64px]'
        }`}
      >
        <div
          className={`flex items-center h-14 sm:h-[60px] border-b border-wa-border/80 bg-wa-dark/25 backdrop-blur-md shrink-0 ${
            sidebarOpen || isMobile ? 'gap-2 px-3' : 'justify-center px-1'
          }`}
        >
          {sidebarOpen || isMobile ? (
            <>
              <img src="/logo.png" alt="" className="w-7 h-7 rounded-md shrink-0 object-contain" />
              <span className="font-bold text-sm truncate flex-1">EganirA</span>
              {totalUnread > 0 && <UnreadBadge count={totalUnread} />}
              {!isMobile && (
                <button
                  type="button"
                  className="w-9 h-9 rounded-lg text-wa-muted hover:text-slate-200 hover:bg-wa-surface flex items-center justify-center shrink-0"
                  onClick={() => setSidebarOpen(false)}
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              className="w-10 h-10 rounded-lg text-lg text-slate-100 hover:bg-wa-surface flex items-center justify-center"
              onClick={() => setSidebarOpen(true)}
              title="Open sidebar"
              aria-label="Open sidebar"
            >
              <Menu size={20} strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </div>

        {(sidebarOpen || isMobile) && (
          <StarsBar
            feed={starsFeed}
            viewerId={user?.id}
            onCreate={() => setShowCreateStar(true)}
            onViewUser={(item) => {
              setProfileUserId(null);
              setViewingStars(item);
            }}
          />
        )}

        {(sidebarOpen || isMobile) && (
          <div className="shrink-0 px-3 pt-2 pb-1 border-b border-wa-border/60">
            <div className="flex rounded-xl bg-wa-surface/80 p-1 gap-1" role="tablist" aria-label="Sidebar sections">
              <button
                type="button"
                role="tab"
                aria-selected={sidebarTab === 'chats'}
                onClick={() => setSidebarTab('chats')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  sidebarTab === 'chats' ? 'bg-wa-accent text-white shadow-sm' : 'text-wa-muted hover:text-slate-200'
                }`}
              >
                <span>Chats</span>
                {chatsUnread > 0 && <UnreadBadge count={chatsUnread} className="min-w-[18px] h-[18px] text-[10px]" />}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sidebarTab === 'channels'}
                onClick={() => setSidebarTab('channels')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  sidebarTab === 'channels' ? 'bg-wa-accent text-white shadow-sm' : 'text-wa-muted hover:text-slate-200'
                }`}
              >
                <span>Channels</span>
                {channelsUnread > 0 && <UnreadBadge count={channelsUnread} className="min-w-[18px] h-[18px] text-[10px]" />}
              </button>
            </div>
          </div>
        )}

        {(sidebarOpen || isMobile) && (
          <div className="shrink-0 px-3 py-2 border-b border-wa-border/60">
            <input
              type="search"
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.target.value)}
              placeholder={sidebarTab === 'channels' ? 'Search channels…' : 'Search conversations…'}
              className="w-full px-3 py-2 bg-wa-surface border border-wa-border rounded-lg text-sm outline-none focus:border-wa-accent"
            />
          </div>
        )}

        <div className={`shrink-0 border-b border-wa-border ${sidebarOpen || isMobile ? 'px-3 py-2.5' : 'p-1.5'}`}>
          {sidebarOpen || isMobile ? (
            sidebarTab === 'chats' ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-wa-surface hover:bg-wa-border text-sm font-medium transition-colors"
                  onClick={() => setShowNewChat(true)}
                >
                  <MessageCirclePlus size={16} strokeWidth={1.75} aria-hidden />
                  <span>New chat</span>
                </button>
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-wa-surface hover:bg-wa-border text-sm font-medium transition-colors"
                  onClick={() => setShowNewGroup(true)}
                >
                  <Users size={16} strokeWidth={1.75} aria-hidden />
                  <span>Group</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-wa-accent hover:bg-wa-accent-hover text-sm font-medium text-white transition-colors"
                  onClick={() => {
                    setCreateChannelName('');
                    setShowCreateChannel(true);
                  }}
                >
                  <Hash size={16} strokeWidth={1.75} aria-hidden />
                  <span>Create channel</span>
                </button>
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-wa-surface hover:bg-wa-border text-sm font-medium transition-colors"
                  onClick={() => setShowChannelSearch(true)}
                >
                  <Search size={16} strokeWidth={1.75} aria-hidden />
                  <span>Browse</span>
                </button>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-1.5">
              <button type="button" className="w-11 h-11 mx-auto rounded-xl bg-wa-surface hover:bg-wa-border inline-flex items-center justify-center" onClick={() => { setSidebarTab('chats'); setShowNewChat(true); }} title="New chat" aria-label="New chat">
                <MessageCircle size={20} strokeWidth={1.75} className="text-wa-muted" aria-hidden />
              </button>
              <button type="button" className="w-11 h-11 mx-auto rounded-xl bg-wa-surface hover:bg-wa-border inline-flex items-center justify-center" onClick={() => { setSidebarTab('channels'); setShowCreateChannel(true); }} title="Create channel" aria-label="Create channel">
                <Hash size={20} strokeWidth={1.75} className="text-wa-muted" aria-hidden />
              </button>
            </div>
          )}
        </div>

        {!sidebarOpen && (
          <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-2 min-h-0 px-1">
            {sidebarRooms.length === 0 ? (
              <p className="text-[10px] text-wa-muted text-center px-1">No {sidebarTab}</p>
            ) : (
              sidebarRooms.map((room) => renderChatItem(room, true))
            )}
          </div>
        )}

        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto min-h-0 px-2 py-1 sidebar-scroll">
            {sidebarTab === 'chats' && (
              <>
                {filteredChatRooms.length === 0 ? (
                  <p className="text-xs text-wa-muted px-2 py-4 text-center">
                    {listSearchQuery.trim() ? 'No conversations match your search' : 'No chats yet — start a conversation'}
                  </p>
                ) : (
                  filteredChatRooms.map((room) => renderChatItem(room))
                )}
              </>
            )}

            {sidebarTab === 'channels' && (
              <>
                {!listSearchQuery.trim() && (
                  <div className="px-1 py-2 mb-1">
                    <p className="text-[11px] font-semibold text-wa-muted uppercase tracking-wide px-1 mb-2">Discover</p>
                    <div className="flex flex-col gap-1">
                      {(discoverList.filter((c) => !c.joined).slice(0, 6)).map((channel) => (
                        <button
                          key={channel.id}
                          type="button"
                          disabled={joiningChannelId === channel.id}
                          onClick={() => handleQuickJoinChannel(channel)}
                          className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left bg-wa-surface/50 hover:bg-wa-surface border border-wa-border/50 transition-colors disabled:opacity-50"
                        >
                          <span className="w-9 h-9 rounded-full bg-wa-accent/15 text-wa-accent flex items-center justify-center shrink-0">
                            <Hash size={16} strokeWidth={2} aria-hidden />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{channel.name}</div>
                            {channel.description && (
                              <div className="text-xs text-wa-muted truncate">{channel.description}</div>
                            )}
                          </div>
                          <span className="text-xs text-wa-accent shrink-0">
                            {joiningChannelId === channel.id ? '…' : 'Join'}
                          </span>
                        </button>
                      ))}
                      {discoverList.filter((c) => !c.joined).length === 0 && (
                        <p className="text-xs text-wa-muted px-2 py-2">You&apos;ve joined all recent channels — create one!</p>
                      )}
                    </div>
                  </div>
                )}

                {listSearchQuery.trim() && channelSearchResults.length > 0 && (
                  <div className="px-1 py-2 mb-1">
                    <p className="text-[11px] font-semibold text-wa-muted uppercase tracking-wide px-1 mb-2">Search results</p>
                    {channelSearchResults.map((channel) => (
                      <button
                        key={`search-${channel.id}`}
                        type="button"
                        disabled={joiningChannelId === channel.id}
                        onClick={() => handleQuickJoinChannel(channel)}
                        className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left hover:bg-wa-surface/70 transition-colors disabled:opacity-50"
                      >
                        <span className="w-10 h-10 rounded-full bg-wa-surface flex items-center justify-center shrink-0">
                          <Hash size={18} strokeWidth={1.75} className="text-wa-muted" aria-hidden />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{channel.name}</div>
                          {channel.description && (
                            <div className="text-xs text-wa-muted truncate">{channel.description}</div>
                          )}
                        </div>
                        <span className="text-xs text-wa-accent shrink-0">
                          {channel.joined ? 'Open' : joiningChannelId === channel.id ? '…' : 'Join'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-[11px] font-semibold text-wa-muted uppercase tracking-wide px-2 pt-2 pb-1">
                  {listSearchQuery.trim() ? 'Your channels' : 'Joined'}
                </p>
                {filteredChannelRooms.length === 0 ? (
                  <p className="text-xs text-wa-muted px-2 py-4 text-center">
                    {listSearchQuery.trim() ? 'No joined channels match' : 'No channels yet — browse or create one'}
                  </p>
                ) : (
                  filteredChannelRooms.map((room) => renderChatItem(room))
                )}
              </>
            )}
          </div>
        )}

        <div
          className={`flex items-center border-t border-wa-border/80 bg-wa-dark/25 backdrop-blur-md shrink-0 ${
            sidebarOpen ? 'gap-2.5 p-3' : 'flex-col gap-2 py-3'
          }`}
        >
          <button
            type="button"
            className="shrink-0 rounded-full hover:opacity-90"
            onClick={() => openProfile(user?.id)}
            title="My profile"
          >
            <Avatar username={user?.username} color={user?.avatar_color} avatarUrl={user?.avatar_url} size={32} />
          </button>
          {sidebarOpen ? (
            <>
              <button
                type="button"
                className="text-sm font-semibold flex-1 truncate text-left hover:text-wa-accent"
                onClick={() => openProfile(user?.id)}
                title="My profile"
              >
                {user?.username}
              </button>
              <button
                type="button"
                className="w-8 h-8 rounded-lg text-wa-muted hover:text-slate-200 hover:bg-wa-surface flex items-center justify-center"
                onClick={() => setShowSettings(true)}
                title="Edit profile"
                aria-label="Edit profile"
              >
                <Pencil size={16} strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className="w-8 h-8 rounded-lg text-wa-muted hover:text-red-400 hover:bg-wa-surface flex items-center justify-center"
                onClick={logout}
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={16} strokeWidth={1.75} aria-hidden />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="w-10 h-10 rounded-lg text-wa-muted hover:text-slate-200 hover:bg-wa-surface flex items-center justify-center"
                onClick={() => setShowSettings(true)}
                title="Edit profile"
                aria-label="Edit profile"
              >
                <Pencil size={18} strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className="w-10 h-10 rounded-lg text-wa-muted hover:text-red-400 hover:bg-wa-surface flex items-center justify-center"
                onClick={logout}
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={18} strokeWidth={1.75} aria-hidden />
              </button>
            </>
          )}
        </div>
      </aside>

      <main
        className={`flex-1 flex flex-col min-h-0 overflow-hidden bg-wa-chat min-w-0 ${
          showChat ? '' : 'hidden md:flex'
        }`}
      >
        <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 h-14 sm:h-[60px] border-b border-wa-border bg-wa-panel shrink-0">
          {isMobile && activeRoom && (
            <button
              type="button"
              className="touch-target w-10 h-10 -ml-1 rounded-lg text-wa-muted hover:text-slate-200 hover:bg-wa-surface flex items-center justify-center shrink-0"
              onClick={() => setMobileShowList(true)}
              aria-label="Back to chats"
            >
              <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
            </button>
          )}
          {activeRoom ? (
            <button
              type="button"
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left hover:opacity-90 transition-opacity"
              onClick={() => {
                if (activeRoom.type === 'direct' && activeRoom.peer) openProfile(activeRoom.peer.id);
                if (activeRoom.type === 'group') setShowGroupProfile(true);
              }}
              disabled={activeRoom.type === 'public'}
            >
              {activeRoom.type === 'direct' && headerAvatar}
              {activeRoom.type === 'group' && (
                <span className="w-9 h-9 rounded-full bg-wa-surface flex items-center justify-center shrink-0">
                  <Users size={18} strokeWidth={1.75} className="text-wa-muted" aria-hidden />
                </span>
              )}
              {activeRoom.type === 'public' && (
                <span className="w-9 h-9 rounded-full bg-wa-surface flex items-center justify-center shrink-0">
                  <Hash size={18} strokeWidth={1.75} className="text-wa-muted" aria-hidden />
                </span>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {roomLabel(activeRoom)}
                </p>
                <p className="text-[11px] text-wa-muted truncate">
                  {activeRoom.type === 'group' && `${activeRoom.member_count || '?'} members · tap for info`}
                  {activeRoom.type === 'direct' && (
                    typingUsers.length > 0
                      ? `${typingUsers.join(', ')} typing…`
                      : peerIsOnline
                        ? 'Online'
                        : 'Offline'
                  )}
                  {activeRoom.type === 'public' && (
                    `${activeRoom.description || 'Channel'}${onlineUsers.length > 0 ? ` · ${onlineUsers.length} online` : ''}`
                  )}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base text-wa-muted">Select a conversation</p>
            </div>
          )}
          {activeRoom && (
            <ChatActionsMenu
              isDirect={activeRoom.type === 'direct' && Boolean(activeRoom.peer)}
              isGroup={activeRoom.type === 'group'}
              showSearch={showMessageSearch}
              onVoiceCall={activeRoom.type === 'direct' && activeRoom.peer ? () => handleStartCall('audio') : null}
              onVideoCall={activeRoom.type === 'direct' && activeRoom.peer ? () => handleStartCall('video') : null}
              onToggleSearch={() => setShowMessageSearch((v) => !v)}
              onWallpaper={() => setShowWallpaper(true)}
              onAddMembers={activeRoom.type === 'group' ? openAddMembers : null}
            />
          )}
        </header>

        <ConnectionBanner connected={connected} reconnecting={reconnecting} offline={isOffline} />

        {showMessageSearch && activeRoom && (
          <ChatMessageSearch
            roomId={activeRoom.id}
            onJumpToMessage={handleJumpToMessage}
            onClose={() => setShowMessageSearch(false)}
          />
        )}

        <ChatWallpaper
          user={user}
          innerRef={messagesAreaRef}
          scrollClassName={
            !activeRoom
              ? 'flex items-center justify-center'
              : mobileComposerDock
                ? (replyingTo ? 'composer-scroll-pad-reply' : 'composer-scroll-pad')
                : ''
          }
        >
          {!activeRoom && (
            <div className="text-center px-6 max-w-sm">
              <img src="/logo.png" alt="" className="w-20 h-20 mx-auto mb-4 opacity-80 object-contain" />
              <p className="text-lg font-semibold text-slate-200">Welcome to EganirA</p>
              <p className="text-sm text-wa-muted mt-2">Pick a chat from the sidebar or start a new conversation.</p>
            </div>
          )}
          {activeRoom && (
          <div className="w-full max-w-3xl lg:max-w-4xl mx-auto p-3 sm:p-5 flex flex-col gap-0.5 min-h-full justify-end" role="log" aria-label="Chat messages" aria-live="polite">
          <VirtualMessageList
            ref={messageListRef}
            scrollRef={messagesAreaRef}
            items={groupedMessages}
            onNearTop={loadOlderMessages}
            nearTopThreshold={LOAD_OLDER_THRESHOLD}
            header={(
              <>
          {loadingOlder && <p className="text-center text-sm text-wa-muted py-2">Loading older messages…</p>}
          {!loadingOlder && hasMoreOlder && messages.length > 0 && (
            <p className="text-center text-xs text-wa-muted py-2">Scroll up for older messages</p>
          )}
          {!hasMoreOlder && messages.length > 0 && (
            <p className="text-center text-xs text-wa-muted py-2 border-b border-wa-border mb-2">Beginning of conversation</p>
          )}
              </>
            )}
            footer={(
              <>
          {pendingUpload && (
            <PendingUploadBubble
              file={pendingUpload.file}
              progress={pendingUpload.progress}
              previewUrl={pendingUpload.previewUrl}
              caption={pendingUpload.caption}
            />
          )}

          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-wa-muted mt-2">
              <span className="flex gap-1" aria-hidden>
                <span className="w-1.5 h-1.5 rounded-full bg-wa-accent typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-wa-accent typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-wa-accent typing-dot" />
              </span>
              <span aria-live="polite">{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
            </div>
          )}
              </>
            )}
            renderItem={(msg) => (
            (msg.message_type === 'call' || (msg.call_status && msg.call_type)) ? (
              <div key={msg.id} id={`msg-${msg.id}`}>
                <CallMessageBubble message={msg} viewerId={user?.id} formatTime={formatTime} />
              </div>
            ) : (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className={`py-0.5 ${!msg.grouped ? 'mt-3' : ''} ${
                highlightMessageId === msg.id ? 'ring-2 ring-wa-accent/60 rounded-lg -mx-1 px-1' : ''
              }`}
            >
              {!msg.grouped && !isOwn(msg) && (
                <div className="flex items-center gap-2.5 mb-1">
                  <button
                    type="button"
                    className="shrink-0 rounded-full hover:opacity-90"
                    onClick={() => openProfile(msg.user_id)}
                    aria-label={`View ${msg.username}'s profile`}
                    title="View profile"
                  >
                    <Avatar username={msg.username} color={msg.avatar_color} avatarUrl={msg.avatar_url} size={32} />
                  </button>
                  <span className="font-semibold text-sm">{msg.username}</span>
                  <span className="text-[11px] text-wa-muted">{formatTime(msg.created_at)}</span>
                </div>
              )}
              <div className={`group flex flex-col ${isOwn(msg) ? 'items-end' : 'items-start'} ${!isOwn(msg) ? 'pl-[42px]' : ''}`}>
                <div
                  className={`w-fit max-w-[min(88%,400px)] sm:max-w-[min(78%,440px)] text-sm leading-snug shadow-sm ${
                    isOwn(msg)
                      ? 'bg-wa-bubble rounded-2xl rounded-br-md px-2.5 py-1.5 sm:px-3 sm:py-2'
                      : 'bg-wa-surface rounded-2xl rounded-bl-md px-2.5 py-1.5 sm:px-3 sm:py-2'
                  } ${isMobile ? 'cursor-pointer' : ''}`}
                  onClick={
                    isMobile
                      ? (e) => {
                          e.stopPropagation();
                          setMessageActionsId((prev) => (prev === msg.id ? null : msg.id));
                        }
                      : undefined
                  }
                >
                  {msg.star_reply && (
                    <StarReplyPreview starReply={msg.star_reply} />
                  )}
                  {msg.reply_to && (
                    <button
                      type="button"
                      className="flex flex-col gap-0.5 mb-2 p-2 border-l-[3px] border-wa-accent rounded bg-black/20 text-xs max-w-full text-left w-full hover:bg-black/30 cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (msg.reply_to?.id) handleJumpToMessage(msg.reply_to.id);
                      }}
                      title="Jump to original message"
                    >
                      <span className="font-semibold text-wa-accent-hover">@{msg.reply_to.username}</span>
                      <span className="text-wa-muted break-words line-clamp-3">{truncateReply(msg.reply_to.content)}</span>
                    </button>
                  )}
                  {msg.attachment && (
                    <div className={`${msg.content || msg.reply_to || msg.star_reply ? 'mb-1.5' : ''}`}>
                      <MessageAttachment attachment={msg.attachment} />
                    </div>
                  )}
                  {!msg.content && msg.attachment && editingMessageId !== msg.id && (
                    <div className={`inline-flex items-center gap-1 mt-0.5 ${isOwn(msg) ? 'float-right clear-both' : ''}`}>
                      {msg.edited_at && <span className="text-[10px] text-wa-muted italic">edited</span>}
                      <span className="text-[10px] text-wa-muted/90">{formatTime(msg.created_at)}</span>
                      {isOwn(msg) && activeRoom?.type !== 'public' && (
                        <MessageReceipt
                          status={getMessageReceiptStatus(msg, activeRoom, roomReads[activeRoom?.id], user?.id)}
                        />
                      )}
                    </div>
                  )}
                  {editingMessageId === msg.id ? (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="w-full min-h-[72px] bg-black/20 border border-wa-border rounded-lg px-2.5 py-2 text-sm text-slate-100 resize-y focus:outline-none focus:border-wa-accent"
                        autoFocus
                        disabled={editSaving}
                      />
                      {editError && <span className="text-xs text-red-400">{editError}</span>}
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={editSaving}
                          className="px-3 py-1 text-xs rounded-md bg-wa-surface text-wa-muted hover:text-slate-200 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(msg)}
                          disabled={editSaving}
                          className="px-3 py-1 text-xs rounded-md bg-wa-accent text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {editSaving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    msg.content && (
                      <div className={`flex flex-wrap items-end gap-x-2 gap-y-0.5 ${isOwn(msg) ? 'justify-end' : 'justify-start'}`}>
                        <div className="min-w-0 break-words">
                          <MessageContent content={msg.content} />
                        </div>
                        <div className="inline-flex items-center gap-1 shrink-0 self-end pb-0.5">
                          {msg.edited_at && (
                            <span className="text-[10px] text-wa-muted italic">edited</span>
                          )}
                          {(isOwn(msg) || msg.grouped) && (
                            <span className="text-[10px] text-wa-muted/90">{formatTime(msg.created_at)}</span>
                          )}
                          {isOwn(msg) && activeRoom?.type !== 'public' && (
                            <MessageReceipt
                              status={getMessageReceiptStatus(
                                msg,
                                activeRoom,
                                roomReads[activeRoom?.id],
                                user?.id
                              )}
                            />
                          )}
                        </div>
                      </div>
                    )
                  )}
                  {!isOwn(msg) && !msg.content && msg.edited_at && editingMessageId !== msg.id && (
                    <span className="block text-[10px] text-wa-muted text-right mt-0.5 italic">edited</span>
                  )}
                  {!isOwn(msg) && !msg.content && msg.grouped && editingMessageId !== msg.id && (
                    <span className="block text-[10px] text-wa-muted text-right mt-0.5">{formatTime(msg.created_at)}</span>
                  )}
                </div>
                {editingMessageId !== msg.id && (
                  <div
                    className={`flex items-center gap-0.5 mt-0.5 px-0.5 transition-opacity ${
                      isMobile
                        ? messageActionsId === msg.id
                          ? 'opacity-100'
                          : 'hidden'
                        : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                    } ${isOwn(msg) ? 'justify-end' : 'justify-start'}`}
                  >
                    <ReplyButton
                      onClick={() => startReply(msg)}
                      className="flex items-center justify-center w-7 h-7 rounded-md text-wa-muted hover:text-slate-200 hover:bg-wa-surface/80"
                    />
                    {isOwn(msg) && (
                      <EditButton
                        onClick={() => startEdit(msg)}
                        className="flex items-center justify-center w-7 h-7 rounded-md text-wa-muted hover:text-slate-200 hover:bg-wa-surface/80"
                      />
                    )}
                    {msg.content && (
                      <CopyButton
                        text={msg.content}
                        title="Copy message"
                        className="flex items-center justify-center w-7 h-7 rounded-md text-wa-muted hover:text-slate-200 hover:bg-wa-surface/80"
                      />
                    )}
                    <MessageLikeButton
                      messageId={msg.id}
                      likes={msg.likes || { count: 0, liked_by_me: false }}
                      onUpdate={(likes) => updateMessageLikes(msg.id, likes)}
                    />
                  </div>
                )}
              </div>
            </div>
            )
          )}
          />
          </div>
          )}
        </ChatWallpaper>

        {mobileComposerDock ? (
          <div className="fixed inset-x-0 bottom-0 z-30 bg-wa-panel border-t border-wa-border shadow-[0_-6px_20px_rgba(0,0,0,0.35)] pb-safe">
            {replyingTo && (
              <div className="flex items-start gap-2 px-2 py-2 border-b border-wa-border/60">
                <div className="flex-1 min-w-0 border-l-[3px] border-wa-accent pl-2 py-0.5">
                  <span className="block text-xs font-semibold text-wa-accent-hover mb-0.5">
                    Replying to @{replyingTo.username}
                  </span>
                  <span className="block text-sm text-wa-muted break-words line-clamp-2">
                    {truncateReply(replyingTo.content, 120)}
                  </span>
                </div>
                <button
                  type="button"
                  className="w-9 h-9 shrink-0 rounded-md bg-wa-surface text-wa-muted hover:text-slate-200 flex items-center justify-center"
                  onClick={() => setReplyingTo(null)}
                  aria-label="Cancel reply"
                >
                  <X size={18} strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            )}
            <form
              className={`flex items-end gap-1.5 px-2 py-2 ${!activeRoom ? 'opacity-50 pointer-events-none' : ''}`}
              onSubmit={handleSend}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                onChange={handleFileSelect}
              />
              <div className="flex-1 min-w-0 flex items-end gap-1 bg-wa-surface border border-wa-border rounded-xl px-1.5 py-1 focus-within:border-wa-accent transition-colors">
                <ComposerPlusMenu
                  compact
                  disabled={!activeRoom}
                  uploading={uploading}
                  sendingGif={sendingGif}
                  onAttach={() => fileInputRef.current?.click()}
                  onEmojiSelect={insertEmoji}
                  onGifSelect={handleGifSelect}
                />
                <textarea
                  ref={inputRef}
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm py-1.5 min-h-8 max-h-32 resize-none placeholder:text-wa-muted"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && replyingTo) {
                      e.preventDefault();
                      setReplyingTo(null);
                      return;
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder={replyingTo ? `Reply to @${replyingTo.username}…` : placeholder}
                  disabled={!activeRoom}
                  rows={1}
                />
              </div>
              <button
                type="submit"
                className="w-10 h-10 bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-40 rounded-xl text-white transition-colors shrink-0 inline-flex items-center justify-center"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <Send size={18} strokeWidth={1.75} aria-hidden />
              </button>
            </form>
          </div>
        ) : (
          <>
            {replyingTo && activeRoom && (
              <div className="flex items-start gap-3 px-3 sm:px-5 py-3 border-t border-wa-border bg-wa-panel shrink-0">
                <div className="flex-1 min-w-0 border-l-[3px] border-wa-accent pl-2.5 py-0.5">
                  <span className="block text-xs font-semibold text-wa-accent-hover mb-1">
                    Replying to @{replyingTo.username}
                  </span>
                  <span className="block text-sm text-wa-muted break-words line-clamp-2">
                    {truncateReply(replyingTo.content, 120)}
                  </span>
                </div>
                <button
                  type="button"
                  className="touch-target w-9 h-9 shrink-0 rounded-md bg-wa-surface text-wa-muted hover:text-slate-200 flex items-center justify-center"
                  onClick={() => setReplyingTo(null)}
                  aria-label="Cancel reply"
                >
                  <X size={18} strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            )}

            <form
              className={`flex items-end gap-2 px-3 sm:px-5 py-2.5 sm:py-3 border-t border-wa-border bg-wa-panel shrink-0 ${!activeRoom ? 'opacity-50 pointer-events-none' : ''}`}
              onSubmit={handleSend}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                onChange={handleFileSelect}
              />
              <div className="flex-1 min-w-0 flex items-end gap-2 bg-wa-surface border border-wa-border rounded-xl px-2 py-1.5 focus-within:border-wa-accent transition-colors">
                <ComposerPlusMenu
                  disabled={!activeRoom}
                  uploading={uploading}
                  sendingGif={sendingGif}
                  onAttach={() => fileInputRef.current?.click()}
                  onEmojiSelect={insertEmoji}
                  onGifSelect={handleGifSelect}
                />
                <textarea
                  ref={inputRef}
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm py-2 min-h-9 max-h-40 resize-none placeholder:text-wa-muted"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && replyingTo) {
                      e.preventDefault();
                      setReplyingTo(null);
                      return;
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder={replyingTo ? `Reply to @${replyingTo.username}…` : placeholder}
                  disabled={!activeRoom}
                  rows={1}
                />
              </div>
              <button
                type="submit"
                className="touch-target px-4 py-3 bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-40 rounded-xl text-white transition-colors shrink-0 inline-flex items-center justify-center"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <Send size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
