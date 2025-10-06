/**
 * Componente de Mensagem
 * Sistema de Gerenciamento de Atendimentos
 */

import React from 'react';
import './Message.css';

const Message = ({ message, text, type, onClose }) => {
    // Handle both the old format (message object) and new format (text and type as separate props)
    const displayText = text !== undefined ? text : message?.text;
    const displayType = type !== undefined ? type : message?.type || 'info';
    
    if (!displayText) return null;

    return (
        <div className={`message ${displayType}`}>
            <span>{displayText}</span>
            {onClose && (
                <button className="message-close" onClick={onClose}>
                    ×
                </button>
            )}
        </div>
    );
};

export default Message;

