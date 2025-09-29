import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Search,
    Plus,
    Filter,
    Eye,
    Edit,
    Trash2,
    FileText,
    Calendar,
    DollarSign,
    Building,
    User,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Send,
    Download,
    RefreshCw,
    Grid,
    List,
    X,
    Printer,
    Copy,
    BarChart3
} from 'lucide-react';
import { clientesAPI, empresasAPI, usuariosAPI, orcamentosAPI } from '../../utils/api';
import { useMessage } from '../../hooks/useMessage';
import Message from '../../components/Message';
import LoadingSpinner from '../../components/LoadingSpinner';
import FormularioOrcamento from './FormularioOrcamento';
import toast from 'react-hot-toast';
import ToggleSwitch from '../../components/ToggleSwitch';
import './Orcamentos.css';

// Componente do Modal de Visualização
const ViewModal = ({ orcamento, loading, onClose, handleEdit, getUsuarioNome, getEmpresaNome }) => {
    const [activeTab, setActiveTab] = useState('details');

    if (!orcamento) return null;

    // Funções de formatação
    const formatCurrency = (value) => {
        if (value === null || value === undefined || value === '') return '-';
        const num = Number(value);
        if (isNaN(num)) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        // Adicionado timeZone UTC para consistência
        return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };

    const formatStatus = (s) => {
        if (!s) return '-';
        const statusMap = {
            'rascunho': 'Rascunho',
            'enviado': 'Enviado',
            'aprovado': 'Aprovado',
            'reprovado': 'Reprovado',
            'cancelado': 'Cancelado'
        };
        return statusMap[s.toLowerCase()] || s.charAt(0).toUpperCase() + s.slice(1);
    };

    const getStatusIcon = (status) => {
        const s = String(status).toLowerCase();
        if (s.includes('rascunho')) return <Edit size={16} className="text-gray-500" />;
        if (s.includes('enviado')) return <Send size={16} className="text-blue-500" />;
        if (s.includes('aprovado')) return <CheckCircle size={16} className="text-green-500" />;
        if (s.includes('reprovado')) return <XCircle size={16} className="text-red-500" />;
        if (s.includes('cancelado')) return <AlertTriangle size={16} className="text-gray-500" />;
        return null;
    };

    const handlePrint = () => {
        const content = document.getElementById('modal-para-imprimir');
        if (!content || loading) {
            console.error('Conteúdo para impressão não está pronto.');
            return;
        }
        // Sua lógica de impressão...
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html><head><title>Orçamento #${orcamento.numero_orcamento}</title></head><body>${content.innerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content-refatorado" onClick={e => e.stopPropagation()}>
                <div id="modal-para-imprimir">
                    <div className="modal-header">
                        <div className="header-titulo">
                            <Eye size={24} />
                            <h2>Detalhes do Orçamento #{orcamento.numero_orcamento}</h2>
                        </div>
                        <button className="modal-close-btn" onClick={onClose}>&times;</button>
                    </div>

                    {/* Lógica de Carregamento */}
                    {loading ? (
                        <div className="modal-loading-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px', flexDirection: 'column', gap: '10px' }}>
                            <LoadingSpinner />
                            <p>Carregando detalhes completos...</p>
                        </div>
                    ) : (
                        <>
                            <div className="modal-tabs">
                                <button
                                    className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('details')}
                                >
                                    <Eye size={16} /> Detalhes
                                </button>
                                <button
                                    className={`tab-btn ${activeTab === 'itens' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('itens')}
                                >
                                    <FileText size={16} /> Itens
                                </button>
                                <button
                                    className={`tab-btn ${activeTab === 'anexos' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('anexos')}
                                >
                                    <FileText size={16} /> Anexos
                                </button>
                            </div>

                            <div className="modal-tab-content">
                                {activeTab === 'details' && (
                                    <div className="modal-body">
                                        <div className="info-coluna">
                                            {/* CORREÇÃO: Usar os nomes que já vêm no objeto */}
                                            <div className="info-grupo"><label><Building /> Empresa</label><span>{getEmpresaNome(orcamento.empresa_id)}</span></div>
                                            <div className="info-grupo"><label><User /> Cliente</label><span>{orcamento.cliente_nome || 'Desconhecido'}</span></div>
                                            <div className="info-grupo"><label><FileText /> Referência</label><span>{orcamento.referencia || '-'}</span></div>
                                            <div className="info-grupo"><label><User /> Responsável</label><span>{getUsuarioNome(orcamento.usuario_id)}</span></div>
                                        </div>
                                        <div className="info-coluna">
                                            <div className="info-grupo"><label><Calendar /> Data</label><span>{formatDate(orcamento.data_orcamento)}</span></div>
                                            <div className="info-grupo"><label><Calendar /> Validade</label><span>{formatDate(orcamento.validade_orcamento)}</span></div>
                                            <div className="info-grupo"><label><CheckCircle /> Status</label><span className={`badge status-${orcamento.status}`}>{getStatusIcon(orcamento.status)} {formatStatus(orcamento.status)}</span></div>
                                            <div className="info-grupo"><label><DollarSign /> Valor Total</label><span>{formatCurrency(orcamento.valor_total)}</span></div>
                                        </div>
                                        {orcamento.observacoes && (
                                            <div className="info-grupo full-width">
                                                <label><FileText /> Observações</label>
                                                <p>{orcamento.observacoes}</p>
                                            </div>
                                        )}
                                        <div className="modal-footer-info">
                                            <div className="info-data"><strong>Criado em:</strong><span>{formatDate(orcamento.criado_em)}</span></div>
                                            <div className="info-data"><strong>Prazo de Início:</strong><span>{formatDate(orcamento.prazo_inicio)}</span></div>
                                            <div className="info-data"><strong>Duração:</strong><span>{orcamento.prazo_duracao ? `${orcamento.prazo_duracao} dias` : '-'}</span></div>
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'itens' && (
                                    <div className="tab-itens">
                                        <div className="itens-section">
                                            <h3>Serviços</h3>
                                            {orcamento.servicos && orcamento.servicos.length > 0 ? (
                                                <table className="itens-table">
                                                    <thead><tr><th>Descrição</th><th>Qtde.</th><th>Vlr. Unit.</th><th>Vlr. Total</th></tr></thead>
                                                    <tbody>
                                                        {orcamento.servicos.map((servico) => (
                                                            <tr key={`servico-${servico.id}`}>
                                                                <td>{servico.descricao}</td>
                                                                <td>{servico.quantidade}</td>
                                                                <td>{formatCurrency(servico.valor_unitario)}</td>
                                                                <td>{formatCurrency(servico.valor_total)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p>Nenhum serviço cadastrado neste orçamento.</p>
                                            )}
                                        </div>
                                        <div className="itens-section">
                                            <h3>Materiais</h3>
                                            {orcamento.materiais && orcamento.materiais.length > 0 ? (
                                                <table className="itens-table">
                                                    <thead><tr><th>Descrição</th><th>Qtde.</th><th>Vlr. Unit.</th><th>Vlr. Total</th></tr></thead>
                                                    <tbody>
                                                        {orcamento.materiais.map((material) => (
                                                            <tr key={`material-${material.id}`}>
                                                                <td>{material.descricao}</td>
                                                                <td>{material.quantidade}</td>
                                                                <td>{formatCurrency(material.valor_unitario)}</td>
                                                                <td>{formatCurrency(material.valor_total)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p>Nenhum material cadastrado neste orçamento.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'anexos' && (
                                    <div className="tab-anexos"><p>Funcionalidade de anexos será implementada aqui.</p></div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
                    <button className="btn btn-outline" onClick={() => handleEdit(orcamento)} disabled={loading}><Edit size={16} /> Editar</button>
                    <button className="btn btn-primary" onClick={handlePrint} disabled={loading}><Printer size={16} /> Imprimir</button>
                </div>
            </div>
        </div>
    );
};

const OrcamentosRefatorado = () => {
    // Estados principais
    const [orcamentos, setOrcamentos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);
    const [loadingModal, setLoadingModal] = useState(false);

    // Estados de modais e dados
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [editingOrcamento, setEditingOrcamento] = useState(null);
    const [viewingOrcamento, setViewingOrcamento] = useState(null);

    // Estados de visualização e filtros
    const [viewMode, setViewMode] = useState('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('Aprovado');
    const [empresaFilter, setEmpresaFilter] = useState('');
    const [clienteFilter, setClienteFilter] = useState('');
    const [responsavelFilter, setResponsavelFilter] = useState('');
    const [showAll, setShowAll] = useState(false);
    const { message, showSuccess, showError } = useMessage();

    // Opções de status
    const statusOptions = [
        { value: 'Rascunho', label: 'Rascunho', icon: Edit },
        { value: 'Pendente', label: 'Pendente', icon: Clock },
        { value: 'Aguardando Aprovacao', label: 'Aguardando Aprovação', icon: Send },
        { value: 'Aprovado', label: 'Aprovado', icon: CheckCircle },
        { value: 'Rejeitado', label: 'Rejeitado', icon: XCircle },
        { value: 'Cancelado', label: 'Cancelado', icon: AlertTriangle }
    ];

    // Funções de formatação
    const formatCurrency = useCallback((value) => {
        if (value === null || value === undefined || value === '') return '-';
        const num = Number(value);
        if (isNaN(num)) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
    }, []);

    const formatDate = useCallback((dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('pt-BR');
    }, []);

    const formatStatus = useCallback((s) => {
        if (!s) return '-';
        const statusInfo = statusOptions.find(opt => opt.value === s.toLowerCase());
        return statusInfo ? statusInfo.label : s.charAt(0).toUpperCase() + s.slice(1);
    }, [statusOptions]);

    // Funções de busca de dados
    const getClienteNome = useCallback((id) => {
        const cliente = clientes.find(c => c.id === id);
        return cliente ? cliente.nome : 'Desconhecido';
    }, [clientes]);

    const getEmpresaNome = useCallback((id) => {
        const empresa = empresas.find(e => e.id === id);
        return empresa ? (empresa.nome_fantasia || empresa.nome || 'Desconhecida') : 'Desconhecida';
    }, [empresas]);

    const getUsuarioNome = useCallback((id) => {
        const usuario = usuarios.find(u => u.id === id);
        return usuario ? usuario.nome : 'Desconhecido';
    }, [usuarios]);

    // Carregamento de dados
    const fetchOrcamentos = useCallback(async (empresaId) => {
        setLoading(true);
        try {
            // Passa o empresaId para a API. Se for uma string vazia ou null, a API não enviará o header.
            const response = await orcamentosAPI.listar({ empresaId });

            if (response && response.success) {
                setOrcamentos(response.data || []);
            } else {
                setOrcamentos([]);
                // Não mostra erro se a lista estiver apenas vazia, só se a requisição falhar.
                if (!response.success) {
                    showError(response.message || 'Não foi possível carregar os orçamentos.');
                }
            }
        } catch (error) {
            showError(`Erro ao buscar orçamentos: ${error.message}`);
            setOrcamentos([]);
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        if (showAll) {
            setStatusFilter('');
        } else {
            setStatusFilter('Aprovado');
        }
    }, [showAll]);

    useEffect(() => {
        const fetchAuxData = async () => {
            try {
                const [clientesRes, empresasRes, usuariosRes] = await Promise.all([
                    clientesAPI.listar(),
                    empresasAPI.listar(),
                    usuariosAPI.listar()
                ]);

                console.log("📊 Clientes:", clientesRes);
                console.log("🏢 Empresas:", empresasRes);
                console.log("👤 Usuários:", usuariosRes);

                setClientes(clientesRes.data || []);
                setEmpresas((empresasRes.data || []).map(e => ({
                    ...e,
                    nome_fantasia: e.nome_fantasia || e.nome || ''
                })));
                setUsuarios(usuariosRes.data || []);
            } catch (error) {
                showError(`Erro ao carregar dados de suporte: ${error.message}`);
            }
        };

        fetchAuxData();
        fetchOrcamentos('');
        setInitialLoad(false);
    }, [fetchOrcamentos, showError]);

    useEffect(() => {
        if (!initialLoad) {
            fetchOrcamentos(empresaFilter);
        }
    }, [empresaFilter, initialLoad, fetchOrcamentos]);

    // Manipuladores de eventos
    const handleCreate = () => {
        setEditingOrcamento(null);
        setShowModal(true);
    };

    const handleEdit = async (orcamentoDaLista) => {
        const toastId = toast.loading('Carregando dados para edição...');

        try {
            const response = await orcamentosAPI.buscar(orcamentoDaLista.id);

            if (response && response.success) {
                setEditingOrcamento(response.data);

                setShowModal(true);

                toast.dismiss(toastId);
            } else {
                toast.error("Falha ao carregar dados do orçamento para edição.");
                toast.dismiss(toastId);
            }
        } catch (error) {
            toast.error(`Erro: ${error.message}`);
            toast.dismiss(toastId);
        }
    };

    const handleView = async (orcamentoDaLista) => {
        setLoadingModal(true);
        setShowViewModal(true);
        setViewingOrcamento(orcamentoDaLista);

        try {
            // Busca os detalhes completos do orçamento
            const response = await orcamentosAPI.buscar(orcamentoDaLista.id);

            if (response && response.success) {
                console.log("Detalhes completos do orçamento carregados:", response.data);
                setViewingOrcamento(response.data);
            } else {
                showError("Não foi possível carregar os detalhes do orçamento.");
                setShowViewModal(false);
            }
        } catch (error) {
            showError(`Erro ao buscar detalhes: ${error.message}`);
            setShowViewModal(false);
        } finally {
            setLoadingModal(false);
        }
    };

    const handleDelete = async (orcamento) => {
        if (window.confirm(`Tem certeza que deseja excluir o orçamento #${orcamento.numero_orcamento}?`)) {
            try {
                await orcamentosAPI.excluir(orcamento.id, orcamento.empresa_id);
                showSuccess('Orçamento excluído com sucesso!');
                fetchOrcamentos();
            } catch (error) {
                showError(`Erro ao excluir orçamento: ${error.message}`);
            }
        }
    };

    const handleSave = async (orcamentoData) => {
        try {
            console.log("📦 handleSave recebeu:", orcamentoData);

            if (editingOrcamento) {
                await orcamentosAPI.atualizar(editingOrcamento.id, orcamentoData);
                showSuccess('Orçamento atualizado com sucesso!');
            } else {
                await orcamentosAPI.criar(orcamentoData);
                showSuccess('Orçamento criado com sucesso!');
            }

            setShowModal(false);
            setEditingOrcamento(null);
            fetchOrcamentos();
        } catch (error) {
            showError(`Erro ao salvar orçamento: ${error.message}`);
        }
    };

    const handleCancel = () => {
        setShowModal(false);
        setEditingOrcamento(null);
    };

    const handleDuplicate = (orcamento) => {
        const newOrcamento = { ...orcamento };
        delete newOrcamento.id;
        delete newOrcamento.numero_orcamento;
        setEditingOrcamento(newOrcamento);
        setShowModal(true);
    };

    // Filtros e Paginação
    const filteredData = useMemo(() => {
        return orcamentos.filter(o => {
            const searchTermLower = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm ||
                o.numero_orcamento.toString().includes(searchTermLower) ||
                (o.referencia && o.referencia.toLowerCase().includes(searchTermLower)) ||
                getClienteNome(o.cliente_id).toLowerCase().includes(searchTermLower);

            const matchesStatus = !statusFilter || o.status === statusFilter;
            const matchesEmpresa = !empresaFilter || o.empresa_id.toString() === empresaFilter;
            const matchesCliente = !clienteFilter || o.cliente_id.toString() === clienteFilter;
            const matchesResponsavel = !responsavelFilter || o.usuario_id.toString() === responsavelFilter;

            return matchesSearch && matchesStatus && matchesEmpresa && matchesCliente && matchesResponsavel;
        });
    }, [orcamentos, searchTerm, statusFilter, empresaFilter, clienteFilter, responsavelFilter, getClienteNome]);

    const totalPages = Math.ceil(filteredData.length / recordsPerPage);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        return filteredData.slice(startIndex, endIndex);
    }, [filteredData, currentPage, recordsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, empresaFilter, clienteFilter, responsavelFilter, recordsPerPage]);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Ícones para status
    const getStatusIcon = (status) => {
        const statusInfo = statusOptions.find(opt => opt.value === status?.toLowerCase());
        if (statusInfo) {
            return React.createElement(statusInfo.icon, { size: 16, className: getStatusColorClass(status) });
        }
        return null;
    };

    const getStatusColorClass = (status) => {
        const s = String(status).toLowerCase();
        if (s.includes('rascunho')) return 'text-gray-500';
        if (s.includes('enviado')) return 'text-blue-500';
        if (s.includes('aprovado')) return 'text-green-500';
        if (s.includes('reprovado')) return 'text-red-500';
        if (s.includes('cancelado')) return 'text-gray-500';
        return 'text-gray-500';
    };

    if (loading && initialLoad) {
        return <LoadingSpinner />;
    }

    return (
        <div className="atendimentos-refatorado">
            {/* Header */}
            <div className="atendimentos-header">
                <div className="header-left">
                    <h1>Gerenciamento de Orçamentos</h1>
                    <div className="header-stats">
                        <div className="stat">
                            <BarChart3 size={16} />
                            <span>{filteredData.length} orçamentos</span>
                        </div>
                        <div className="stat">
                            <DollarSign size={16} />
                            <span>{formatCurrency(filteredData.reduce((acc, orc) => acc + (parseFloat(orc.valor_total) || 0), 0))}</span>
                        </div>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={() => fetchOrcamentos(empresaFilter)}>
                        <RefreshCw size={16} />
                        Atualizar
                    </button>
                    <button className="btn btn-primary" onClick={handleCreate}>
                        <Plus size={16} />
                        Novo Orçamento
                    </button>
                </div>
            </div>

            <Message message={message} />

            {/* Controles */}
            <div className="controls-section">
                <div className="controls-left">
                    {/* Busca */}
                    <div className="search-container">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar orçamentos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        {searchTerm && (
                            <button
                                className="clear-search"
                                onClick={() => setSearchTerm('')}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filtros rápidos */}
                    <div className="quick-filters">
                        <select
                            value={empresaFilter}
                            onChange={(e) => setEmpresaFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">Todas as Empresas</option>
                            {empresas.map(empresa => (
                                <option key={empresa.id} value={empresa.id}>
                                    {empresa.nome_fantasia || empresa.nome}
                                </option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="filter-select"
                            disabled={showAll}
                        >
                            <option value="">Todos os Status</option>
                            {statusOptions.map(status => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={clienteFilter}
                            onChange={(e) => setClienteFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">Todos os Clientes</option>
                            {clientes.map(cliente => (
                                <option key={cliente.id} value={cliente.id}>
                                    {cliente.nome}
                                </option>
                            ))}
                        </select>

                        <select
                            value={responsavelFilter}
                            onChange={(e) => setResponsavelFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">Todos os Responsáveis</option>
                            {usuarios.map(usuario => (
                                <option key={usuario.id} value={usuario.id}>
                                    {usuario.nome}
                                </option>
                            ))}
                        </select>

                        <div className="filter-checkbox">
                            <ToggleSwitch
                                id="showAllStatus"
                                checked={showAll}
                                onChange={(e) => setShowAll(e.target.checked)}
                                label="Ver Todos os Status"
                            />
                        </div>

                    </div>
                </div>

                <div className="controls-right">
                    {/* Seletor de visualização */}
                    <div className="view-selector">
                        <button
                            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="Visualização em Lista"
                        >
                            <List size={16} />
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Visualização em Grade"
                        >
                            <Grid size={16} />
                        </button>
                    </div>

                    {/* Controles de paginação */}
                    <div className="pagination-controls">
                        <select
                            value={recordsPerPage}
                            onChange={(e) => setRecordsPerPage(parseInt(e.target.value, 10))}
                            className="records-select"
                        >
                            <option value={10}>10 por página</option>
                            <option value={25}>25 por página</option>
                            <option value={50}>50 por página</option>
                            <option value={100}>100 por página</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Conteúdo principal */}
            <div className="content-section">
                {paginatedData.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>Nenhum orçamento encontrado</h3>
                        <p>
                            {orcamentos.length === 0
                                ? 'Não há orçamentos cadastrados.'
                                : 'Tente ajustar os filtros de busca.'
                            }
                        </p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'list' && (
                            <div className="table-container">
                                <table className="atendimentos-table">
                                    <thead>
                                        <tr>
                                            <th>NÚMERO</th>
                                            <th>EMPRESA</th>
                                            <th>CLIENTE</th>
                                            <th>REFERÊNCIA</th>
                                            <th>DATA</th>
                                            <th>VALOR TOTAL</th>
                                            <th>STATUS</th>
                                            <th>AÇÕES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.map((orcamento) => (
                                            <tr key={orcamento.id} className="table-row">
                                                <td className="id-cell">#{orcamento.numero_orcamento}</td>
                                                <td>{getEmpresaNome(orcamento.empresa_id)}</td>
                                                <td>{orcamento.cliente_nome || 'Desconhecido'}</td>
                                                <td>{orcamento.referencia || '-'}</td>
                                                <td>{formatDate(orcamento.data_orcamento)}</td>
                                                <td>{formatCurrency(orcamento.valor_total)}</td>
                                                <td>
                                                    <div className="status-cell">
                                                        {getStatusIcon(orcamento.status)}
                                                        <span>{formatStatus(orcamento.status)}</span>
                                                    </div>
                                                </td>
                                                <td className="actions-cell">
                                                    <button
                                                        className="action-btn view"
                                                        onClick={() => handleView(orcamento)}
                                                        title="Visualizar"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn edit"
                                                        onClick={() => handleEdit(orcamento)}
                                                        title="Editar"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn anexos"
                                                        onClick={() => handleDuplicate(orcamento)}
                                                        title="Duplicar"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => handleDelete(orcamento)}
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {viewMode === 'grid' && (
                            <div className="grid-container">
                                {paginatedData.map((orcamento) => (
                                    <div key={orcamento.id} className="atendimento-card">
                                        <div className="card-header">
                                            <div className="card-numero">#{orcamento.numero_orcamento}</div>
                                            <div className="card-status">
                                                {getStatusIcon(orcamento.status)}
                                                <span>{formatStatus(orcamento.status)}</span>
                                            </div>
                                        </div>
                                        <div className="card-content">
                                            <div className="card-empresa">
                                                <Building size={16} />
                                                <span>{getEmpresaNome(orcamento.empresa_id)}</span>
                                            </div>
                                            <div className="card-cliente">
                                                <User size={16} />
                                                <span>{getClienteNome(orcamento.cliente_id)}</span>
                                            </div>
                                            <div className="card-referencia">
                                                <strong>Ref:</strong> {orcamento.referencia || '-'}
                                            </div>
                                            <div className="card-meta">
                                                <div className="meta-item">
                                                    <Calendar size={14} />
                                                    <span>{formatDate(orcamento.data_orcamento)}</span>
                                                </div>
                                                <div className="meta-item">
                                                    <DollarSign size={14} />
                                                    <span>{formatCurrency(orcamento.valor_total)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="card-actions">
                                            <button
                                                className="action-btn view"
                                                onClick={() => handleView(orcamento)}
                                                title="Visualizar"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className="action-btn edit"
                                                onClick={() => handleEdit(orcamento)}
                                                title="Editar"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="action-btn anexos"
                                                onClick={() => handleDuplicate(orcamento)}
                                                title="Duplicar"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button
                                                className="action-btn delete"
                                                onClick={() => handleDelete(orcamento)}
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Paginação */}
                        <div className="pagination-container">
                            <div className="pagination-info">
                                Mostrando {((currentPage - 1) * recordsPerPage) + 1} a {Math.min(currentPage * recordsPerPage, filteredData.length)} de {filteredData.length} orçamentos
                            </div>
                            <div className="pagination-controls">
                                <button
                                    className="pagination-btn"
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    Anterior
                                </button>
                                <span>Página {currentPage} de {totalPages}</span>
                                <button
                                    className="pagination-btn"
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modal de Formulário */}
            {showModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCancel()}>
                    <div className="modal-content-large">
                        <FormularioOrcamento
                            orcamento={editingOrcamento}
                            empresas={empresas}
                            clientes={clientes}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                    </div>
                </div>
            )}

            {/* Modal de Visualização */}
            {showViewModal && (
                <ViewModal
                    orcamento={viewingOrcamento}
                    loading={loadingModal}
                    onClose={() => setShowViewModal(false)}
                    handleEdit={handleEdit}
                    getEmpresaNome={getEmpresaNome}
                    getUsuarioNome={getUsuarioNome}
                />
            )}
        </div>
    );
};

export default OrcamentosRefatorado;


