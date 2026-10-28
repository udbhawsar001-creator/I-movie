import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api, { errMsg } from '../api';

const thunk = (name, fn) =>
  createAsyncThunk(name, async (arg, { rejectWithValue }) => {
    try { return await fn(arg); } catch (e) { return rejectWithValue(errMsg(e)); }
  });

export const login = thunk('auth/login', async (b) => (await api.post('/auth/login', b)).data);
export const register = thunk('auth/register', async (b) => (await api.post('/auth/register', b)).data);
export const loadUser = thunk('auth/load', async () => (await api.get('/auth/me')).data);

const hasToken = !!localStorage.getItem('imovies_token');

const slice = createSlice({
  name: 'auth',
  initialState: { user: null, loading: hasToken }, // loading = restoring session
  reducers: {
    logout(state) { localStorage.removeItem('imovies_token'); state.user = null; },
  },
  extraReducers: (b) => {
    const session = (state, { payload }) => {
      localStorage.setItem('imovies_token', payload.token);
      state.user = payload.user;
    };
    b.addCase(login.fulfilled, session).addCase(register.fulfilled, session);
    b.addCase(loadUser.fulfilled, (s, { payload }) => { s.user = payload.user; s.loading = false; });
    b.addCase(loadUser.rejected, (s) => { localStorage.removeItem('imovies_token'); s.loading = false; });
  },
});

export const { logout } = slice.actions;
export default slice.reducer;
