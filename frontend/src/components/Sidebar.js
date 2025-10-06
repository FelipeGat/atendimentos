import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';
import {
    FaTachometerAlt, FaFileAlt, FaUsers, FaTools, FaBuilding, FaStream,
    FaComments, FaUserCircle, FaSignOutAlt, FaEdit, FaAngleLeft, FaClipboardList,
    FaMoneyBillWave, FaChevronDown, FaChartPie, FaExchangeAlt, FaDatabase, FaBoxOpen
} from 'react-icons/fa';

// --- Subcomponente para Item de Menu (sem alterações) ---
const MenuItem = ({ to, icon, text, isCollapsed }) => (
    <li className="menu-item">
        <NavLink to={to} className="menu-link">
            <div className="menu-icon">{icon}</div>
            {!isCollapsed && <span className="menu-text">{text}</span>}
        </NavLink>
        {isCollapsed && <div className="tooltip">{text}</div>}
    </li>
);

// --- Subcomponente para Seção de Menu (MODIFICADO) ---
const MenuSection = ({ title, icon, children, isCollapsed }) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isCollapsed) {
            setIsOpen(false);
        }
    }, [isCollapsed]);

    return (
        <div className="menu-section">
            <div className="menu-section-toggle" onClick={() => !isCollapsed && setIsOpen(!isOpen)}>
                {/* Agrupando ícone e texto para alinhamento à esquerda */}
                <div className="menu-item-content">
                    <div className="menu-icon">{icon}</div>
                    {!isCollapsed && <span className="menu-text">{title}</span>}
                </div>

                {/* A seta fica fora do grupo para ser alinhada à direita */}
                {!isCollapsed && <FaChevronDown className={`submenu-arrow ${isOpen ? 'open' : ''}`} />}
            </div>

            {isCollapsed && <div className="tooltip">{title}</div>}

            <ul className={`submenu-items ${isOpen ? 'open' : ''}`}>
                {children}
            </ul>
        </div>
    );
};

// --- Componente Principal da Sidebar (MODIFICADO) ---
const Sidebar = ({ isCollapsed, toggleSidebar }) => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(() => {
        const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : {};
    });

    useEffect(() => {
        const handleStorageChange = () => {
            const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
            setCurrentUser(storedUser ? JSON.parse(storedUser) : {});
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
    };

    return (
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                {/* ... (código do header sem alterações) ... */}
                {!isCollapsed && (
                    <div className="user-profile">
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
                            <span>{currentUser?.nome || "Usuário"}</span>
                            <div className="user-actions">
                                <FaEdit
                                    title="Editar Perfil"
                                    onClick={() => navigate(`/usuarios/editar/${currentUser.id}`)}
                                />
                                <FaSignOutAlt title="Sair" onClick={handleLogout} />
                            </div>
                        </div>
                    </div>
                )}
                <button onClick={toggleSidebar} className="toggle-btn">
                    <FaAngleLeft />
                </button>
            </div>

            <nav className="menu-container">
                {/* Os títulos separados foram removidos. A lógica agora está no MenuSection. */}
                <MenuSection title="Gestão" icon={<FaTachometerAlt />} isCollapsed={isCollapsed}>
                    <MenuItem to="/dashboard" icon={<FaChartPie />} text="Dashboard" isCollapsed={isCollapsed} />
                    <MenuItem to="/atendimentos" icon={<FaClipboardList />} text="Atendimentos" isCollapsed={isCollapsed} />
                    <MenuItem to="/relatorios" icon={<FaFileAlt />} text="Relatórios" isCollapsed={isCollapsed} />
                    <MenuItem to="/orcamentos" icon={<FaFileAlt />} text="Orçamentos" isCollapsed={isCollapsed} />
                </MenuSection>

                <MenuSection title="Cadastros" icon={<FaDatabase />} isCollapsed={isCollapsed}>
                    <MenuItem to="/empresas" icon={<FaBuilding />} text="Empresas" isCollapsed={isCollapsed} />
                    <MenuItem to="/usuarios" icon={<FaUsers />} text="Usuários" isCollapsed={isCollapsed} />
                    <MenuItem to="/equipamentos" icon={<FaTools />} text="Equipamentos" isCollapsed={isCollapsed} />
                    <MenuItem to="/clientes" icon={<FaUsers />} text="Clientes" isCollapsed={isCollapsed} />
                    <MenuItem to="/segmentos" icon={<FaStream />} text="Segmentos" isCollapsed={isCollapsed} />
                    <MenuItem to="/assuntos" icon={<FaComments />} text="Assuntos" isCollapsed={isCollapsed} />
                </MenuSection>

                <MenuSection title="Financeiro" icon={<FaMoneyBillWave />} isCollapsed={isCollapsed}>
                    <MenuItem to="/dashboardfinanceiro" icon={<FaChartPie />} text="Dashboard Financeiro" isCollapsed={isCollapsed} />
                    <MenuItem to="/financeiro/contas" icon={<FaExchangeAlt />} text="Contas a Pagar/Receber" isCollapsed={isCollapsed} />
                    <MenuItem to="/financeiro/recorrentes" icon={<FaStream />} text="Lançamentos Recorrentes" isCollapsed={isCollapsed} />
                    <MenuItem to="/financeiro/bancos" icon={<FaDatabase />} text="Contas Bancárias" isCollapsed={isCollapsed} />
                    <MenuItem to="/financeiro/produtos" icon={<FaBoxOpen />} text="Produtos/Serviços" isCollapsed={isCollapsed} />
                </MenuSection>
            </nav>
        </div>
    );
};

export default Sidebar;
