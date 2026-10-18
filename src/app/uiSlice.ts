import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Toast {
  id: string;
  tone: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  theme: ThemePreference;
  toasts: Toast[];
}

function readPref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

const initialState: UiState = {
  sidebarCollapsed: readPref<string>('tnbs.ui.sidebar', 'expanded') === 'collapsed',
  mobileNavOpen: false,
  theme: readPref<ThemePreference>('tnbs.ui.theme', 'light'),
  toasts: [],
};

let toastSeq = 0;

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      try {
        localStorage.setItem('tnbs.ui.sidebar', state.sidebarCollapsed ? 'collapsed' : 'expanded');
      } catch {
        /* ignore */
      }
    },
    setMobileNav(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
    setTheme(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload;
      try {
        localStorage.setItem('tnbs.ui.theme', action.payload);
      } catch {
        /* ignore */
      }
    },
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
        if (state.toasts.length > 4) state.toasts.shift();
      },
      prepare(toast: Omit<Toast, 'id'>) {
        toastSeq += 1;
        return { payload: { ...toast, id: `t${Date.now()}-${toastSeq}` } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { toggleSidebar, setMobileNav, setTheme, pushToast, dismissToast } = uiSlice.actions;
export default uiSlice.reducer;
