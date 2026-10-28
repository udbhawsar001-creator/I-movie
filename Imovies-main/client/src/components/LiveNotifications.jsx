import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ensureSocket, resetSocket } from '../socket';
import { clearNotifs, fetchNotifs, pushNotif } from '../store/notifSlice';

// invisible: keeps the socket + notifications in sync with login state
export default function LiveNotifications() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();

  useEffect(() => {
    resetSocket(); // reconnect so the server knows who we are
    if (!user) { dispatch(clearNotifs()); return; }
    dispatch(fetchNotifs());
    const socket = ensureSocket();
    const onNotify = (n) => { dispatch(pushNotif(n)); toast.info(n.message); };
    socket.on('notify', onNotify);
    return () => socket.off('notify', onNotify);
  }, [user, dispatch]);

  return null;
}
