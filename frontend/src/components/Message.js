/**
 * Componente de Mensagem
 * Sistema de Gerenciamento de Atendimentos
 */

import React from 'react';
import './Message.css';

const Message = ({ message, onClose }) => {
    if (!message.text) return null;

    return (
        <div className={`message ${message.type}`}>
            <span>{message.text}</span>
            {onClose && (
                <button className="message-close" onClick={onClose}>
                    ×
                </button>
            )}
        </div>
    );
};

export default Message;

