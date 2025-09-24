import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import { useNavigate } from "react-router-dom";
import {
    FaTachometerAlt, FaFileAlt, FaUsers, FaTools, FaBuilding, FaStream,
    FaComments, FaUserCircle, FaSignOutAlt, FaEdit, FaAngleLeft, FaClipboardList
} from 'react-icons/fa';

// O 'isCollapsed' e 'toggleSidebar' virão do componente pai (Layout)
const Sidebar = ({ isCollapsed, toggleSidebar }) => {

    const navigate = useNavigate();

    // 1. Usar um estado para armazenar o usuário
    const [currentUser, setCurrentUser] = useState(() => {
        const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : {};
    });

    // 2. Adicionar um listener para mudanças no localStorage
    useEffect(() => {
        const handleStorageChange = () => {
            const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
            setCurrentUser(storedUser ? JSON.parse(storedUser) : {});
        };

        window.addEventListener('storage', handleStorageChange);

        // Retorna uma função de limpeza que remove o listener quando o componente é desmontado
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    }

    return (
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                {/* Mostra o ícone do usuário e o nome/ações quando expandido */}
                {!isCollapsed && (
                    <div className="user-profile">
                        {/* 3. Renderizar com base no estado 'currentUser' */}
                        {currentUser?.foto ? (
                            <img
                                src={`${process.env.REACT_APP_API_BASE_URL}/${currentUser.foto}`}
                                alt="Foto do usuário"
                                className="user-avatar"
                            />
                        ) : (
                            <FaUserCircle size={40} />
                        )}
                        <div className="user-info">
                            <span>{currentUser?.nome || "Nome do Usuário"}</span>
                            <div className="user-actions">
                                <FaEdit
                                    title="Editar Perfil"
                                    onClick={() => navigate(`/usuarios/editar/${currentUser.id}`)}
                                />
                                <FaSignOutAlt
                                    title="Sair"
                                    onClick={handleLogout}
                                />
                            </div>
                        </div>
                    </div>
                )}
                {/* Ícone para recolher/expandir a sidebar */}
                <button onClick={toggleSidebar} className="toggle-btn">
                    <FaAngleLeft />
                </button>
            </div>

            <nav className="menu">
                <div className="menu-section">
                    {!isCollapsed && <h4>GESTÃO</h4>}
                    <ul>
                        <li>
                            <NavLink to="/dashboard">
                                <FaTachometerAlt size={20} />
                                <span>Dashboard</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/atendimentos">
                                <FaClipboardList size={20} />
                                <span>Atendimentos</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/relatorios">
                                <FaFileAlt size={20} />
                                <span>Relatórios</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/orcamentos">
                                <FaFileAlt size={20} />
                                <span>Orçamentos</span>
                            </NavLink>
                        </li>
                    </ul>
                </div>

                <div className="menu-section">
                    {!isCollapsed && <h4>CADASTROS</h4>}
                    <ul>
                        <li>
                            <NavLink to="/empresas">
                                <FaUsers size={20} />
                                <span>Empresas</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/usuarios">
                                <FaUsers size={20} />
                                <span>Usuários</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/equipamentos">
                                <FaTools size={20} />
                                <span>Equipamentos</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/clientes">
                                <FaBuilding size={20} />
                                <span>Clientes</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/segmentos">
                                <FaStream size={20} />
                                <span>Segmentos</span>
                            </NavLink>
                        </li>
                        <li>
                            {/* "activeClassName" foi substituído por uma função no v6 do react-router-dom */}
                            <NavLink to="/assuntos" className={({ isActive }) => isActive ? "active-link" : ""}>
                                <FaComments size={20} />
                                <span>Assuntos</span>
                            </NavLink>
                        </li>
                    </ul>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;