import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Assuntos from './pages/Assuntos/Assuntos';
import Clientes from './pages/Clientes/Clientes';
import Usuarios from './pages/Usuarios/Usuarios';
import Equipamentos from './pages/Equipamentos/Equipamentos';
import Segmentos from './pages/Segmentos/Segmentos';
import Atendimentos from './pages/Atendimentos/Atendimentos';
import Dashboard from './pages/Dashboard/Dashboard';
import Relatorios from './pages/Relatorios/Relatorios';
import Orcamentos from './pages/Orcamentos/Orcamentos';
import Empresas from './pages/Empresas/Empresas';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import './App.css';
import EditarUsuario from './pages/Usuarios/EditarUsuario';
import DashboardFinanceiro from './pages/Financeiro/DashboardFinanceiro';

function App() {
  // Determinar o basename com base no ambiente e na URL
  const getBasename = () => {
    // Em produção, usar /gestao
    if (process.env.NODE_ENV === 'production') {
      return '/gestao';
    }

    // Em desenvolvimento, determinar com base na URL
    // Se estiver servindo em http://localhost:3000/Atendimentos/, usar /Atendimentos
    // Se estiver servindo em http://localhost:3000/, não usar basename
    const pathname = window.location.pathname;
    if (pathname.startsWith('/Atendimentos')) {
      return '/Atendimentos';
    }

    // Por padrão, não usar basename em desenvolvimento
    return '';
  };

  const basename = getBasename();

  console.log('Ambiente detectado:', {
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    basename: basename,
    env: process.env.NODE_ENV
  });

  return (
    <BrowserRouter basename={basename}>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />

          {/* Rotas que usam o Layout com Sidebar */}
          <Route
            path="/assuntos"
            element={<ProtectedRoute><Layout><Assuntos /></Layout></ProtectedRoute>}
          />
          <Route
            path="/clientes"
            element={<ProtectedRoute><Layout><Clientes /></Layout></ProtectedRoute>}
          />

          {/* Lista de usuários */}
          <Route
            path="/usuarios"
            element={<ProtectedRoute><Layout><Usuarios /></Layout></ProtectedRoute>}
          />

          {/* Edição de usuário */}
          <Route
            path="/usuarios/editar/:id"
            element={<ProtectedRoute><Layout><EditarUsuario /></Layout></ProtectedRoute>}
          />

          <Route
            path="/equipamentos"
            element={<ProtectedRoute><Layout><Equipamentos /></Layout></ProtectedRoute>}
          />
          <Route
            path="/segmentos"
            element={<ProtectedRoute><Layout><Segmentos /></Layout></ProtectedRoute>}
          />
          <Route
            path="/atendimentos"
            element={<ProtectedRoute><Layout><Atendimentos /></Layout></ProtectedRoute>}
          />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>}
          />
          <Route
            path="/relatorios"
            element={<ProtectedRoute><Layout><Relatorios /></Layout></ProtectedRoute>}
          />
          <Route
            path="/orcamentos"
            element={<ProtectedRoute><Layout><Orcamentos /></Layout></ProtectedRoute>}
          />
          <Route
            path="/empresas"
            element={<ProtectedRoute><Layout><Empresas /></Layout></ProtectedRoute>}
          />
          <Route
            path="/DashboardFinanceiro"
            element={<ProtectedRoute><Layout><DashboardFinanceiro /></Layout></ProtectedRoute>}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;