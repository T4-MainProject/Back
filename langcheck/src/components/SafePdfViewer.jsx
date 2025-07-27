import React, { useState, useEffect } from 'react';

const SafePdfViewer = ({ pdfUrl, alt, className }) => {
  const [showIframe, setShowIframe] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    if (pdfUrl) {
      const info = {
        url: pdfUrl,
        length: pdfUrl.length,
        startsWithData: pdfUrl.startsWith('data:'),
        type: pdfUrl.split(',')[0],
        preview: pdfUrl.substring(0, 100) + '...',
      };
      setDebugInfo(info);
      console.log('PDF URL 분석:', info);
    }
  }, [pdfUrl, alt]);

  const handleOpenNewWindow = () => {
    if (pdfUrl) {
      try {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${alt || 'PDF 파일'}</title>
                <style>
                  body { margin: 0; background-color: #f5f5f5; }
                  iframe { width: 100vw; height: 100vh; border: none; }
                </style>
              </head>
              <body>
                <iframe src="${pdfUrl}"></iframe>
              </body>
            </html>
          `);
          newWindow.document.close();
        }
      } catch (error) {
        console.error('새 창 열기 실패:', error);
        alert('팝업이 차단되었을 수 있습니다. 브라우저 설정을 확인해주세요.');
      }
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = alt || 'document.pdf';
      link.click();
    }
  };

  if (!pdfUrl) {
    return (
      <div className="text-center p-8">
        <p>PDF 파일 데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="text-center p-8">
      <h3 className="text-xl font-bold text-gray-800 mb-2">PDF 파일</h3>
      <p className="text-gray-600 mb-4">{alt}</p>
      <div className="space-y-3">
        <button onClick={handleOpenNewWindow} className="bg-red-500 text-white px-6 py-3 rounded-xl font-medium">새 창에서 열기</button>
        <button onClick={() => setShowIframe(!showIframe)} className="bg-blue-500 text-white px-6 py-3 rounded-xl font-medium">
          {showIframe ? '미리보기 숨기기' : '미리보기 보기'}
        </button>
        <button onClick={handleDownload} className="bg-green-500 text-white px-6 py-3 rounded-xl font-medium">다운로드</button>
      </div>
      {showIframe && (
        <div className="mt-6 border rounded-lg overflow-hidden">
          <iframe src={pdfUrl} className="w-full h-[600px] border-0" title={alt}></iframe>
        </div>
      )}
    </div>
  );
};

export default SafePdfViewer;
