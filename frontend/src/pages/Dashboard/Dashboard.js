import React, { useState, useEffect } from 'react';
// IMPORTANTE: Adicionado empresasAPI para buscar a lista de empresas
import { dashboardAPI, empresasAPI } from '../../utils/api';
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

    const [empresas, setEmpresas] = useState([]);
    // **NOVO:** Estado para a empresa selecionada
    const [empresaIdSelecionada, setEmpresaIdSelecionada] = useState(null);

    const { message, showError } = useMessage();

    // **NOVA FUNÇÃO:** Carregar a lista de empresas
    const fetchEmpresas = async () => {
        try {
            const result = await empresasAPI.listar();
            if (result.success && result.data.length > 0) {
                setEmpresas(result.data);
                // Define a primeira empresa como a inicial
                setEmpresaIdSelecionada(result.data[0].id);
            } else {
                showError('Não foi possível carregar a lista de empresas.');
            }
        } catch (error) {
            showError('Erro ao carregar a lista de empresas: ' + error.message);
        }
    };

    // Função principal para carregar os dados do dashboard
    const fetchDashboardData = async (empresaId) => {
        if (!empresaId) {
            // Não tenta buscar se não houver um ID
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const result = await dashboardAPI.obterDados({ empresaId });
            setDashboardData(result.data || {});
        } catch (error) {
            showError('Erro ao carregar dados do dashboard. Mensagem: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Efeito para carregar as empresas na montagem do componente
    useEffect(() => {
        fetchEmpresas();
    }, []);

    // Efeito para carregar o dashboard sempre que a empresa selecionada mudar
    useEffect(() => {
        if (empresaIdSelecionada) {
            fetchDashboardData(empresaIdSelecionada);
        }
    }, [empresaIdSelecionada]);


    // Formatar números
    const formatNumber = (num) => {
        if (num === null || num === undefined) return '0';
        return new Intl.NumberFormat('pt-BR').format(num);
    };

    // Formatar valor monetário
    const formatCurrency = (value) => {
        if (value === null || value === undefined) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // Formatar data
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    };

    // Obter cor para prioridade
    const getPriorityColor = (prioridade) => {
        const colors = {
            'baixa': '#4caf50',
            'media': '#ffc107',
            'alta': '#ff5722',
            'urgente': '#e53935'
        };
        return colors[prioridade?.toLowerCase()] || '#6c757d';
    };

    // Obter cor para status
    const getStatusColor = (status) => {
        const colors = {
            'aberto': '#007bff',
            'em_andamento': '#ff9800',
            'aguardando_cliente': '#ffa000',
            'concluido': '#28a745',
            'cancelado': '#dc3545'
        };
        return colors[status?.toLowerCase()] || '#6c757d';
    };

    if (loading) {
        return <LoadingSpinner message="Carregando dashboard..." />;
    }

    const { estatisticas } = dashboardData;

    // Função auxiliar para obter valores seguros de estatisticas
    const getEstatisticaValue = (key, defaultValue = 0) => {
        return estatisticas && estatisticas[key] !== undefined ? estatisticas[key] : defaultValue;
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Dashboard</h1>
                {/* NOVO: Seletor de empresas */}
                <div className="dashboard-filters">
                    <label htmlFor="empresa-select" className="sr-only">Filtrar por Empresa:</label>
                    <select
                        id="empresa-select"
                        value={empresaIdSelecionada || ''}
                        onChange={(e) => setEmpresaIdSelecionada(e.target.value)}
                        disabled={empresas.length === 0}
                    >
                        {empresas.length > 0 ? (
                            empresas.map(empresa => (
                                <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
                            ))
                        ) : (
                            <option value="">Nenhuma empresa encontrada</option>
                        )}
                    </select>
                </div>
            </div>

            <Message message={message} />

            {/* O restante do código do dashboard (os KPIs, tabelas, etc.) permanece o mesmo */}
            <div className="dashboard-content">
                {/* KPIs */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-icon icon-primary">👥</div>
                        <div className="kpi-content">
                            <h3>Clientes Ativos</h3>
                            <span className="kpi-value">{formatNumber(getEstatisticaValue('total_clientes'))}</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon icon-info">🖥️</div>
                        <div className="kpi-content">
                            <h3>Equipamentos</h3>
                            <span className="kpi-value">{formatNumber(getEstatisticaValue('total_equipamentos'))}</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon icon-secondary">📋</div>
                        <div className="kpi-content">
                            <h3>Total Atendimentos</h3>
                            <span className="kpi-value">{formatNumber(getEstatisticaValue('total_atendimentos'))}</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon icon-danger">🔓</div>
                        <div className="kpi-content">
                            <h3>Atendimentos Abertos</h3>
                            <span className="kpi-value">{formatNumber(getEstatisticaValue('atendimentos_abertos'))}</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon icon-success">✅</div>
                        <div className="kpi-content">
                            <h3>Concluídos Este Mês</h3>
                            <span className="kpi-value">{formatNumber(getEstatisticaValue('atendimentos_mes'))}</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon icon-warning">💰</div>
                        <div className="kpi-content">
                            <h3>Receita do Mês</h3>
                            <span className="kpi-value">{formatCurrency(getEstatisticaValue('receita_mes'))}</span>
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
                                                    <span className={`status status-${atendimento.status?.toLowerCase()}`}>
                                                        {atendimento.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`priority priority-${atendimento.prioridade?.toLowerCase()}`}>
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