import React from 'react';

const MobileDownloadButton = () => {
  // Visible on mobile viewports via Tailwind md:hidden
  // The APK should be placed in frontend/public/codesync.apk
  return (
    <div className="md:hidden flex justify-center my-4">
      <a
        href="/codesync.apk"
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded"
      >
        Download Android App
      </a>
    </div>
  );
};

export default MobileDownloadButton;
