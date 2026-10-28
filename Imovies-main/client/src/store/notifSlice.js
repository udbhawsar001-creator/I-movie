import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../api';

export const fetchNotifs = createAsyncThunk('notif/fetch', async () => (await api.get('/notifications')).data);
export const markAllRead = createAsyncThunk('notif/read', async () => { await api.patch('/notifications/read'); });

const slice = createSlice({
  name: 'notif',
  initialState: { items: [], unread: 0 },
  reducers: {
    pushNotif(state, { payload }) { state.items = [payload, ...state.items].slice(0, 20); state.unread += 1; },
    clearNotifs(state) { state.items = []; state.unread = 0; },
  },
  extraReducers: (b) => {
    b.addCase(fetchNotifs.fulfilled, (s, { payload }) => { s.items = payload.items; s.unread = payload.unread; });
    b.addCase(markAllRead.fulfilled, (s) => { s.unread = 0; s.items = s.items.map((n) => ({ ...n, read: true })); });
  },
});

export const { pushNotif, clearNotifs } = slice.actions;
export default slice.reducer;
