import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import adminService from '../../services/admin.service.js';

// Thunks
export const fetchDashboardStats = createAsyncThunk(
  'admin/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await adminService.getDashboardStats();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch dashboard stats');
    }
  }
);

export const fetchUsers = createAsyncThunk(
  'admin/fetchUsers',
  async (params, { rejectWithValue }) => {
    try {
      const response = await adminService.getUsers(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch users');
    }
  }
);

export const fetchUserById = createAsyncThunk(
  'admin/fetchUserById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await adminService.getUserById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch user profile details');
    }
  }
);

export const toggleUserStatus = createAsyncThunk(
  'admin/toggleUserStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await adminService.toggleUserStatus(id, status);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to toggle user status');
    }
  }
);

export const fetchSubscriptions = createAsyncThunk(
  'admin/fetchSubscriptions',
  async (params, { rejectWithValue }) => {
    try {
      const response = await adminService.getSubscriptions(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch subscriptions');
    }
  }
);

export const updateSubscription = createAsyncThunk(
  'admin/updateSubscription',
  async ({ userId, plan, status, endDate }, { rejectWithValue }) => {
    try {
      const response = await adminService.updateSubscription(userId, { plan, status, endDate });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update subscription');
    }
  }
);

export const fetchAnalytics = createAsyncThunk(
  'admin/fetchAnalytics',
  async (params, { rejectWithValue }) => {
    try {
      const response = await adminService.getAnalytics(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch analytics');
    }
  }
);

export const fetchAuditLogs = createAsyncThunk(
  'admin/fetchAuditLogs',
  async (params, { rejectWithValue }) => {
    try {
      const response = await adminService.getAuditLogs(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch audit logs');
    }
  }
);

const initialState = {
  stats: null,
  users: {
    list: [],
    total: 0,
    page: 1,
    totalPages: 1,
    limit: 10,
  },
  selectedUser: null,
  subscriptions: {
    list: [],
    total: 0,
    page: 1,
    totalPages: 1,
    limit: 10,
  },
  analytics: null,
  auditLogs: {
    list: [],
    total: 0,
    page: 1,
    totalPages: 1,
    limit: 10,
  },
  loading: {
    stats: false,
    users: false,
    userProfile: false,
    subscriptions: false,
    analytics: false,
    auditLogs: false,
    actions: false,
  },
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearAdminError: (state) => {
      state.error = null;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Dashboard Stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading.stats = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error = action.payload;
      })

      // Users List
      .addCase(fetchUsers.pending, (state) => {
        state.loading.users = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading.users = false;
        state.users.list = action.payload.users;
        state.users.total = action.payload.total;
        state.users.page = action.payload.page;
        state.users.totalPages = action.payload.totalPages;
        state.users.limit = action.payload.limit;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading.users = false;
        state.error = action.payload;
      })

      // User Detail Profile
      .addCase(fetchUserById.pending, (state) => {
        state.loading.userProfile = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading.userProfile = false;
        state.selectedUser = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading.userProfile = false;
        state.error = action.payload;
      })

      // Action modifiers (User blocks, Subscriptions edits)
      .addCase(toggleUserStatus.pending, (state) => {
        state.loading.actions = true;
      })
      .addCase(toggleUserStatus.fulfilled, (state, action) => {
        state.loading.actions = false;
        // Update user status inside the active users lists
        const target = state.users.list.find((u) => u.id === action.payload.id);
        if (target) {
          target.status = action.payload.status;
        }
        if (state.selectedUser && state.selectedUser.profile.id === action.payload.id) {
          state.selectedUser.profile.status = action.payload.status;
        }
      })
      .addCase(toggleUserStatus.rejected, (state, action) => {
        state.loading.actions = false;
        state.error = action.payload;
      })

      // Subscriptions List
      .addCase(fetchSubscriptions.pending, (state) => {
        state.loading.subscriptions = true;
        state.error = null;
      })
      .addCase(fetchSubscriptions.fulfilled, (state, action) => {
        state.loading.subscriptions = false;
        state.subscriptions.list = action.payload.subscriptions;
        state.subscriptions.total = action.payload.total;
        state.subscriptions.page = action.payload.page;
        state.subscriptions.totalPages = action.payload.totalPages;
        state.subscriptions.limit = action.payload.limit;
      })
      .addCase(fetchSubscriptions.rejected, (state, action) => {
        state.loading.subscriptions = false;
        state.error = action.payload;
      })

      // Update Subscriptions Action
      .addCase(updateSubscription.pending, (state) => {
        state.loading.actions = true;
      })
      .addCase(updateSubscription.fulfilled, (state) => {
        state.loading.actions = false;
      })
      .addCase(updateSubscription.rejected, (state, action) => {
        state.loading.actions = false;
        state.error = action.payload;
      })

      // Analytics Stats
      .addCase(fetchAnalytics.pending, (state) => {
        state.loading.analytics = true;
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.loading.analytics = false;
        state.analytics = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.loading.analytics = false;
        state.error = action.payload;
      })

      // Audit Logs
      .addCase(fetchAuditLogs.pending, (state) => {
        state.loading.auditLogs = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.loading.auditLogs = false;
        state.auditLogs.list = action.payload.logs;
        state.auditLogs.total = action.payload.total;
        state.auditLogs.page = action.payload.page;
        state.auditLogs.totalPages = action.payload.totalPages;
        state.auditLogs.limit = action.payload.limit;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.loading.auditLogs = false;
        state.error = action.payload;
      });
  },
});

export const { clearAdminError, clearSelectedUser } = adminSlice.actions;

// Selectors
export const selectAdminStats = (state) => state.admin.stats;
export const selectAdminUsers = (state) => state.admin.users;
export const selectAdminSelectedUser = (state) => state.admin.selectedUser;
export const selectAdminSubscriptions = (state) => state.admin.subscriptions;
export const selectAdminAnalytics = (state) => state.admin.analytics;
export const selectAdminAuditLogs = (state) => state.admin.auditLogs;
export const selectAdminLoading = (state) => state.admin.loading;
export const selectAdminError = (state) => state.admin.error;

export default adminSlice.reducer;
