import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    const isAuthenticated = !!userData;

    if (!isAuthenticated) {
        // Se não estiver logado, redireciona para a página de login
        return <Navigate to="/" replace />;
    }

    // Se estiver logado, renderiza os componentes filhos
    return children;
};

export default ProtectedRoute;