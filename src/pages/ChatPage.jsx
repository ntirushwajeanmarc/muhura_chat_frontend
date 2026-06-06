import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { BACKEND_URL } from '../config';
import { fetchRoomMessages } from '../api/messages';
import { fetchChats, startDirectChat, createGroupChat, addGroupMembers, fetchGroupMembers } from '../api/chats';
import { uploadFile } from '../api/attachments';
import MessageContent from '../components/MessageContent';
import MessageAttachment from '../components/MessageAttachment';
import PendingUploadBubble from '../components/PendingUploadBubble';
import CopyButton from '../components/CopyButton';
import EditButton from '../components/EditButton';
import MessageReceipt from '../components/MessageReceipt';
import { indexReadStates, getMessageReceiptStatus } from '../utils/readReceipts';
import EmojiPicker from '../components/EmojiPicker';
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
} from '../utils/notifications';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useCall } from '../hooks/useCall';
import ChannelSearchModal from '../components/ChannelSearchModal';
import WallpaperPicker from '../components/WallpaperPicker';
import CallModal from '../components/CallModal';
import { wallpaperClass } from '../utils/wallpapers';
import { fetchStarsFeed, deleteStar } from '../api/social';
import StarsBar from '../components/StarsBar';
import CreateStarModal from '../components/CreateStarModal';
import ViewStarsModal from '../components/ViewStarsModal';

function roomLabel(room) {
  if (!room) return '';
  if (room.type === 'direct') return room.display_name || room.peer?.username || 'Chat';
  if (room.type === 'group') return room.display_name || room.name;
  return room.name;
}

function roomPrefix(room) {
  if (room?.type === 'public') return '#';
  if (room?.type === 'group') return '👥';
  return null;
}

export default function ChatPage() {
  const { user, token, logout, updateSession } = useAuth();
  const { joinRoom, joinRooms, setPresenceRoom, sendMessage, sendTyping, markRead, on, connected, socket } = useSocket(token);
  const { callState, startCall, acceptCall, rejectCall, endCall, remoteAudioRef } = useCall(socket, user);
  const [publicRooms, setPublicRooms] = useState([]);
  const [directChats, setDirectChats] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
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
  const [showWallpaper, setShowWallpaper] = useState(false);
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [profileUserId, setProfileUserId] = useState(null);
  const [starsFeed, setStarsFeed] = useState([]);
  const [showCreateStar, setShowCreateStar] = useState(false);
  const [viewingStars, setViewingStars] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null);
  const unreadStorageKey = user?.id ? `studychat_unread_${user.id}` : null;
  const [unread, setUnread] = useState({});
  const unreadLoadedRef = useRef(false);
  const messagesAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const activeRoomIdRef = useRef(null);
  const userRef = useRef(user);
  const allRoomsRef = useRef([]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    allRoomsRef.current = [...directChats, ...groupChats, ...publicRooms];
  }, [directChats, groupChats, publicRooms]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

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
    if (isMobile) setSidebarOpen(true);
    if (isMobile && !activeRoom) setMobileShowList(true);
  }, [isMobile, activeRoom]);

  useEffect(() => {
    if (!user?.id || unreadLoadedRef.current) return;
    unreadLoadedRef.current = true;
    try {
      const saved = sessionStorage.getItem(`studychat_unread_${user.id}`);
      if (saved) setUnread(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  useEffect(() => {
    if (!unreadStorageKey) return;
    sessionStorage.setItem(unreadStorageKey, JSON.stringify(unread));
  }, [unread, unreadStorageKey]);

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

  const sortedDirectChats = useMemo(
    () => sortByUnreadThenRecent(directChats),
    [directChats, sortByUnreadThenRecent]
  );
  const sortedGroupChats = useMemo(
    () => sortByUnreadThenRecent(groupChats),
    [groupChats, sortByUnreadThenRecent]
  );
  const sortedPublicRooms = useMemo(
    () => sortByUnreadThenRecent(publicRooms),
    [publicRooms, sortByUnreadThenRecent]
  );
  const sidebarRooms = useMemo(
    () => sortByUnreadThenRecent([...directChats, ...groupChats, ...publicRooms]),
    [directChats, groupChats, publicRooms, sortByUnreadThenRecent]
  );

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

  const SCROLL_THRESHOLD = 80;
  const LOAD_OLDER_THRESHOLD = 120;

  const isNearBottom = useCallback(() => {
    const el = messagesAreaRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const mergeMessages = useCallback((existing, incoming) => {
    const seen = new Set(existing.map((m) => m.id));
    const unique = incoming.filter((m) => !seen.has(m.id));
    return [...existing, ...unique];
  }, []);

  const loadInitialMessages = useCallback(async (roomId) => {
    const { messages: data, hasMore } = await fetchRoomMessages(roomId);
    setMessages(data);
    setHasMoreOlder(hasMore);
    requestAnimationFrame(() => scrollToBottom('auto'));
  }, [scrollToBottom]);

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
    if (!activeRoom || activeRoom.type === 'public' || messages.length === 0) return;
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
        setMessages((prev) => mergeMessages(older, prev));
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
  }, [activeRoom, hasMoreOlder, messages, mergeMessages]);

  const refreshChats = useCallback(async () => {
    const { direct, groups } = await fetchChats();
    setDirectChats(direct);
    setGroupChats(groups);
    joinRooms([...direct, ...groups].map((r) => r.id));
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
    Promise.all([
      axios.get(`${BACKEND_URL}/api/rooms`),
      fetchChats(),
    ]).then(([roomsRes, chats]) => {
      const unique = dedupeRooms(roomsRes.data.map((r) => ({ ...r, type: 'public' })));
      setPublicRooms(unique);
      setDirectChats(chats.direct);
      setGroupChats(chats.groups);
      const allRooms = [...chats.direct, ...chats.groups, ...unique];
      joinRooms(allRooms.map((r) => r.id));

      if (chats.direct.length > 0) {
        setActiveRoom(chats.direct[0]);
      } else if (chats.groups.length > 0) {
        setActiveRoom(chats.groups[0]);
      } else if (unique.length > 0) {
        setActiveRoom(unique[0]);
      }
    });
  }, [dedupeRooms, joinRooms]);

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
    if (activeRoom.type !== 'public') fetchReadState(activeRoom.id);
    setTypingUsers([]);
    setOnlineUsers([]);
    setReplyingTo(null);
    setEditingMessageId(null);
    setEditDraft('');
    setEditError(null);
    setPendingUpload((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, [activeRoom, joinRoom, setPresenceRoom, loadInitialMessages, fetchReadState]);

  useEffect(() => {
    if (!connected || !activeRoom || activeRoom.type === 'public' || messages.length === 0) return;
    const timer = setTimeout(markRoomAsRead, 400);
    return () => clearTimeout(timer);
  }, [connected, activeRoom?.id, activeRoom?.type, messages, markRoomAsRead]);

  useEffect(() => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      stickToBottomRef.current = isNearBottom();
      if (el.scrollTop <= LOAD_OLDER_THRESHOLD) {
        loadOlderMessages();
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isNearBottom, activeRoom?.id, loadOlderMessages]);

  useEffect(() => {
    if (!connected) return undefined;

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
          return [...prev, msg];
        });
      }

      refreshChats();
    });
    const offRoom = on('room_added', ({ roomId }) => {
      if (roomId) joinRoom(roomId);
      refreshChats();
    });
    const offOnline = on('online_users', ({ roomId, users }) => {
      if (roomId !== activeRoomIdRef.current) return;
      setOnlineUsers(users || []);
    });
    const offTyping = on('user_typing', ({ username, isTyping, roomId }) => {
      if (roomId !== activeRoomIdRef.current) return;
      if (username === userRef.current?.username) return;
      setTypingUsers((prev) =>
        isTyping ? [...new Set([...prev, username])] : prev.filter((u) => u !== username)
      );
    });
    const offEdited = on('message_edited', (msg) => {
      if (msg.room_id && msg.room_id !== activeRoomIdRef.current) return;
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
      refreshChats();
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
    return () => {
      offMsg?.();
      offRoom?.();
      offOnline?.();
      offTyping?.();
      offEdited?.();
      offLike?.();
      offRead?.();
      offStar?.();
    };
  }, [connected, on, refreshChats, openRoomById, joinRoom, loadStarsFeed]);

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
    if (!input.trim() || !activeRoom) return;
    sendMessage(activeRoom.id, input, replyingTo?.id ?? null);
    setInput('');
    setReplyingTo(null);
    sendTyping(activeRoom.id, false);
    stickToBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom('smooth'));
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
      alert(message);
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
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? res.data.message : m)));
      cancelEdit();
      refreshChats();
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
      const sameUser = prev?.username === msg.username;
      const sameMinute = prev && Math.abs(new Date(msg.created_at) - new Date(prev.created_at)) < 60000;
      grouped.push({ ...msg, grouped: sameUser && sameMinute });
    });
    return grouped;
  };

  const selectRoom = (room) => {
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

  const handleStartCall = async () => {
    if (!activeRoom?.peer) return;
    try {
      await startCall(activeRoom.peer, 'audio');
    } catch {
      /* mic permission denied */
    }
  };

  const chatWallpaper = wallpaperClass(user?.chat_wallpaper || 'default');

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

  const renderChatItem = (room, compact = false) => {
    const label = roomLabel(room);
    const prefix = roomPrefix(room);
    const avatarColor = room.type === 'direct' ? room.peer?.avatar_color : null;
    const avatarUrl = room.type === 'direct' ? room.peer?.avatar_url : null;
    const avatarName = room.type === 'direct' ? room.peer?.username : label;
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
            <Avatar username={avatarName} color={avatarColor} avatarUrl={avatarUrl} size={36} />
          ) : (
            <span className="w-9 h-9 rounded-full bg-wa-surface flex items-center justify-center text-base">
              {prefix || '💬'}
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
        className={`flex items-center gap-2.5 w-full p-2.5 rounded-lg text-left transition-colors ${
          activeRoom?.id === room.id ? 'bg-wa-accent/15' : 'hover:bg-wa-surface/60'
        }`}
        onClick={() => selectRoom(room)}
      >
        {room.type === 'direct' ? (
          <Avatar username={avatarName} color={avatarColor} avatarUrl={avatarUrl} size={40} />
        ) : (
          <span className="w-10 h-10 rounded-full bg-wa-surface flex items-center justify-center text-lg shrink-0">
            {prefix || '💬'}
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

  const headerAvatar = activeRoom?.type === 'direct' && activeRoom.peer
    ? <Avatar username={activeRoom.peer.username} color={activeRoom.peer.avatar_color} avatarUrl={activeRoom.peer.avatar_url} size={36} />
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

  return (
    <div className="flex h-full overflow-hidden">
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
          onEditProfile={() => setShowSettings(true)}
          onCall={profileUserId !== user?.id ? async (profile) => {
            try {
              await startCall(profile, 'audio');
            } catch {
              /* mic denied */
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
      {showChannelSearch && (
        <ChannelSearchModal
          onJoin={handleChannelJoin}
          onClose={() => setShowChannelSearch(false)}
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
        />
      )}
      <CallModal
        callState={callState}
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
        className={`flex flex-col bg-wa-dark border-r border-wa-border transition-all duration-200 ${
          isMobile
            ? showSidebar
              ? 'fixed inset-0 z-30 w-full min-w-0'
              : 'hidden'
            : sidebarOpen
              ? 'w-60 min-w-[240px]'
              : 'w-14 min-w-[56px]'
        }`}
      >
        <div
          className={`flex items-center h-14 sm:h-[60px] border-b border-wa-border shrink-0 ${
            sidebarOpen || isMobile ? 'gap-2 px-3' : 'justify-center px-1'
          }`}
        >
          {sidebarOpen || isMobile ? (
            <>
              <img src="/logo.png" alt="" className="w-7 h-7 rounded-md shrink-0 object-contain" />
              <span className="font-bold text-sm truncate flex-1">EganirA</span>
              {!isMobile && (
                <button
                  type="button"
                  className="w-9 h-9 rounded-lg text-wa-muted hover:text-slate-200 hover:bg-wa-surface flex items-center justify-center shrink-0"
                  onClick={() => setSidebarOpen(false)}
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  ←
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
              ☰
            </button>
          )}
        </div>

        {(sidebarOpen || isMobile) && (
          <StarsBar
            feed={starsFeed}
            viewerId={user?.id}
            onCreate={() => setShowCreateStar(true)}
            onViewUser={setViewingStars}
          />
        )}

        <div className={`flex flex-col gap-1 shrink-0 border-b border-wa-border ${sidebarOpen ? 'p-2' : 'p-1'}`}>
          <button
            type="button"
            className={`rounded-lg bg-wa-surface/80 hover:bg-wa-surface text-sm transition-colors ${
              sidebarOpen ? 'w-full px-2.5 py-2 text-left' : 'w-10 h-10 mx-auto flex items-center justify-center text-lg'
            }`}
            onClick={() => setShowNewChat(true)}
            title="New chat"
          >
            {sidebarOpen ? '💬 New chat' : '💬'}
          </button>
          <button
            type="button"
            className={`rounded-lg bg-wa-surface/80 hover:bg-wa-surface text-sm transition-colors ${
              sidebarOpen ? 'w-full px-2.5 py-2 text-left' : 'w-10 h-10 mx-auto flex items-center justify-center text-lg'
            }`}
            onClick={() => setShowNewGroup(true)}
            title="New group"
          >
            {sidebarOpen ? '👥 New group' : '👥'}
          </button>
        </div>

        {!sidebarOpen && (
          <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-2 min-h-0 px-1">
            {sidebarRooms.length === 0 ? (
              <p className="text-[10px] text-wa-muted text-center px-1">No chats yet</p>
            ) : (
              sidebarRooms.map((room) => renderChatItem(room, true))
            )}
          </div>
        )}

        {sidebarOpen && (
          <>
            <div className="p-2 overflow-y-auto max-h-[28vh] shrink-0">
              <div className="text-[11px] font-semibold text-wa-muted tracking-wider px-2 pb-2">CHATS</div>
              {directChats.length === 0 && (
                <p className="text-xs text-wa-muted px-2">Search someone to start chatting</p>
              )}
              {sortedDirectChats.map((room) => renderChatItem(room))}
            </div>

            <div className="p-2 overflow-y-auto max-h-[28vh] shrink-0">
              <div className="text-[11px] font-semibold text-wa-muted tracking-wider px-2 pb-2">GROUPS</div>
              {groupChats.length === 0 && (
                <p className="text-xs text-wa-muted px-2">Create a group to chat together</p>
              )}
              {sortedGroupChats.map((room) => renderChatItem(room))}
            </div>

            <div className="p-2 overflow-y-auto max-h-[22vh] shrink-0">
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="text-[11px] font-semibold text-wa-muted tracking-wider">CHANNELS</div>
                <button
                  type="button"
                  className="text-[11px] text-wa-accent hover:text-wa-accent-hover"
                  onClick={() => setShowChannelSearch(true)}
                >
                  Find
                </button>
              </div>
              {sortedPublicRooms.length === 0 && (
                <p className="text-xs text-wa-muted px-2">Search to find and join channels</p>
              )}
              {sortedPublicRooms.map((room) => {
                const unreadCount = unread[room.id] || 0;
                const hasUnread = unreadCount > 0;
                return (
                  <button
                    key={room.id}
                    type="button"
                    className={`flex items-center gap-2.5 w-full p-2.5 rounded-lg text-left transition-colors ${
                      activeRoom?.id === room.id ? 'bg-wa-accent/15' : 'hover:bg-wa-surface/60'
                    }`}
                    onClick={() => selectRoom(room)}
                  >
                    <span className="w-10 h-10 rounded-full bg-wa-surface flex items-center justify-center text-lg shrink-0">#</span>
                    <span className={`text-sm truncate flex-1 ${hasUnread ? 'font-bold text-slate-50' : 'font-semibold text-slate-100'}`}>
                      {room.name}
                    </span>
                    <UnreadBadge count={unreadCount} />
                  </button>
                );
              })}
            </div>

            <div className="flex-1 p-2 overflow-y-auto min-h-[60px]">
              <div className="text-[11px] font-semibold text-wa-muted tracking-wider px-2 pb-2">
                ONLINE — {onlineUsers.length}
              </div>
              {onlineUsers.map((u) => (
                <div key={u} className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-wa-muted">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="truncate">{u}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div
          className={`flex items-center border-t border-wa-border shrink-0 ${
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
                onClick={() => setShowSettings(true)}
                title="Edit profile"
              >
                {user?.username}
              </button>
              <button
                type="button"
                className="w-8 h-8 rounded-lg text-wa-muted hover:text-slate-200 hover:bg-wa-surface flex items-center justify-center"
                onClick={() => setShowSettings(true)}
                title="Edit profile"
              >
                ✏️
              </button>
              <button
                type="button"
                className="w-8 h-8 rounded-lg text-wa-muted hover:text-red-400 hover:bg-wa-surface flex items-center justify-center"
                onClick={logout}
                title="Logout"
              >
                ⏻
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="w-10 h-10 rounded-lg text-wa-muted hover:text-slate-200 hover:bg-wa-surface flex items-center justify-center"
                onClick={() => setShowSettings(true)}
                title="Edit profile"
              >
                ✏️
              </button>
              <button
                type="button"
                className="w-10 h-10 rounded-lg text-wa-muted hover:text-red-400 hover:bg-wa-surface flex items-center justify-center"
                onClick={logout}
                title="Logout"
              >
                ⏻
              </button>
            </>
          )}
        </div>
      </aside>

      <main
        className={`flex-1 flex flex-col overflow-hidden bg-wa-chat min-w-0 ${
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
              ←
            </button>
          )}
          {headerAvatar && (
            <button
              type="button"
              className="shrink-0 rounded-full hover:opacity-90"
              onClick={() => openProfile(activeRoom.peer?.id)}
              title="View profile"
            >
              {headerAvatar}
            </button>
          )}
          <div className="flex items-center gap-1.5 font-semibold text-sm sm:text-base min-w-0 flex-1">
            {activeRoom?.type === 'public' && <span className="text-wa-muted">#</span>}
            {activeRoom?.type === 'group' && <span>👥</span>}
            <span className="truncate">{roomLabel(activeRoom) || 'Select a chat'}</span>
          </div>
          {activeRoom?.type === 'group' && activeRoom.member_count && (
            <span className="hidden sm:inline text-sm text-wa-muted border-l border-wa-border pl-3 shrink-0">
              {activeRoom.member_count} members
            </span>
          )}
          {activeRoom?.type === 'public' && activeRoom?.description && (
            <span className="hidden md:inline text-sm text-wa-muted border-l border-wa-border pl-3 truncate">
              {activeRoom.description}
            </span>
          )}
          <div className="flex items-center gap-1 ml-auto shrink-0">
            {activeRoom?.type === 'direct' && activeRoom.peer && (
              <button
                type="button"
                className="touch-target w-10 h-10 rounded-lg text-wa-muted hover:text-slate-200 hover:bg-wa-surface flex items-center justify-center"
                onClick={handleStartCall}
                title="Voice call"
                aria-label="Voice call"
              >
                📞
              </button>
            )}
            {activeRoom?.type === 'group' && (
              <button
                type="button"
                className="touch-target w-10 h-10 rounded-lg text-wa-muted hover:text-slate-200 hover:bg-wa-surface flex items-center justify-center"
                onClick={openAddMembers}
                title="Add members"
                aria-label="Add members"
              >
                ➕
              </button>
            )}
            {activeRoom && (
              <button
                type="button"
                className="touch-target w-10 h-10 rounded-lg text-wa-muted hover:text-slate-200 hover:bg-wa-surface flex items-center justify-center"
                onClick={() => setShowWallpaper(true)}
                title="Change wallpaper"
                aria-label="Change wallpaper"
              >
                🖼
              </button>
            )}
          </div>
        </header>

        <div
          className={`flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-0.5 overscroll-contain ${chatWallpaper}`}
          ref={messagesAreaRef}
        >
          {loadingOlder && <p className="text-center text-sm text-wa-muted py-2">Loading older messages…</p>}
          {!loadingOlder && hasMoreOlder && messages.length > 0 && (
            <p className="text-center text-xs text-wa-muted py-2">Scroll up for older messages</p>
          )}
          {!hasMoreOlder && messages.length > 0 && (
            <p className="text-center text-xs text-wa-muted py-2 border-b border-wa-border mb-2">Beginning of conversation</p>
          )}
          {groupMessages(messages).map((msg) => (
            <div key={msg.id} className={`py-0.5 ${!msg.grouped ? 'mt-3' : ''}`}>
              {!msg.grouped && !isOwn(msg) && (
                <div className="flex items-center gap-2.5 mb-1">
                  <button
                    type="button"
                    className="shrink-0 rounded-full hover:opacity-90"
                    onClick={() => openProfile(msg.user_id)}
                    title="View profile"
                  >
                    <Avatar username={msg.username} color={msg.avatar_color} avatarUrl={msg.avatar_url} size={32} />
                  </button>
                  <span className="font-semibold text-sm">{msg.username}</span>
                  <span className="text-[11px] text-wa-muted">{formatTime(msg.created_at)}</span>
                </div>
              )}
              <div className={`flex ${isOwn(msg) ? 'justify-end' : ''} ${!isOwn(msg) ? 'pl-[42px]' : ''}`}>
                <div
                  className={`inline-block max-w-[min(92%,520px)] sm:max-w-[min(80%,520px)] md:max-w-[min(65%,520px)] text-sm leading-relaxed shadow-sm min-w-0 ${
                    isOwn(msg)
                      ? 'bg-wa-bubble rounded-lg rounded-br-sm px-3 py-2.5'
                      : 'bg-wa-surface rounded-lg rounded-bl-sm px-3 py-2.5'
                  }`}
                >
                  {msg.reply_to && (
                    <div className="flex flex-col gap-0.5 mb-2 p-2 border-l-[3px] border-wa-accent rounded bg-black/20 text-xs max-w-full">
                      <span className="font-semibold text-wa-accent-hover">@{msg.reply_to.username}</span>
                      <span className="text-wa-muted break-words line-clamp-3">{truncateReply(msg.reply_to.content)}</span>
                    </div>
                  )}
                  {msg.attachment && (
                    <div className={`${msg.content || msg.reply_to ? 'mb-2' : ''}`}>
                      <MessageAttachment attachment={msg.attachment} />
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
                      <div className="break-words min-w-0">
                        <MessageContent content={msg.content} />
                      </div>
                    )
                  )}
                  {editingMessageId !== msg.id && (
                    <div className="flex items-center justify-end gap-0.5 mt-2 pt-2 border-t border-white/10">
                      <ReplyButton
                        onClick={() => startReply(msg)}
                        className="flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 rounded-md text-wa-muted hover:text-slate-200 hover:bg-white/10 transition-colors"
                      />
                      {isOwn(msg) && (
                        <EditButton
                          onClick={() => startEdit(msg)}
                          className="flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 rounded-md text-wa-muted hover:text-slate-200 hover:bg-white/10 transition-colors"
                        />
                      )}
                      {msg.content && (
                        <CopyButton
                          text={msg.content}
                          title="Copy message"
                          className="flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 rounded-md text-wa-muted hover:text-slate-200 hover:bg-white/10 transition-colors"
                        />
                      )}
                    </div>
                  )}
                  {editingMessageId !== msg.id && (
                    <div className={`flex items-center gap-2 mt-1.5 ${isOwn(msg) ? 'justify-end' : 'justify-start'}`}>
                      <MessageLikeButton
                        messageId={msg.id}
                        likes={msg.likes || { count: 0, liked_by_me: false }}
                        onUpdate={(likes) => updateMessageLikes(msg.id, likes)}
                      />
                    </div>
                  )}
                  {isOwn(msg) && editingMessageId !== msg.id && (
                    <div className="flex items-center justify-end gap-1.5 mt-1.5 pt-0.5">
                      {msg.edited_at && (
                        <span className="text-[10px] text-wa-muted italic shrink-0">edited</span>
                      )}
                      <span className="text-[10px] text-wa-muted shrink-0">{formatTime(msg.created_at)}</span>
                      {activeRoom?.type !== 'public' && (
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
                  )}
                  {!isOwn(msg) && msg.edited_at && editingMessageId !== msg.id && (
                    <span className="block text-[10px] text-wa-muted text-right mt-1 italic">edited</span>
                  )}
                  {!isOwn(msg) && msg.grouped && (
                    <span className="block text-[10px] text-wa-muted text-right mt-1">{formatTime(msg.created_at)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

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
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-wa-accent typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-wa-accent typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-wa-accent typing-dot" />
              </span>
              <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {replyingTo && (
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
              ✕
            </button>
          </div>
        )}

        <form
          className="flex items-end gap-2 px-3 sm:px-5 py-2.5 sm:py-3 border-t border-wa-border bg-wa-panel pb-safe"
          onSubmit={handleSend}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
            onChange={handleFileSelect}
          />
          <div className="flex-1 flex items-end gap-2 bg-wa-surface border border-wa-border rounded-xl px-2 py-1.5 focus-within:border-wa-accent transition-colors overflow-visible">
            <button
              type="button"
              className="touch-target w-10 h-10 rounded-lg text-lg hover:bg-wa-panel disabled:opacity-40 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeRoom || uploading}
              title="Attach file"
            >
              📎
            </button>
            <EmojiPicker onSelect={insertEmoji} disabled={!activeRoom} />
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent border-none outline-none text-sm py-2 min-h-9 max-h-40 resize-none placeholder:text-wa-muted"
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
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="touch-target px-4 py-3 bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-40 rounded-xl text-white text-base transition-colors shrink-0"
            disabled={!input.trim()}
          >
            ➤
          </button>
        </form>
      </main>
    </div>
  );
}
