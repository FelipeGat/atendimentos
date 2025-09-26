import React from 'react';
import './ToggleSwitch.css';

const ToggleSwitch = ({ id, checked, onChange, label }) => {
    return (
        <div className="toggle-switch">
            <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={onChange}
                className="toggle-checkbox"
            />
            <label htmlFor={id} className="toggle-label">
                <span className="toggle-text">{label}</span>
                <span className="toggle-slider"></span>
            </label>
        </div>
    );
};

export default ToggleSwitch;