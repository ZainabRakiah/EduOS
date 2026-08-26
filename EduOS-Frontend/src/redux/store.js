import { configureStore } from '@reduxjs/toolkit';
import {
  uiReducer,
  authReducer,
  notesReducer,
  resourcesReducer,
  knowledgeReducer,
  historyReducer,
  settingsReducer,
  dashboardReducer,
  chapterExplainerReducer,
  mockTestReducer,
  subscriptionReducer,
  adminReducer,
} from './slices/index.js';

const rootReducer = {
  ui: uiReducer,
  auth: authReducer,
  notes: notesReducer,
  resources: resourcesReducer,
  knowledge: knowledgeReducer,
  history: historyReducer,
  settings: settingsReducer,
  dashboard: dashboardReducer,
  chapterExplainer: chapterExplainerReducer,
  mockTest: mockTestReducer,
  subscription: subscriptionReducer,
  admin: adminReducer,
};

export const makeStore = () => {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [],
          ignoredPaths: [],
        },
      }),
    devTools: import.meta.env.DEV,
  });
};

const store = makeStore();

export default store;
