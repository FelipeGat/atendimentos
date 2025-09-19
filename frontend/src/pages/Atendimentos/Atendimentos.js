import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    Plus,
    Filter,
    Eye,
    Edit,
    Trash2,
    MessageSquare,
    Paperclip,
    Clock,
    AlertTriangle,
    CheckCircle,
    XCircle,
    User,
    Calendar,
    BarChart3,
    Download,
    RefreshCw,
    Grid,
    List,
    SortAsc,
    SortDesc,
    X
} from 'lucide-react';
import { atendimentosAPI, clientesAPI, assuntosAPI, usuariosAPI, equipamentosAPI, empresasAPI } from '../../utils/api';
import { useMessage } from '../../hooks/useMessage';
import { useTableControls } from '../../hooks/useTableControls';
import Message from '../../components/Message';
import LoadingSpinner from '../../components/LoadingSpinner';
import Andamentos from './Andamentos';
import Anexos from './Anexos';
import './Atendimentos.css';

const AtendimentosRefatorado = () => {
    // Estados principais
    const [atendimentos, setAtendimentos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [assuntos, setAssuntos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [equipamentos, setEquipamentos] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados de modais
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showAndamentosModal, setShowAndamentosModal] = useState(false);
    const [showAnexosModal, setShowAnexosModal] = useState(false);
    const [showFiltersModal, setShowFiltersModal] = useState(false);

    // Estados de dados
    const [editingAtendimento, setEditingAtendimento] = useState(null);
    const [viewingAtendimento, setViewingAtendimento] = useState(null);

    // Estados de visualização
    const [viewMode, setViewMode] = useState('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Estados de filtros
    const [statusFilter, setStatusFilter] = useState('');
    const [prioridadeFilter, setPrioridadeFilter] = useState('');
    const [responsavelFilter, setResponsavelFilter] = useState('');
    const [empresaFilter, setEmpresaFilter] = useState(''); // NOVO ESTADO DE FILTRO

    const [searchTermCliente, setSearchTermCliente] = useState("");
    const [clienteSelecionado, setClienteSelecionado] = useState(null);

    const [formData, setFormData] = useState({
        cliente_id: '',
        assunto_id: '',
        equipamento_id: '',
        atendente_id: '',
        descricao: '',
        prioridade: 'media',
        status: 'aberto',
        tempo_estimado: '',
        valor_servico: '',
        observacoes: '',
        solucao: '',
        solicitante: '',
        telefone_solicitante: '',
        empresa_id: '',
        tipo_atendimento: 'Avulso',
        numero_orcamento: '',
        custos_atendimento: ''
    });

    const { message, showSuccess, showError } = useMessage();

    // Carregar dados iniciais
    const fetchData = async () => {
        try {
            setLoading(true);
            const [
                atendimentosResult,
                clientesResult,
                assuntosResult,
                usuariosResult,
                equipamentosResult,
                empresasResult
            ] = await Promise.all([
                atendimentosAPI.listar(),
                clientesAPI.listar(),
                assuntosAPI.listar(),
                usuariosAPI.listar(),
                equipamentosAPI.listar(),
                empresasAPI.listar()
            ]);

            console.log('=== DADOS CARREGADOS ===');
            console.log('Atendimentos:', atendimentosResult);
            console.log('Clientes:', clientesResult);
            console.log('Assuntos:', assuntosResult);
            console.log('Usuários:', usuariosResult);
            console.log('Equipamentos:', equipamentosResult);
            console.log('Empresas:', empresasResult);

            const atendimentosData = atendimentosResult.data || [];
            console.log('=== ATENDIMENTOS PROCESSADOS ===');
            console.log('Total de atendimentos:', atendimentosData.length);
            console.log('Primeiro atendimento:', atendimentosData[0]);

            setAtendimentos(atendimentosData);
            setClientes(clientesResult.data || []);
            setAssuntos(assuntosResult.data || []);
            setUsuarios(usuariosResult.data || []);
            setEquipamentos(equipamentosResult.data || []);
            setEmpresas(empresasResult.data || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            showError('Erro ao carregar dados: ' + (error?.message || error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Efeito para calcular custos_atendimento automaticamente
    useEffect(() => {
        if (formData.tipo_atendimento === 'Avulso' && formData.tempo_estimado && formData.empresa_id) {
            const empresaSelecionada = empresas.find(emp => String(emp.id) === String(formData.empresa_id));
            if (empresaSelecionada && empresaSelecionada.custo_operacional_dia) {
                const custoPorDia = parseFloat(empresaSelecionada.custo_operacional_dia);
                const tempoEstimadoDias = parseInt(formData.tempo_estimado, 10);
                if (!isNaN(custoPorDia) && !isNaN(tempoEstimadoDias)) {
                    const custoTotal = custoPorDia * tempoEstimadoDias;
                    setFormData(prev => ({ ...prev, custos_atendimento: custoTotal.toFixed(2) }));
                } else {
                    setFormData(prev => ({ ...prev, custos_atendimento: '' }));
                }
            } else {
                setFormData(prev => ({ ...prev, custos_atendimento: '' }));
            }
        } else {
            setFormData(prev => ({ ...prev, custos_atendimento: '' }));
        }
    }, [formData.tipo_atendimento, formData.tempo_estimado, formData.empresa_id, empresas]);

    // Filtros aplicados
    const filteredData = useMemo(() => {
        console.log('=== APLICANDO FILTROS ===');
        console.log('Atendimentos originais:', atendimentos.length);
        console.log('Termo de busca:', searchTerm);
        console.log('Filtro status:', statusFilter);
        console.log('Filtro prioridade:', prioridadeFilter);
        console.log('Filtro responsavel:', responsavelFilter);
        console.log('Filtro empresa:', empresaFilter);

        let filtered = [...atendimentos];

        // Função auxiliar para padronizar o status
        const getStandardStatus = (s) => {
            const key = String(s || '').toLowerCase();
            if (key.includes('abert')) return 'aberto';
            if (key.includes('and') || key.includes('atend')) return 'em_andamento';
            if (key.includes('aguard')) return 'aguardando_cliente';
            if (key.includes('concl') || key.includes('resolv')) return 'concluido';
            if (key.includes('cancel')) return 'cancelado';
            return key;
        };

        // Função auxiliar para padronizar a prioridade
        const getStandardPrioridade = (p) => {
            const key = String(p || '').toLowerCase();
            if (key.includes('baix')) return 'baixa';
            if (key.includes('med')) return 'media';
            if (key.includes('alt')) return 'alta';
            if (key.includes('urg') || key.includes('crit')) return 'urgente';
            return key;
        };

        // Filtro de busca
        if (searchTerm) {
            filtered = filtered.filter(atendimento => {
                const clienteNome = getClienteNome(atendimento.cliente_id).toLowerCase();
                const assuntoNome = getAssuntoNome(atendimento.assunto_id).toLowerCase();
                const descricao = (atendimento.descricao || '').toLowerCase();
                const searchLower = searchTerm.toLowerCase();

                return clienteNome.includes(searchLower) ||
                    assuntoNome.includes(searchLower) ||
                    descricao.includes(searchLower) ||
                    String(atendimento.id).includes(searchLower);
            });
        }

        // NOVO FILTRO: Empresa
        if (empresaFilter) {
            filtered = filtered.filter(atendimento => String(atendimento.empresa_id) === empresaFilter);
        }

        // Filtro de status
        if (statusFilter) {
            filtered = filtered.filter(atendimento => getStandardStatus(atendimento.status) === statusFilter);
        }

        // Filtro de prioridade
        if (prioridadeFilter) {
            filtered = filtered.filter(atendimento => getStandardPrioridade(atendimento.prioridade) === prioridadeFilter);
        }

        // NOVO FILTRO: Responsável
        if (responsavelFilter) {
            filtered = filtered.filter(atendimento => String(atendimento.atendente_id) === responsavelFilter);
        }

        // ORDENAÇÃO: por Prioridade e data de criação
        const priorityOrder = { 'urgente': 1, 'critica': 1, 'alta': 2, 'media': 3, 'baixa': 4 };
        filtered.sort((a, b) => {
            const priorityA = getStandardPrioridade(a.prioridade);
            const priorityB = getStandardPrioridade(b.prioridade);
            const orderA = priorityOrder[priorityA] || 5;
            const orderB = priorityOrder[priorityB] || 5;

            // Se as prioridades forem diferentes, ordena por prioridade
            if (orderA !== orderB) {
                return orderA - orderB;
            }

            // Se as prioridades forem iguais, ordena pela data de criação (mais antigo primeiro)
            const dateA = new Date(a.criado_em);
            const dateB = new Date(b.criado_em);
            return dateA.getTime() - dateB.getTime();
        });

        console.log('Atendimentos filtrados:', filtered.length);
        console.log('Dados filtrados:', filtered);

        return filtered;
    }, [atendimentos, searchTerm, statusFilter, prioridadeFilter, responsavelFilter, empresaFilter]);

    // Paginação
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * recordsPerPage;
        const paginated = filteredData.slice(startIndex, startIndex + recordsPerPage);

        console.log('=== PAGINAÇÃO ===');
        console.log('Página atual:', currentPage);
        console.log('Registros por página:', recordsPerPage);
        console.log('Índice inicial:', startIndex);
        console.log('Dados paginados:', paginated.length);
        console.log('Primeiro item paginado:', paginated[0]);

        return paginated;
    }, [filteredData, currentPage, recordsPerPage]);

    const totalPages = Math.ceil(filteredData.length / recordsPerPage)
    const handleCreate = () => {
        setEditingAtendimento(null);
        setFormData({
            cliente_id: "",
            assunto_id: "",
            equipamento_id: "",
            atendente_id: "",
            descricao: "",
            prioridade: "media",
            status: "aberto",
            tempo_estimado: "",
            valor_servico: "",
            observacoes: "",
            solucao: "",
            empresa_id: "",
            tipo_atendimento: "Avulso",
            numero_orcamento: "",
            custos_atendimento: ""
        });
        setSearchTermCliente("");
        setClienteSelecionado(null);
        setShowModal(true);
    }; const handleEdit = (atendimento) => {
        setEditingAtendimento(atendimento);
        setFormData({
            cliente_id: atendimento.cliente_id ?? '',
            assunto_id: atendimento.assunto_id ?? '',
            equipamento_id: atendimento.equipamento_id ?? '',
            atendente_id: atendimento.atendente_id ?? '',
            descricao: atendimento.descricao ?? '',
            prioridade: atendimento.prioridade ? String(atendimento.prioridade).toLowerCase() : 'media',
            status: atendimento.status ? String(atendimento.status).toLowerCase() : 'aberto',
            tempo_estimado: atendimento.tempo_estimado ?? "",
            valor_servico: atendimento.valor_servico ?? "",
            observacoes: atendimento.observacoes ?? "",
            solucao: atendimento.solucao ?? "",
            solicitante: atendimento.solicitante ?? "",
            telefone_solicitante: atendimento.telefone_solicitante ?? "",
            empresa_id: atendimento.empresa_id ?? "",
            tipo_atendimento: atendimento.tipo_atendimento ?? 'Avulso',
            numero_orcamento: atendimento.numero_orcamento ?? "",
            custos_atendimento: atendimento.custos_atendimento ?? ""
        });

        const clienteExistente = clientes.find(c => String(c.id) === String(atendimento.cliente_id));
        if (clienteExistente) {
            setSearchTermCliente(clienteExistente.nome);
            setClienteSelecionado(clienteExistente);
        } else {
            setSearchTermCliente("");
            setClienteSelecionado(null);
        }
        setShowModal(true);
    };

    const handleView = (atendimento) => {
        setViewingAtendimento(atendimento);
        setShowViewModal(true);
    };

    const handleDelete = async (atendimento) => {
        if (!window.confirm(`Tem certeza que deseja excluir o atendimento #${atendimento.id}?`)) return;
        try {
            await atendimentosAPI.excluir(atendimento.id);
            showSuccess('Atendimento excluído com sucesso');
            await fetchData();
        } catch (error) {
            showError('Erro ao excluir atendimento: ' + (error?.message || error));
        }
    };

    // Validação e salvamento
    const validateForm = () => {
        if (!formData.cliente_id) {
            showError('Cliente é obrigatório');
            return false;
        }
        if (!formData.assunto_id) {
            showError('Assunto é obrigatório');
            return false;
        }
        if (!formData.descricao || !formData.descricao.trim()) {
            showError('Descrição é obrigatória');
            return false;
        }
        return true;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const payload = {
                cliente_id: parseInt(formData.cliente_id, 10),
                assunto_id: parseInt(formData.assunto_id, 10),
                equipamento_id: formData.equipamento_id ? parseInt(formData.equipamento_id, 10) : null,
                atendente_id: formData.atendente_id ? parseInt(formData.atendente_id, 10) : null,
                solicitante: formData.solicitante ? formData.solicitante.trim() : null,
                telefone_solicitante: formData.telefone_solicitante ? formData.telefone_solicitante.trim() : null,
                descricao: formData.descricao.trim(),
                prioridade: formData.prioridade,
                status: formData.status,
                tempo_estimado: formData.tempo_estimado ? parseInt(formData.tempo_estimado, 10) : null,
                valor_servico: formData.valor_servico ? parseFloat(formData.valor_servico) : null,
                observacoes: formData.observacoes ? formData.observacoes.trim() : null,
                solucao: formData.solucao ? formData.solucao.trim() : null,
                empresa_id: parseInt(formData.empresa_id, 10),
                tipo_atendimento: formData.tipo_atendimento,
                numero_orcamento: formData.numero_orcamento ? formData.numero_orcamento.trim() : null,
                custos_atendimento: formData.custos_atendimento ? parseFloat(formData.custos_atendimento) : null
            };

            if (editingAtendimento) {
                await atendimentosAPI.atualizar(editingAtendimento.id, payload);
                showSuccess('Atendimento atualizado com sucesso');
            } else {
                await atendimentosAPI.criar(payload);
                showSuccess('Atendimento criado com sucesso');
            }

            setShowModal(false);
            await fetchData();
        } catch (error) {
            showError('Erro ao salvar atendimento: ' + (error?.message || error));
        }
    };

    // Funções auxiliares
    const getClienteNome = (clienteId) => {
        if (!clienteId) return '-';
        const c = clientes.find(x => String(x.id) === String(clienteId));
        return c ? c.nome : `Cliente #${clienteId}`;
    };

    const getAssuntoNome = (assuntoId) => {
        if (!assuntoId) return '-';
        const a = assuntos.find(x => String(x.id) === String(assuntoId));
        return a ? a.nome : `Assunto #${assuntoId}`;
    };

    const getUsuarioNome = (usuarioId) => {
        if (!usuarioId) return '-';
        const u = usuarios.find(x => String(x.id) === String(usuarioId));
        return u ? u.nome : `Usuário #${usuarioId}`;
    }; const getEquipamentoNome = (equipamentoId) => {
        if (!equipamentoId) return "-";
        const e = equipamentos.find(x => String(x.id) === String(equipamentoId));
        return e ? e.nome : `Equipamento #${equipamentoId}`;
    };

    const getEmpresaNome = (empresaId) => {
        if (!empresaId) return "-";
        const emp = empresas.find(x => String(x.id) === String(empresaId));
        return emp ? emp.nome : `Empresa #${empresaId}`;
    };

    const getEquipamentosByCliente = (clienteId) => {
        if (!clienteId) return [];
        return equipamentos.filter(e => String(e.cliente_id) === String(clienteId) && (e.ativo === undefined || e.ativo));
    };

    const formatPrioridade = (p) => {
        if (!p) return '-';
        const key = String(p).toLowerCase();
        if (key.includes('baix')) return 'Baixa';
        if (key.includes('med')) return 'Média';
        if (key.includes('alt')) return 'Alta';
        if (key.includes('urg') || key.includes('crit')) return 'Crítica';
        return p.charAt(0).toUpperCase() + p.slice(1);
    };

    const formatStatus = (s) => {
        if (!s) return '-';
        const key = String(s).toLowerCase();
        if (key.includes('abert')) return 'Aberto';
        if (key.includes('and') || key.includes('atend')) return 'Em Atendimento';
        if (key.includes('aguard')) return 'Aguardando Cliente';
        if (key.includes('concl') || key.includes('resolv')) return 'Resolvido';
        if (key.includes('cancel')) return 'Cancelado';
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

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
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const getPriorityIcon = (prioridade) => {
        const key = String(prioridade || '').toLowerCase();
        if (key.includes('baix')) return <CheckCircle className="priority-icon low" />;
        if (key.includes('med')) return <Clock className="priority-icon medium" />;
        if (key.includes('alt')) return <AlertTriangle className="priority-icon high" />;
        if (key.includes('urg') || key.includes('crit')) return <XCircle className="priority-icon critical" />;
        return <Clock className="priority-icon medium" />;
    };

    const getStatusIcon = (status) => {
        const key = String(status || '').toLowerCase();
        if (key.includes('abert')) return <Clock className="status-icon open" />;
        if (key.includes('and') || key.includes('atend')) return <RefreshCw className="status-icon progress" />;
        if (key.includes('aguard')) return <User className="status-icon waiting" />;
        if (key.includes('concl') || key.includes('resolv')) return <CheckCircle className="status-icon resolved" />;
        if (key.includes('cancel')) return <XCircle className="status-icon cancelled" />;
        return <Clock className="status-icon open" />;
    };

    if (loading) return <LoadingSpinner message="Carregando atendimentos..." />;

    return (
        <div className="atendimentos-refatorado">
            {/* Header */}
            <div className="atendimentos-header">
                <div className="header-left">
                    <h1>Gerenciamento de Atendimentos</h1>
                    <div className="header-stats">
                        <span className="stat">
                            <BarChart3 size={16} />
                            {filteredData.length} atendimento{filteredData.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={() => fetchData()}>
                        <RefreshCw size={16} />
                        Atualizar
                    </button>
                    <button className="btn btn-primary" onClick={handleCreate}>
                        <Plus size={16} />
                        Novo Atendimento
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
                            placeholder="Buscar atendimentos..."
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
                                    {empresa.nome}
                                </option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">Todos os Status</option>
                            <option value="aberto">Aberto</option>
                            <option value="em_andamento">Em Atendimento</option>
                            <option value="aguardando_cliente">Aguardando Cliente</option>
                            <option value="concluido">Resolvido</option>
                            <option value="cancelado">Cancelado</option>
                        </select>

                        <select
                            value={prioridadeFilter}
                            onChange={(e) => setPrioridadeFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">Todas as Prioridades</option>
                            <option value="baixa">Baixa</option>
                            <option value="media">Média</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Crítica</option>
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
                        <h3>Nenhum atendimento encontrado</h3>
                        <p>
                            {atendimentos.length === 0
                                ? 'Não há atendimentos cadastrados.'
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
                                            <th>ID</th>
                                            <th>Empresa Grupo</th>
                                            <th>Cliente</th>
                                            <th>Assunto</th>
                                            <th>Prioridade</th>
                                            <th>Status</th>
                                            <th>Responsável</th>
                                            <th>Criado em</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.map((atendimento) => {
                                            console.log('Renderizando atendimento:', atendimento);
                                            return (
                                                <tr key={atendimento.id} className="table-row">
                                                    <td className="id-cell">#{atendimento.id}</td>
                                                    <td>{getEmpresaNome(atendimento.empresa_id)}</td>
                                                    <td>{getClienteNome(atendimento.cliente_id)}</td>
                                                    <td>{getAssuntoNome(atendimento.assunto_id)}</td>
                                                    <td>
                                                        <div className="priority-cell">
                                                            {getPriorityIcon(atendimento.prioridade)}
                                                            <span>{formatPrioridade(atendimento.prioridade)}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="status-cell">
                                                            {getStatusIcon(atendimento.status)}
                                                            <span>{formatStatus(atendimento.status)}</span>
                                                        </div>
                                                    </td>
                                                    <td>{getUsuarioNome(atendimento.atendente_id)}</td>
                                                    <td>{formatDate(atendimento.criado_em)}</td>
                                                    <td>
                                                        <div className="actions-cell">
                                                            <button className="action-btn view" onClick={() => handleView(atendimento)} title="Visualizar">
                                                                <Eye size={14} />
                                                            </button>
                                                            <button className="action-btn edit" onClick={() => handleEdit(atendimento)} title="Editar">
                                                                <Edit size={14} />
                                                            </button>
                                                            <button className="action-btn andamentos" onClick={() => {
                                                                setViewingAtendimento(atendimento);
                                                                setShowAndamentosModal(true);
                                                            }} title="Andamentos">
                                                                <MessageSquare size={14} />
                                                            </button>
                                                            <button className="action-btn anexos" onClick={() => {
                                                                setViewingAtendimento(atendimento);
                                                                setShowAnexosModal(true);
                                                            }} title="Anexos">
                                                                <Paperclip size={14} />
                                                            </button>
                                                            <button className="action-btn delete" onClick={() => handleDelete(atendimento)} title="Excluir">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {viewMode === 'grid' && (
                            <div className="grid-container">
                                {paginatedData.map((atendimento) => (
                                    <div key={atendimento.id} className="atendimento-card">
                                        <div className="card-header">
                                            <div className="card-id">#{atendimento.id}</div>
                                            <div className="card-date">{formatDate(atendimento.criado_em)}</div>
                                        </div>

                                        <div className="card-content">
                                            <h3 className="card-title">{getAssuntoNome(atendimento.assunto_id)}</h3>
                                            <p className="card-client">{getClienteNome(atendimento.cliente_id)}</p>

                                            <div className="card-badges">
                                                <div className="priority-badge">
                                                    {getPriorityIcon(atendimento.prioridade)}
                                                    <span>{formatPrioridade(atendimento.prioridade)}</span>
                                                </div>
                                                <div className="status-badge">
                                                    {getStatusIcon(atendimento.status)}
                                                    <span>{formatStatus(atendimento.status)}</span>
                                                </div>
                                            </div>

                                            <div className="card-description">
                                                {atendimento.descricao && atendimento.descricao.length > 100
                                                    ? atendimento.descricao.substring(0, 100) + '...'
                                                    : atendimento.descricao
                                                }
                                            </div>

                                            {atendimento.atendente_id && (
                                                <div className="card-responsible">
                                                    <User size={14} />
                                                    <span>{getUsuarioNome(atendimento.atendente_id)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="card-actions">
                                            <button className="action-btn view" onClick={() => handleView(atendimento)} title="Visualizar">
                                                <Eye size={14} />
                                            </button>
                                            <button className="action-btn edit" onClick={() => handleEdit(atendimento)} title="Editar">
                                                <Edit size={14} />
                                            </button>
                                            <button className="action-btn andamentos" onClick={() => {
                                                setViewingAtendimento(atendimento);
                                                setShowAndamentosModal(true);
                                            }} title="Andamentos">
                                                <MessageSquare size={14} />
                                            </button>
                                            <button className="action-btn anexos" onClick={() => {
                                                setViewingAtendimento(atendimento);
                                                setShowAnexosModal(true);
                                            }} title="Anexos">
                                                <Paperclip size={14} />
                                            </button>
                                            <button className="action-btn delete" onClick={() => handleDelete(atendimento)} title="Excluir">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
                <div className="pagination">
                    <div className="pagination-info">
                        Mostrando {((currentPage - 1) * recordsPerPage) + 1} a {Math.min(currentPage * recordsPerPage, filteredData.length)} de {filteredData.length} registros
                    </div>

                    <div className="pagination-controls">
                        <button
                            className="pagination-btn"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                        >
                            Anterior
                        </button>

                        <span className="pagination-current">
                            Página {currentPage} de {totalPages}
                        </span>

                        <button
                            className="pagination-btn"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Formulário */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingAtendimento ? 'Editar Atendimento' : 'Novo Atendimento'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="modal-form">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="empresa_id">Empresa Grupo *</label>
                                    <select
                                        id="empresa_id"
                                        value={formData.empresa_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, empresa_id: e.target.value }))}
                                        required
                                    >
                                        <option value="">Selecione uma empresa</option>
                                        {empresas.map(empresa => (
                                            <option key={empresa.id} value={empresa.id}>
                                                {empresa.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="cliente_search">Buscar Cliente *</label>
                                    <input
                                        type="text"
                                        id="cliente_search"
                                        value={searchTermCliente}
                                        onChange={(e) => {
                                            setSearchTermCliente(e.target.value);
                                            setClienteSelecionado(null);
                                            setFormData(prev => ({ ...prev, cliente_id: '', equipamento_id: '' }));
                                        }}
                                        placeholder="Digite CNPJ, Nome Fantasia ou Razão Social"
                                    />
                                    {searchTermCliente && clientes.filter(c =>
                                        c.cpf_cnpj?.includes(searchTermCliente) ||
                                        c.nome?.toLowerCase().includes(searchTermCliente.toLowerCase()) ||
                                        c.razao_social?.toLowerCase().includes(searchTermCliente.toLowerCase())
                                    ).length > 0 && (
                                            <ul className="search-results">
                                                {clientes.filter(c =>
                                                    c.cpf_cnpj?.includes(searchTermCliente) ||
                                                    c.nome?.toLowerCase().includes(searchTermCliente.toLowerCase()) ||
                                                    c.razao_social?.toLowerCase().includes(searchTermCliente.toLowerCase())
                                                ).map(cliente => (
                                                    <li key={cliente.id} onClick={() => {
                                                        setClienteSelecionado(cliente);
                                                        setFormData(prev => ({ ...prev, cliente_id: cliente.id }));
                                                        setSearchTermCliente(cliente.nome);
                                                    }}>
                                                        {cliente.nome} ({cliente.cpf_cnpj})
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    {!clienteSelecionado && searchTermCliente && clientes.filter(c =>
                                        c.cpf_cnpj?.includes(searchTermCliente) ||
                                        c.nome?.toLowerCase().includes(searchTermCliente.toLowerCase()) ||
                                        c.razao_social?.toLowerCase().includes(searchTermCliente.toLowerCase())
                                    ).length === 0 && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                Cliente não encontrado. <a href="#" onClick={() => alert('Direcionar para tela de cadastro de clientes')}>Cadastrar novo cliente</a>
                                            </p>
                                        )}
                                </div>

                                {clienteSelecionado && (
                                    <div className="form-group">
                                        <label htmlFor="cliente_id">Cliente Selecionado</label>
                                        <input
                                            type="text"
                                            id="cliente_id_display"
                                            value={`${clienteSelecionado.nome} (${clienteSelecionado.cpf_cnpj})`}
                                            readOnly
                                            className="bg-gray-100"
                                        />
                                        <input type="hidden" id="cliente_id" value={formData.cliente_id} />
                                    </div>
                                )}


                                <div className="form-group">
                                    <label htmlFor="assunto_id">Assunto *</label>
                                    <select
                                        id="assunto_id"
                                        value={formData.assunto_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, assunto_id: e.target.value }))}
                                        required
                                    >
                                        <option value="">Selecione um assunto</option>
                                        {assuntos.map(assunto => (
                                            <option key={assunto.id} value={assunto.id}>
                                                {assunto.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="tipo_atendimento">Tipo de Atendimento *</label>
                                    <select
                                        id="tipo_atendimento"
                                        value={formData.tipo_atendimento}
                                        onChange={(e) => setFormData(prev => ({ ...prev, tipo_atendimento: e.target.value }))}
                                        required
                                    >
                                        <option value="Contrato">Contrato</option>
                                        <option value="Avulso">Avulso</option>
                                    </select>
                                </div>

                                {formData.tipo_atendimento === 'Avulso' && (
                                    <div className="form-group">
                                        <label htmlFor="numero_orcamento">Nº do Orçamento</label>
                                        <input
                                            type="text"
                                            id="numero_orcamento"
                                            value={formData.numero_orcamento}
                                            onChange={(e) => setFormData(prev => ({ ...prev, numero_orcamento: e.target.value }))}
                                            placeholder="Número do Orçamento"
                                        />
                                    </div>
                                )}

                                {formData.tipo_atendimento === 'Avulso' && (
                                    <div className="form-group">
                                        <label htmlFor="custos_atendimento">Custos do Atendimento</label>
                                        <input
                                            type="number"
                                            id="custos_atendimento"
                                            value={formData.custos_atendimento}
                                            readOnly
                                            placeholder="Calculado automaticamente"
                                        />
                                    </div>
                                )}


                                <div className="form-group">
                                    <label htmlFor="solicitante">Solicitante</label>
                                    <input
                                        type="text"
                                        id="solicitante"
                                        value={formData.solicitante}
                                        onChange={(e) => setFormData(prev => ({ ...prev, solicitante: e.target.value }))}
                                        placeholder="Nome do solicitante"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="telefone_solicitante">Telefone do Solicitante</label>
                                    <input
                                        type="text"
                                        id="telefone_solicitante"
                                        value={formData.telefone_solicitante}
                                        onChange={(e) => setFormData(prev => ({ ...prev, telefone_solicitante: e.target.value }))}
                                        placeholder="Telefone do solicitante"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="equipamento_id">Equipamento</label>
                                    <select
                                        id="equipamento_id"
                                        value={formData.equipamento_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, equipamento_id: e.target.value }))}
                                        disabled={!formData.cliente_id}
                                    >
                                        <option value="">Selecione um equipamento</option>
                                        {getEquipamentosByCliente(formData.cliente_id).map(equipamento => (
                                            <option key={equipamento.id} value={equipamento.id}>
                                                {equipamento.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="atendente_id">Responsável</label>
                                    <select
                                        id="atendente_id"
                                        value={formData.atendente_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, atendente_id: e.target.value }))}
                                    >
                                        <option value="">Selecione um responsável</option>
                                        {usuarios.map(usuario => (
                                            <option key={usuario.id} value={usuario.id}>
                                                {usuario.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="prioridade">Prioridade</label>
                                    <select
                                        id="prioridade"
                                        value={formData.prioridade}
                                        onChange={(e) => setFormData(prev => ({ ...prev, prioridade: e.target.value }))}
                                    >
                                        <option value="baixa">Baixa</option>
                                        <option value="media">Média</option>
                                        <option value="alta">Alta</option>
                                        <option value="urgente">Crítica</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="status">Status</label>
                                    <select
                                        id="status"
                                        value={formData.status}
                                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                    >
                                        <option value="aberto">Aberto</option>
                                        <option value="em_andamento">Em Atendimento</option>
                                        <option value="aguardando_cliente">Aguardando Cliente</option>
                                        <option value="concluido">Resolvido</option>
                                        <option value="cancelado">Cancelado</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="tempo_estimado">Tempo Estimado (dias)</label>
                                    <input
                                        type="number"
                                        id="tempo_estimado"
                                        value={formData.tempo_estimado}
                                        onChange={(e) => setFormData(prev => ({ ...prev, tempo_estimado: e.target.value }))}
                                        placeholder="Tempo estimado em dias"
                                        min="0"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="valor_servico">Valor do Serviço</label>
                                    <input
                                        type="number"
                                        id="valor_servico"
                                        value={formData.valor_servico}
                                        onChange={(e) => setFormData(prev => ({ ...prev, valor_servico: e.target.value }))}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="descricao">Descrição *</label>
                                <textarea
                                    id="descricao"
                                    value={formData.descricao}
                                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="observacoes">Observações</label>
                                <textarea
                                    id="observacoes"
                                    value={formData.observacoes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                                    rows={3}
                                />
                            </div>

                            {editingAtendimento && (
                                <div className="form-group full-width">
                                    <label htmlFor="solucao">Solução</label>
                                    <textarea
                                        id="solucao"
                                        value={formData.solucao}
                                        onChange={(e) => setFormData(prev => ({ ...prev, solucao: e.target.value }))}
                                        rows={3}
                                    />
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingAtendimento ? 'Atualizar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Visualização */}
            {showViewModal && viewingAtendimento && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Atendimento #{viewingAtendimento.id}</h2>
                            <button className="modal-close" onClick={() => setShowViewModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="view-content">
                            <div className="view-grid">
                                <div className="view-group">
                                    <label>Cliente:</label>
                                    <span>{getClienteNome(viewingAtendimento.cliente_id)}</span>
                                </div>

                                <div className="view-group">
                                    <label>Assunto:</label>
                                    <span>{getAssuntoNome(viewingAtendimento.assunto_id)}</span>
                                </div>

                                <div className="view-group">
                                    <label>Equipamento:</label>
                                    <span>{getEquipamentoNome(viewingAtendimento.equipamento_id)}</span>
                                </div>

                                <div className="view-group">
                                    <label>Responsável:</label>
                                    <span>{getUsuarioNome(viewingAtendimento.atendente_id)}</span>
                                </div>

                                <div className="view-group">
                                    <label>Prioridade:</label>
                                    <div className="priority-display">
                                        {getPriorityIcon(viewingAtendimento.prioridade)}
                                        <span>{formatPrioridade(viewingAtendimento.prioridade)}</span>
                                    </div>
                                </div>

                                <div className="view-group">
                                    <label>Status:</label>
                                    <div className="status-display">
                                        {getStatusIcon(viewingAtendimento.status)}
                                        <span>{formatStatus(viewingAtendimento.status)}</span>
                                    </div>
                                </div>

                                <div className="view-group">
                                    <label>Tempo Estimado:</label>
                                    <span>{viewingAtendimento.tempo_estimado ? `${viewingAtendimento.tempo_estimado} min` : '-'}</span>
                                </div>

                                <div className="view-group">
                                    <label>Valor do Serviço:</label>
                                    <span>{formatCurrency(viewingAtendimento.valor_servico)}</span>
                                </div>

                                <div className="view-group">
                                    <label>Criado em:</label>
                                    <span>{formatDate(viewingAtendimento.criado_em)}</span>
                                </div>

                                <div className="view-group">
                                    <label>Atualizado em:</label>
                                    <span>{formatDate(viewingAtendimento.atualizado_em)}</span>
                                </div>
                            </div>

                            <div className="view-group full-width">
                                <label>Descrição:</label>
                                <p>{viewingAtendimento.descricao || '-'}</p>
                            </div>

                            {viewingAtendimento.observacoes && (
                                <div className="view-group full-width">
                                    <label>Observações:</label>
                                    <p>{viewingAtendimento.observacoes}</p>
                                </div>
                            )}

                            {viewingAtendimento.solucao && (
                                <div className="view-group full-width">
                                    <label>Solução:</label>
                                    <p>{viewingAtendimento.solucao}</p>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                                Fechar
                            </button>
                            <button type="button" className="btn btn-primary" onClick={() => {
                                setShowViewModal(false);
                                handleEdit(viewingAtendimento);
                            }}>
                                Editar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modais de Andamentos e Anexos */}
            {showAndamentosModal && viewingAtendimento && (
                <div className="modal-overlay" onClick={() => setShowAndamentosModal(false)}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Andamentos - Atendimento #{viewingAtendimento.id}</h2>
                            <button className="modal-close" onClick={() => setShowAndamentosModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <Andamentos atendimentoId={viewingAtendimento.id} />
                    </div>
                </div>
            )}

            {showAnexosModal && viewingAtendimento && (
                <div className="modal-overlay" onClick={() => setShowAnexosModal(false)}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Anexos - Atendimento #{viewingAtendimento.id}</h2>
                            <button className="modal-close" onClick={() => setShowAnexosModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <Anexos atendimentoId={viewingAtendimento.id} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AtendimentosRefatorado;