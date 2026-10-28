import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice';
import notif from './notifSlice';

export default configureStore({ reducer: { auth, notif } });
