import React from 'react';

// 이름에서 이니셜을 추출하는 함수 (한글/영문 지원)
const getInitials = (name = '') => {
  if (!name) return '';
  
  const nameParts = name.trim().split(' ');
  // 이름이 2단어 이상이고, 마지막 파트가 비어있지 않은 경우
  if (nameParts.length > 1 && nameParts[nameParts.length - 1]) {
    return (nameParts[0][0] + (nameParts[nameParts.length - 1][0])).toUpperCase();
  }

  // 한글 이름 또는 단일 단어 이름 처리
  if (name.length > 1) {
    return `${name[0]}${name[name.length - 1]}`;
  }
  
  return name[0]?.toUpperCase() || '';
};

// 문자열을 기반으로 HSL 색상을 생성하는 함수
const generateColor = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  // 채도와 명도를 조절하여 부드러운 파스텔톤 색상 생성
  return `hsl(${h}, 70%, 85%)`;
};

const Avatar = ({ src, name, size = 80 }) => {
  const initials = getInitials(name);
  const backgroundColor = generateColor(name);

  const style = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${size / 2.5}px`,
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover rounded-full"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{ ...style, backgroundColor }}
    >
      <svg 
        className="w-3/5 h-3/5 text-gray-600 opacity-70"
        fill="currentColor" 
        viewBox="0 0 20 20" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          fillRule="evenodd" 
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" 
          clipRule="evenodd" 
        />
      </svg>
    </div>
  );
};

export default Avatar;
