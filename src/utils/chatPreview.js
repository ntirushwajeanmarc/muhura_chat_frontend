import { messagePreview } from './notifications';

function patchRoomList(list, roomId, preview, at) {
  if (!list?.length) return list;
  let changed = false;
  const next = list.map((room) => {
    if (room.id !== roomId) return room;
    changed = true;
    return {
      ...room,
      last_message: preview,
      last_message_at: at,
    };
  });
  return changed ? next : list;
}

export function applyMessageToChatLists(roomId, msg, setters) {
  const preview = messagePreview(msg);
  const at = msg.created_at || msg.edited_at || new Date().toISOString();
  const { setDirectChats, setGroupChats, setPublicRooms } = setters;

  setDirectChats((prev) => patchRoomList(prev, roomId, preview, at));
  setGroupChats((prev) => patchRoomList(prev, roomId, preview, at));
  setPublicRooms((prev) => patchRoomList(prev, roomId, preview, at));
}

export function applyEditToChatLists(roomId, msg, setters, isLastInRoom) {
  if (!isLastInRoom) return;
  applyMessageToChatLists(roomId, msg, setters);
}
