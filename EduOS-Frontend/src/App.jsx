import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from '@redux/store.js';
import router from '@routes/index.jsx';
import { getCurrentUser, selectAccessToken } from '@redux/slices/auth.slice.js';
import { fetchSubscription } from '@redux/slices/subscription.slice.js';
import { ToastContainer } from '@components/ui/index.jsx';

const AppInitializer = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(selectAccessToken);

  useEffect(() => {
    if (accessToken) {
      dispatch(getCurrentUser());
      dispatch(fetchSubscription());
    }
  }, [dispatch, accessToken]);

  return <RouterProvider router={router} />;
};

const App = () => {
  return (
    <Provider store={store}>
      <AppInitializer />
      <ToastContainer />
    </Provider>
  );
};

export default App;
