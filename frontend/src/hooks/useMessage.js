/**
 * Hook para gerenciamento de mensagens
 * Sistema de Gerenciamento de Atendimentos
 */

import { useState, useCallback } from 'react';

export const useMessage = () => {
    const [message, setMessage] = useState({ text: '', type: '' });

    const showMessage = useCallback((text, type = 'info') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }, []);

    const showSuccess = useCallback((text) => {
        showMessage(text, 'success');
    }, [showMessage]);

    const showError = useCallback((text) => {
        showMessage(text, 'error');
    }, [showMessage]);

    const showWarning = useCallback((text) => {
        showMessage(text, 'warning');
    }, [showMessage]);

    const showInfo = useCallback((text) => {
        showMessage(text, 'info');
    }, [showMessage]);

    const clearMessage = useCallback(() => {
        setMessage({ text: '', type: '' });
    }, []);

    return {
        message,
        showMessage,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        clearMessage
    };
};

