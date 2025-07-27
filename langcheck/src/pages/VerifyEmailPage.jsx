import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const VerifyEmailPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [verificationStatus, setVerificationStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('이메일 주소를 인증하고 있습니다...');

    useEffect(() => {
        const verifyEmail = async () => {
            if (!token) {
                setVerificationStatus('error');
                setMessage('인증 토큰이 유효하지 않습니다.');
                return;
            }

            try {
                const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/auth/verify-email/${token}`);
                
                if (response.status === 200) {
                    setVerificationStatus('success');
                    setMessage('✅ 이메일 인증이 성공적으로 완료되었습니다! 잠시 후 로그인 페이지로 이동합니다.');
                    setTimeout(() => {
                        navigate('/login');
                    }, 3000);
                }
            } catch (error) {
                setVerificationStatus('error');
                if (error.response && error.response.data && error.response.data.detail) {
                    setMessage(`❌ 인증 실패: ${error.response.data.detail}`);
                } else {
                    setMessage('❌ 이메일 인증 중 오류가 발생했습니다. 다시 시도해주세요.');
                }
            }
        };

        verifyEmail();
    }, [token, navigate]);

    const getStatusStyle = () => {
        switch (verificationStatus) {
            case 'success':
                return { color: 'green' };
            case 'error':
                return { color: 'red' };
            default:
                return { color: 'blue' };
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
            <h2>이메일 인증</h2>
            <p style={getStatusStyle()}>{message}</p>
        </div>
    );
};

export default VerifyEmailPage;
