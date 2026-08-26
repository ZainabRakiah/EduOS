import React from 'react';
import { useAppSelector } from '@hooks';
import { selectUser } from '@redux/slices/auth.slice.js';

const GovtJobsRedirect = () => {
  const user = useAppSelector(selectUser);
  const userName = user?.name || user?.firstName || user?.email?.split('@')[0] || 'Student';
  const name = encodeURIComponent(userName);

  return (
    <div className="w-full h-[calc(100vh-4rem)] bg-white">
      <iframe 
        src={`http://localhost:5174?name=${name}`} 
        className="w-full h-full border-none rounded-tl-2xl overflow-hidden"
        title="Govt Jobs"
      />
    </div>
  );
};

export default GovtJobsRedirect;
