// src/components/Layout.js
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({ children }) => {
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <div className="layout-container">
            <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
            <main className={`main-content ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                {children}
            </main>
        </div>
    );
};

export default Layout;
