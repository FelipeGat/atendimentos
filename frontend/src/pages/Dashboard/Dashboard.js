import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../../utils/api';
import { useMessage } from '../../hooks/useMessage';
import Message from '../../components/Message';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Dashboard.css';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        estatisticas: {},
        atendimentos_por_status: [],
        atendimentos_por_prioridade: [],
        atendimentos_recentes: [],
        top_clientes: [],
        top_assuntos: [],
        performance_usuarios: [],
        atendimentos_por_periodo: []
    });

    const { message, showError } = useMessage();

    // Carregar dados do dashboard
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const result = await dashboardAPI.obterDados();
            setDashboardData(result.data || {});
        } catch (error) {
            showError('Erro ao carregar dados do dashboard: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Formatar números
    const formatNumber = (num) => {
        if (!num) return '0';
        return new Intl.NumberFormat('pt-BR').format(num);
    };

    // Formatar valor monetário
    const formatCurrency = (value) => {
        if (!value) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // Formatar data
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    // Obter cor para prioridade
    const getPriorityColor = (prioridade) => {
        const colors = {
            'baixa': '#28a745',
            'media': '#ffc107',
            'alta': '#fd7e14',
            'urgente': '#dc3545'
        };
        return colors[prioridade] || '#6c757d';
    };

    // Obter cor para status
    const getStatusColor = (status) => {
        const colors = {
            'aberto': '#007bff',
            'em_andamento': '#ffc107',
            'aguardando_cliente': '#fd7e14',
            'concluido': '#28a745',
            'cancelado': '#dc3545'
        };
        return colors[status] || '#6c757d';
    };

    if (loading) {
        return <LoadingSpinner message="Carregando dashboard..." />;
    }

    const { estatisticas } = dashboardData;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Dashboard</h1>
                <button className="btn-secondary" onClick={fetchDashboardData}>
                    🔄 Atualizar
                </button>
            </div>

            <Message message={message} />

            <div className="dashboard-content">
                {/* KPIs */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-icon">👥</div>
                        <div className="kpi-content">
                            <h3>Clientes Ativos</h3>
                            <span className="kpi-value">{formatNumber(estatisticas.total_clientes)}</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon">🖥️</div>
                        <div className="kpi-content">
                            <h3>Equipamentos</h3>
                            <span className="kpi-value">{formatNumber(estatisticas.total_equipamentos)}</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon">📋</div>
                        <div className="kpi-content">
                            <h3>Total Atendimentos</h3>
                            <span className="kpi-value">{formatNumber(estatisticas.total_atendimentos)}</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon">🔓</div>
                        <div className="kpi-content">
                            <h3>Atendimentos Abertos</h3>
                            <span className="kpi-value">{formatNumber(estatisticas.atendimentos_abertos)}</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon">✅</div>
                        <div className="kpi-content">
                            <h3>Concluídos Este Mês</h3>
                            <span className="kpi-value">{formatNumber(estatisticas.atendimentos_mes)}</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon">💰</div>
                        <div className="kpi-content">
                            <h3>Receita do Mês</h3>
                            <span className="kpi-value">{formatCurrency(estatisticas.receita_mes)}</span>
                        </div>
                    </div>
                </div>

                {/* Gráficos e Tabelas */}
                <div className="dashboard-grid">
                    {/* Atendimentos por Status */}
                    <div className="dashboard-card">
                        <h3>Atendimentos por Status</h3>
                        <div className="chart-container">
                            {dashboardData.atendimentos_por_status?.length > 0 ? (
                                <div className="status-chart">
                                    {dashboardData.atendimentos_por_status.map((item, index) => (
                                        <div key={index} className="status-item">
                                            <div 
                                                className="status-bar" 
                                                style={{ 
                                                    backgroundColor: getStatusColor(item.status),
                                                    width: `${(item.quantidade / Math.max(...dashboardData.atendimentos_por_status.map(i => i.quantidade))) * 100}%`
                                                }}
                                            ></div>
                                            <span className="status-label">{item.status}: {item.quantidade}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-data">Nenhum dado disponível</p>
                            )}
                        </div>
                    </div>

                    {/* Atendimentos por Prioridade */}
                    <div className="dashboard-card">
                        <h3>Atendimentos por Prioridade</h3>
                        <div className="chart-container">
                            {dashboardData.atendimentos_por_prioridade?.length > 0 ? (
                                <div className="priority-chart">
                                    {dashboardData.atendimentos_por_prioridade.map((item, index) => (
                                        <div key={index} className="priority-item">
                                            <div 
                                                className="priority-bar" 
                                                style={{ 
                                                    backgroundColor: getPriorityColor(item.prioridade),
                                                    width: `${(item.quantidade / Math.max(...dashboardData.atendimentos_por_prioridade.map(i => i.quantidade))) * 100}%`
                                                }}
                                            ></div>
                                            <span className="priority-label">{item.prioridade}: {item.quantidade}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-data">Nenhum dado disponível</p>
                            )}
                        </div>
                    </div>

                    {/* Top Clientes */}
                    <div className="dashboard-card">
                        <h3>Top Clientes</h3>
                        <div className="table-container">
                            {dashboardData.top_clientes?.length > 0 ? (
                                <table className="dashboard-table">
                                    <thead>
                                        <tr>
                                            <th>Cliente</th>
                                            <th>Atendimentos</th>
                                            <th>Valor Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.top_clientes.slice(0, 5).map((cliente, index) => (
                                            <tr key={index}>
                                                <td>{cliente.nome}</td>
                                                <td>{cliente.total_atendimentos}</td>
                                                <td>{formatCurrency(cliente.valor_total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="no-data">Nenhum dado disponível</p>
                            )}
                        </div>
                    </div>

                    {/* Top Assuntos */}
                    <div className="dashboard-card">
                        <h3>Assuntos Mais Frequentes</h3>
                        <div className="table-container">
                            {dashboardData.top_assuntos?.length > 0 ? (
                                <table className="dashboard-table">
                                    <thead>
                                        <tr>
                                            <th>Assunto</th>
                                            <th>Atendimentos</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.top_assuntos.slice(0, 5).map((assunto, index) => (
                                            <tr key={index}>
                                                <td>{assunto.nome}</td>
                                                <td>{assunto.total_atendimentos}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="no-data">Nenhum dado disponível</p>
                            )}
                        </div>
                    </div>

                    {/* Performance dos Usuários */}
                    <div className="dashboard-card">
                        <h3>Performance dos Usuários</h3>
                        <div className="table-container">
                            {dashboardData.performance_usuarios?.length > 0 ? (
                                <table className="dashboard-table">
                                    <thead>
                                        <tr>
                                            <th>Usuário</th>
                                            <th>Total</th>
                                            <th>Concluídos</th>
                                            <th>Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.performance_usuarios.slice(0, 5).map((usuario, index) => (
                                            <tr key={index}>
                                                <td>{usuario.nome}</td>
                                                <td>{usuario.total_atendimentos}</td>
                                                <td>{usuario.atendimentos_concluidos}</td>
                                                <td>{formatCurrency(usuario.valor_total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="no-data">Nenhum dado disponível</p>
                            )}
                        </div>
                    </div>

                    {/* Atendimentos Recentes */}
                    <div className="dashboard-card dashboard-card-wide">
                        <h3>Atendimentos Recentes</h3>
                        <div className="table-container">
                            {dashboardData.atendimentos_recentes?.length > 0 ? (
                                <table className="dashboard-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Cliente</th>
                                            <th>Descrição</th>
                                            <th>Status</th>
                                            <th>Prioridade</th>
                                            <th>Responsável</th>
                                            <th>Criado em</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.atendimentos_recentes.map((atendimento, index) => (
                                            <tr key={index}>
                                                <td>{atendimento.id}</td>
                                                <td>{atendimento.cliente_nome}</td>
                                                <td className="description-cell">
                                                    {atendimento.descricao?.length > 50 
                                                        ? `${atendimento.descricao.substring(0, 50)}...` 
                                                        : atendimento.descricao
                                                    }
                                                </td>
                                                <td>
                                                    <span className={`status status-${atendimento.status}`}>
                                                        {atendimento.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`priority priority-${atendimento.prioridade}`}>
                                                        {atendimento.prioridade}
                                                    </span>
                                                </td>
                                                <td>{atendimento.usuario_nome || '-'}</td>
                                                <td>{formatDate(atendimento.criado_em)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="no-data">Nenhum atendimento recente</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

