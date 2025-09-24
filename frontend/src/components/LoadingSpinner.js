/**
 * Componente de Loading Spinner
 * Sistema de Gerenciamento de Atendimentos
 */

import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = 'Carregando...' }) => {
    return (
        <div className="loading-container">
            <div className="loading-spinner"></div>
            <span className="loading-message">{message}</span>
        </div>
    );
};

export default LoadingSpinner;

