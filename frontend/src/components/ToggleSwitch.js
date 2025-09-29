import React from 'react';
import './ToggleSwitch.css';

const ToggleSwitch = ({ id, checked, onChange, label }) => {
    return (
        <div className="toggle-switch-container">
            <input
                type="checkbox"
                className="toggle-switch-checkbox"
                id={id}
                checked={checked}
                onChange={onChange}
            />
            <label className="toggle-switch-label" htmlFor={id}>
                <span className="toggle-switch-inner" />
                <span className="toggle-switch-switch" />
            </label>
            {label && <span className="toggle-switch-text-label">{label}</span>}
        </div>
    );
};

export default ToggleSwitch;
