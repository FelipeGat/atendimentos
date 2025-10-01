import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    X,
    Printer
} from 'lucide-react';
import { atendimentosAPI, clientesAPI, assuntosAPI, usuariosAPI, equipamentosAPI, empresasAPI } from '../../utils/api';
import { useMessage } from '../../hooks/useMessage';
// import { useTableControls } from '../../hooks/useTableControls'; // Removido, pois não estava sendo usado
import Message from '../../components/Message';
import LoadingSpinner from '../../components/LoadingSpinner';
import Andamentos from './Andamentos';
import Anexos from './Anexos';
import './Atendimentos.css';

// Componente do Modal de Visualização
const ViewModal = ({ atendimento, onClose, handleEdit, getClienteNome, getAssuntoNome, getEquipamentoNome, getUsuarioNome, getEmpresaNome }) => {
    const [activeTab, setActiveTab] = useState('details');
    if (!atendimento) return null;

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

    const handlePrint = () => {
        const content = document.getElementById('modal-para-imprimir');
        if (!content) {
            console.error('Elemento para impressão não encontrado.');
            return;
        }

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Atendimento #${atendimento.id}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .modal-content-refatorado { border: 1px solid #ccc; padding: 20px; border-radius: 8px; }
                        h2 { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
                        .info-coluna { display: flex; flex-direction: column; margin-bottom: 15px; }
                        .info-grupo { margin-bottom: 10px; }
                        .info-grupo label { font-weight: bold; margin-right: 5px; }
                        .info-grupo span { color: #555; }
                        .badge { padding: 4px 8px; border-radius: 4px; color: white; }
                        .prioridade-baixa { background-color: #4CAF50; }
                        .prioridade-media { background-color: #FFC107; }
                        .prioridade-alta { background-color: #FF5722; }
                        .prioridade-urgente { background-color: #F44336; }
                        .status-aberto { background-color: #607D8B; }
                        .status-em_andamento { background-color: #2196F3; }
                        .status-concluido { background-color: #4CAF50; }
                        .status-aguardando_cliente { background-color: #FF9800; }
                        .status-cancelado { background-color: #F44336; }
                        @media print {
                            .modal-actions { display: none; }
                        }
                    </style>
                </head>
                <body>
                    ${content.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content-refatorado" id="modal-para-imprimir" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-titulo">
                        <Eye size={24} />
                        <h2>Detalhes do Atendimento #{atendimento.id}</h2>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        <Eye size={16} /> Detalhes
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'andamentos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('andamentos')}
                    >
                        <MessageSquare size={16} /> Andamentos
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'anexos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('anexos')}
                    >
                        <Paperclip size={16} /> Anexos
                    </button>
                </div>

                <div className="modal-tab-content">
                    {activeTab === 'details' && (
                        <div className="modal-body">
                            <div className="info-coluna">
                                <div className="info-grupo"><label><User /> Cliente</label><span>{getClienteNome(atendimento.cliente_id)}</span></div>
                                <div className="info-grupo"><label><i className="fas fa-building"></i> Empresa</label><span>{getEmpresaNome(atendimento.empresa_id)}</span></div>
                                <div className="info-grupo"><label><i className="fas fa-clipboard-list"></i> Assunto</label><span>{getAssuntoNome(atendimento.assunto_id)}</span></div>
                                <div className="info-grupo"><label><i className="fas fa-desktop"></i> Equipamento</label><span>{getEquipamentoNome(atendimento.equipamento_id)}</span></div>
                            </div>
                            <div className="info-coluna">
                                <div className="info-grupo"><label><User /> Responsável</label><span>{getUsuarioNome(atendimento.atendente_id)}</span></div>
                                <div className="info-grupo"><label><AlertTriangle /> Prioridade</label><span className={`badge prioridade-${atendimento.prioridade}`}>{formatPrioridade(atendimento.prioridade)}</span></div>
                                <div className="info-grupo"><label><CheckCircle /> Status</label><span className={`badge status-${atendimento.status}`}>{formatStatus(atendimento.status)}</span></div>
                                <div className="info-grupo"><label><Clock /> Tempo Estimado</label><span>{atendimento.tempo_estimado ? `${atendimento.tempo_estimado} dias` : '-'}</span></div>
                            </div>
                            <div className="info-grupo full-width">
                                <label><i className="fas fa-comment-alt"></i> Descrição</label>
                                <p>{atendimento.descricao}</p>
                            </div>
                            {atendimento.solucao && (
                                <div className="info-grupo full-width">
                                    <label><i className="fas fa-check"></i> Solução</label>
                                    <p>{atendimento.solucao}</p>
                                </div>
                            )}
                            <div className="modal-footer-info">
                                <div className="info-data"><strong>Criado em:</strong><span>{formatDate(atendimento.criado_em)}</span></div>
                                <div className="info-data"><strong>Valor:</strong><span>{formatCurrency(atendimento.valor_servico)}</span></div>
                                <div className="info-data"><strong>Custos:</strong><span>{formatCurrency(atendimento.custos_atendimento)}</span></div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'andamentos' && (
                        <div className="tab-andamentos">
                            <Andamentos atendimentoId={atendimento.id} />
                        </div>
                    )}
                    {activeTab === 'anexos' && (
                        <div className="tab-anexos">
                            <Anexos atendimentoId={atendimento.id} />
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
                    <button className="btn btn-outline" onClick={() => handleEdit(atendimento)}><Edit size={16} /> Editar</button>
                    <button className="btn btn-primary" onClick={handlePrint}><Printer size={16} /> Imprimir</button>
                </div>
            </div>
        </div>
    );
};

const AtendimentosRefatorado = () => {
    // Estados principais
    const [atendimentos, setAtendimentos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [assuntos, setAssuntos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [equipamentos, setEquipamentos] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);

    // Estados de modais e dados
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [editingAtendimento, setEditingAtendimento] = useState(null);
    const [viewingAtendimento, setViewingAtendimento] = useState(null);
    const [showAndamentosModal, setShowAndamentosModal] = useState(false); // Novo estado para modal de Andamentos
    const [showAnexosModal, setShowAnexosModal] = useState(false); // Novo estado para modal de Anexos

    // Estados de visualização e filtros
    const [viewMode, setViewMode] = useState('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [prioridadeFilter, setPrioridadeFilter] = useState('');
    const [responsavelFilter, setResponsavelFilter] = useState('');
    const [empresaFilter, setEmpresaFilter] = useState('');
    const [mostrarResolvidos, setMostrarResolvidos] = useState(false);

    // Estados do formulário
    const [searchTermCliente, setSearchTermCliente] = useState("");
    const [clienteSelecionado, setClienteSelecionado] = useState(null);
    const [formData, setFormData] = useState({
        cliente_id: '', assunto_id: '', equipamento_id: '', atendente_id: '',
        descricao: '', prioridade: 'Baixa', status: 'aberto', tempo_estimado: '',
        valor_servico: '', observacoes: '', solucao: '', solicitante: '',
        telefone_solicitante: '', empresa_id: '', tipo_atendimento: 'Avulso',
        numero_orcamento: '', custos_atendimento: ''
    });

    const { message, showSuccess, showError } = useMessage();

    // Funções de formatação (movidas para fora do componente principal ou para um util)
    const formatPrioridade = useCallback((p) => {
        if (!p) return '-';
        const key = String(p).toLowerCase();
        if (key.includes('baix')) return 'Baixa';
        if (key.includes('med')) return 'Média';
        if (key.includes('alt')) return 'Alta';
        if (key.includes('urg') || key.includes('crit')) return 'Crítica';
        return p.charAt(0).toUpperCase() + p.slice(1);
    }, []);

    const formatStatus = useCallback((s) => {
        if (!s) return '-';
        const key = String(s).toLowerCase();
        if (key.includes('abert')) return 'Aberto';
        if (key.includes('and') || key.includes('atend')) return 'Em Atendimento';
        if (key.includes('aguard')) return 'Aguardando Cliente';
        if (key.includes('concl') || key.includes('resolv')) return 'Resolvido';
        if (key.includes('cancel')) return 'Cancelado';
        return s.charAt(0).toUpperCase() + s.slice(1);
    }, []);

    const formatDate = useCallback((dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }, []);

    const formatCurrency = useCallback((value) => {
        if (value === null || value === undefined || value === '') return '-';
        const num = Number(value);
        if (isNaN(num)) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
    }, []);

    // Funções para obter nomes por ID
    const getClienteNome = useCallback((id) => {
        const cliente = clientes.find(c => c.id === id);
        return cliente ? cliente.nome : 'Desconhecido';
    }, [clientes]);

    const getAssuntoNome = useCallback((id) => {
        if (id === null || id === undefined) return 'Desconhecido';
        const assunto = assuntos.find(a => Number(a.id) === Number(id));

        return assunto ? assunto.nome : 'Desconhecido';
    }, [assuntos]);

    const getUsuarioNome = useCallback((id) => {
        const usuario = usuarios.find(u => u.id === id);
        return usuario ? usuario.nome : 'Desconhecido';
    }, [usuarios]);

    const getEquipamentoNome = useCallback((id) => {
        const equipamento = equipamentos.find(e => e.id === id);
        return equipamento ? equipamento.nome : 'Desconhecido';
    }, [equipamentos]);

    const getEmpresaNome = useCallback((id) => {
        if (!id) return 'Desconhecido';
        const empresa = empresas.find(e => e.id === id);
        return empresa ? empresa.nome : `Empresa ID ${id} (não encontrada)`;
    }, [empresas]);

    // Carregar dados iniciais (empresas e depois o resto)
    const fetchInitialData = async () => {
        try {
            setLoading(true);
            console.log('=== CARREGANDO EMPRESAS ===');
            const empresasResult = await empresasAPI.listar();
            const empresasData = empresasResult.data || [];
            console.log('Empresas carregadas:', empresasData);
            setEmpresas(empresasData);

            if (empresasData.length > 0) {
                setEmpresaFilter('');
                await fetchDataForEmpresa(null);
            } else {
                console.log('ERRO: Nenhuma empresa encontrada');
                showError("Nenhuma empresa encontrada. Cadastre uma empresa primeiro.");
                setLoading(false);
            }
            setInitialLoad(false);
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            showError('Erro fatal ao carregar empresas: ' + (error?.message || error));
            setLoading(false);
        }
    };

    // Carrega todos os dados relacionados a uma empresa específica
    const fetchDataForEmpresa = async (empresaId) => {
        setLoading(true);
        try {
            const [
                atendimentosResult,
                clientesResult,
                assuntosResult,
                usuariosResult,
                equipamentosResult
            ] = await Promise.all([
                atendimentosAPI.listar(),
                clientesAPI.listar(),
                assuntosAPI.listar(),
                usuariosAPI.listar(),
                equipamentosAPI.listar()
            ]);

            const atendimentosData = atendimentosResult.data || [];
            setAtendimentos(atendimentosData);
            setClientes(clientesResult.data || []);
            setAssuntos(assuntosResult.data || []);
            setUsuarios(usuariosResult.data || []);
            setEquipamentos(equipamentosResult.data || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            showError('Erro ao carregar dados: ' + (error?.message || error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
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

    // Handlers
    const handleCreate = () => {
        console.log('=== ABRINDO MODAL CRIAR ===');
        console.log('Empresas disponíveis no momento:', empresas);
        console.log('Quantidade de empresas:', empresas.length);

        let idEmpresaInicial = '';
        if (empresas.length === 1) {
            idEmpresaInicial = empresas[0].id;
        }

        setEditingAtendimento(null);
        setFormData({
            cliente_id: '',
            assunto_id: '',
            equipamento_id: '',
            atendente_id: '',
            descricao: '',
            prioridade: 'Baixa',
            status: 'aberto',
            tempo_estimado: '',
            valor_servico: '',
            observacoes: '',
            solucao: '',
            solicitante: '',
            telefone_solicitante: '',
            empresa_id: idEmpresaInicial,
            tipo_atendimento: 'Avulso',
            numero_orcamento: '',
            custos_atendimento: ''
        });
        setSearchTermCliente("");
        setClienteSelecionado(null);
        setShowModal(true);
    };

    const handleEdit = (atendimento) => {
        setEditingAtendimento(atendimento);
        setFormData({
            cliente_id: atendimento.cliente_id ?? '',
            assunto_id: atendimento.assunto_id ?? '',
            equipamento_id: atendimento.equipamento_id ?? '',
            atendente_id: atendimento.atendente_id ?? '',
            descricao: atendimento.descricao ?? '',
            prioridade: atendimento.prioridade ?? 'Baixa',
            status: atendimento.status ?? 'aberto',
            tempo_estimado: atendimento.tempo_estimado ?? '',
            valor_servico: atendimento.valor_servico ?? '',
            observacoes: atendimento.observacoes ?? '',
            solucao: atendimento.solucao ?? '',
            solicitante: atendimento.solicitante ?? '',
            telefone_solicitante: atendimento.telefone_solicitante ?? '',
            empresa_id: atendimento.empresa_id ?? '',
            tipo_atendimento: atendimento.tipo_atendimento ?? 'Avulso',
            numero_orcamento: atendimento.numero_orcamento ?? '',
            custos_atendimento: atendimento.custos_atendimento ?? ''
        });
        const cliente = clientes.find(c => c.id === atendimento.cliente_id);
        setClienteSelecionado(cliente || null);
        setSearchTermCliente(cliente ? cliente.nome : "");
        setShowModal(true);
    };

    const handleView = (atendimento) => {
        setViewingAtendimento(atendimento);
        setShowViewModal(true);
    };

    const handleDelete = async (atendimento) => {
        if (window.confirm(`Tem certeza que deseja excluir o atendimento #${atendimento.id}?`)) {
            try {
                await atendimentosAPI.excluir(atendimento.id, atendimento.empresa_id);
                showSuccess('Atendimento excluído com sucesso!');
                await fetchDataForEmpresa(empresaFilter || null);
            } catch (error) {
                console.error('Erro ao excluir atendimento:', error);
                const errorMessage = error?.message || 'Ocorreu um erro desconhecido';
                showError(`Erro ao excluir atendimento: ${errorMessage}`);
            }
        }
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        console.log('=== DEBUG SUBMIT ===');
        console.log('FormData completo:', formData);
        console.log('Cliente selecionado:', clienteSelecionado);

        // 1. Validação do ID da empresa (essencial)
        const empresaIdNumerico = Number(formData.empresa_id);
        if (!empresaIdNumerico || empresaIdNumerico <= 0) {
            console.error('ERRO: ID da empresa inválido ou não fornecido.', formData.empresa_id);
            showError('Por favor, selecione uma empresa válida antes de continuar.');
            return;
        }

        // 2. Validação do cliente (essencial)
        if (!clienteSelecionado && !formData.cliente_id) {
            showError('Por favor, selecione um cliente antes de continuar.');
            return;
        }

        try {
            // 3. Montagem e LIMPEZA FINAL dos dados para envio
            const dataToSubmit = {
                ...formData,
                cliente_id: clienteSelecionado ? clienteSelecionado.id : formData.cliente_id,
                empresa_id: empresaIdNumerico,

                // --- INÍCIO DA CORREÇÃO DEFINITIVA ---
                // Garante que campos numéricos sejam enviados como números (ou 0/null conforme a necessidade do PHP).
                // O seu PHP espera um 'd' (double) para custos, então enviar 0 é mais seguro que null.

                // Campos que podem ser nulos (opcionais)
                atendente_id: formData.atendente_id ? Number(formData.atendente_id) : null,
                equipamento_id: formData.equipamento_id ? Number(formData.equipamento_id) : null,

                // Campos numéricos que não podem ser nulos no bind_param ('d' ou 'i')
                // Enviar 0 em vez de null é a prática mais segura aqui.
                valor_servico: formData.valor_servico ? parseFloat(formData.valor_servico) : 0,
                custos_atendimento: formData.custos_atendimento ? parseFloat(formData.custos_atendimento) : 0,
                tempo_estimado: formData.tempo_estimado ? parseInt(formData.tempo_estimado, 10) : 0,
                // --- FIM DA CORREÇÃO DEFINITIVA ---
            };

            console.log('Dados que serão enviados (APÓS LIMPEZA FINAL):', dataToSubmit);

            // 4. Lógica de API
            if (editingAtendimento) {
                await atendimentosAPI.atualizar(editingAtendimento.id, dataToSubmit);
                showSuccess('Atendimento atualizado com sucesso!');
            } else {
                await atendimentosAPI.criar(dataToSubmit);
                showSuccess('Atendimento criado com sucesso!');
            }

            setShowModal(false);
            fetchDataForEmpresa(empresaFilter || null);
        } catch (error) {
            console.error('Erro ao salvar atendimento:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Ocorreu um erro desconhecido';
            showError(`Erro ao salvar atendimento: ${errorMessage}`);
        }
    };

    // Filtro de clientes para busca
    const filteredClientes = useMemo(() => {
        if (!searchTermCliente) return [];
        return clientes.filter(cliente =>
            cliente.nome.toLowerCase().includes(searchTermCliente.toLowerCase())
        );
    }, [clientes, searchTermCliente]);

    const filteredData = useMemo(() => {
        let data = atendimentos;

        if (!mostrarResolvidos) {
            data = data.filter(item => item.status !== 'concluido' && item.status !== 'resolvido');
        }

        if (searchTerm) {
            data = data.filter(item =>
                item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.solicitante.toLowerCase().includes(searchTerm.toLowerCase()) ||
                getClienteNome(item.cliente_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
                getAssuntoNome(item.assunto_id).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter) {
            data = data.filter(item => item.status === statusFilter);
        }

        if (prioridadeFilter) {
            data = data.filter(item => item.prioridade === prioridadeFilter);
        }

        if (responsavelFilter) {
            data = data.filter(item => String(item.atendente_id) === String(responsavelFilter));
        }

        if (empresaFilter && empresaFilter !== '') {
            data = data.filter(item => item.empresa_id === Number(empresaFilter));
        }

        // 2. Ordenação customizada
        const priorityOrder = {
            'Urgente': 1, // ou 'Crítica' se o valor for esse
            'Alta': 2,
            'Média': 3,
            'Baixa': 4
        };

        data.sort((a, b) => {
            const priorityA = priorityOrder[a.prioridade] || 99;
            const priorityB = priorityOrder[b.prioridade] || 99;

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            return new Date(a.criado_em) - new Date(b.criado_em);
        });

        return data;
    }, [atendimentos, mostrarResolvidos, searchTerm, statusFilter, prioridadeFilter, responsavelFilter, empresaFilter, getClienteNome, getAssuntoNome]);

    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        return filteredData.slice(startIndex, endIndex);
    }, [filteredData, currentPage, recordsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, prioridadeFilter, responsavelFilter, recordsPerPage, empresaFilter]);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Ícones para prioridade e status
    const getPriorityIcon = (prioridade) => {
        const p = String(prioridade).toLowerCase();
        if (p.includes('baix')) return <CheckCircle size={16} className="text-green-500" />;
        if (p.includes('med')) return <AlertTriangle size={16} className="text-yellow-500" />;
        if (p.includes('alt')) return <AlertTriangle size={16} className="text-orange-500" />;
        if (p.includes('urg') || p.includes('crit')) return <XCircle size={16} className="text-red-500" />;
        return null;
    };

    const getStatusIcon = (status) => {
        const s = String(status).toLowerCase();
        if (s.includes('abert')) return <Clock size={16} className="text-blue-500" />;
        if (s.includes('and') || s.includes('atend')) return <RefreshCw size={16} className="text-indigo-500" />;
        if (s.includes('aguard')) return <User size={16} className="text-purple-500" />;
        if (s.includes('concl') || s.includes('resolv')) return <CheckCircle size={16} className="text-green-500" />;
        if (s.includes('cancel')) return <XCircle size={16} className="text-gray-500" />;
        return null;
    };

    if (loading && initialLoad) {
        return <LoadingSpinner />;
    }

    return (
        <div className="atendimentos-refatorado">
            {/* Header */}
            <div className="atendimentos-header">
                <div className="header-left">
                    <h1>Gerenciamento de Atendimentos</h1>
                    <div className="header-stats">
                        <div className="stat">
                            <BarChart3 size={16} />
                            <span>{filteredData.length} atendimentos</span>
                        </div>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary">
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
                            <option value="Baixa">Baixa</option>
                            <option value="Média">Média</option>
                            <option value="Alta">Alta</option>
                            <option value="Urgente">Urgente</option>
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

                        <div className="filter-checkbox-container">
                            <input
                                type="checkbox"
                                id="mostrar-resolvidos"
                                checked={mostrarResolvidos}
                                onChange={(e) => setMostrarResolvidos(e.target.checked)}
                            />
                            <label htmlFor="mostrar-resolvidos">Mostrar Resolvidos</label>
                        </div>
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
                                            <th>EMPRESA GRUPO</th>
                                            <th>CLIENTE</th>
                                            <th>ASSUNTO</th>
                                            <th>PRIORIDADE</th>
                                            <th>STATUS</th>
                                            <th>RESPONSÁVEL</th>
                                            <th>CRIADO EM</th>
                                            <th>AÇÕES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.map((atendimento) => (
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
                                        ))}
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

                                            <p className="card-description">
                                                {atendimento.descricao.length > 100
                                                    ? `${atendimento.descricao.substring(0, 100)}...`
                                                    : atendimento.descricao
                                                }
                                            </p>

                                            <div className="card-responsible">
                                                <User size={14} />
                                                <span>{getUsuarioNome(atendimento.atendente_id)}</span>
                                            </div>
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

                        {/* Paginação */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <div className="pagination-info">
                                    Mostrando {((currentPage - 1) * recordsPerPage) + 1} a {Math.min(currentPage * recordsPerPage, filteredData.length)} de {filteredData.length} registros
                                </div>
                                <div className="pagination-controls">
                                    <button
                                        className="pagination-btn"
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        Anterior
                                    </button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                                        return (
                                            <button
                                                key={page}
                                                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                                                onClick={() => goToPage(page)}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                    <button
                                        className="pagination-btn"
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        Próximo
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal de Criação/Edição */}
            {
                showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <form onSubmit={handleSubmit} className="modal-form">
                                {/* Header do Modal */}
                                <div className="modal-header">
                                    <h2>{editingAtendimento ? 'Editar Atendimento' : 'Novo Atendimento'}</h2>
                                    <button type="button" className="modal-close" onClick={() => setShowModal(false)}>
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Corpo do Modal */}
                                <div className="modal-body-refatorado">
                                    <fieldset className="form-section">
                                        <legend>Informações Básicas</legend>
                                        <div className="form-grid-2-col">
                                            <div className="form-group">
                                                <label htmlFor="empresa_id">Empresa</label>
                                                <select
                                                    id="empresa_id"
                                                    value={formData.empresa_id}
                                                    onChange={handleInputChange}
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
                                                <label htmlFor="cliente_id">Cliente</label>
                                                <input
                                                    type="text"
                                                    value={searchTermCliente}
                                                    onChange={(e) => {
                                                        setSearchTermCliente(e.target.value);
                                                        setClienteSelecionado(null);
                                                    }}
                                                    placeholder="Digite o nome do cliente"
                                                    required
                                                />
                                                {searchTermCliente && filteredClientes.length > 0 && (
                                                    <ul className="search-results">
                                                        {filteredClientes.map(cliente => (
                                                            <li
                                                                key={cliente.id}
                                                                onClick={() => {
                                                                    setClienteSelecionado(cliente);
                                                                    setSearchTermCliente(cliente.nome);
                                                                }}
                                                            >
                                                                {cliente.nome}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="assunto_id">Assunto</label>
                                                <select
                                                    id="assunto_id"
                                                    value={formData.assunto_id}
                                                    onChange={handleInputChange}
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
                                                <label htmlFor="equipamento_id">Equipamento</label>
                                                <select
                                                    id="equipamento_id"
                                                    value={formData.equipamento_id}
                                                    onChange={handleInputChange}
                                                >
                                                    <option value="">Selecione um equipamento</option>
                                                    {equipamentos.map(equipamento => (
                                                        <option key={equipamento.id} value={equipamento.id}>
                                                            {equipamento.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-group full-width">
                                            <label htmlFor="descricao">Descrição do Problema</label>
                                            <textarea
                                                id="descricao"
                                                value={formData.descricao}
                                                onChange={handleInputChange}
                                                rows={4}
                                                required
                                            />
                                        </div>
                                    </fieldset>

                                    <fieldset className="form-section">
                                        <legend>Dados do Solicitante</legend>
                                        <div className="form-grid-2-col">
                                            <div className="form-group">
                                                <label htmlFor="solicitante">Nome do Solicitante</label>
                                                <input
                                                    type="text"
                                                    id="solicitante"
                                                    value={formData.solicitante}
                                                    onChange={handleInputChange}
                                                    placeholder="Nome do solicitante"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="telefone_solicitante">Telefone do Solicitante</label>
                                                <input
                                                    type="text"
                                                    id="telefone_solicitante"
                                                    value={formData.telefone_solicitante}
                                                    onChange={handleInputChange}
                                                    placeholder="(XX) XXXXX-XXXX"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group full-width">
                                            <label htmlFor="observacoes">Observações</label>
                                            <textarea
                                                id="observacoes"
                                                value={formData.observacoes}
                                                onChange={handleInputChange}
                                                rows={3}
                                            />
                                        </div>
                                    </fieldset>

                                    <fieldset className="form-section">
                                        <legend>Configurações e Valores</legend>
                                        <div className="form-grid-2-col">
                                            <div className="form-group">
                                                <label htmlFor="atendente_id">Responsável</label>
                                                <select
                                                    id="atendente_id"
                                                    value={formData.atendente_id}
                                                    onChange={handleInputChange}
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
                                                <label htmlFor="tipo_atendimento">Tipo de Atendimento</label>
                                                <select
                                                    id="tipo_atendimento"
                                                    value={formData.tipo_atendimento}
                                                    onChange={handleInputChange}
                                                >
                                                    <option value="Avulso">Avulso</option>
                                                    <option value="Contrato">Contrato</option>
                                                    <option value="Garantia">Garantia</option>
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="numero_orcamento">Número do Orçamento</label>
                                                <input
                                                    type="text"
                                                    id="numero_orcamento"
                                                    value={formData.numero_orcamento}
                                                    onChange={handleInputChange}
                                                    placeholder="Número do orçamento"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="prioridade">Prioridade</label>
                                                <select
                                                    id="prioridade"
                                                    value={formData.prioridade}
                                                    onChange={handleInputChange}
                                                >
                                                    <option value="Baixa">Baixa</option>
                                                    <option value="Média">Média</option>
                                                    <option value="Alta">Alta</option>
                                                    <option value="Urgente">Urgente</option>
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="status">Status</label>
                                                <select
                                                    id="status"
                                                    value={formData.status}
                                                    onChange={handleInputChange}
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
                                                    onChange={handleInputChange}
                                                    placeholder="Tempo estimado em dias"
                                                    min="0"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="custos_atendimento">Custos do Atendimento</label>
                                                <input
                                                    type="number"
                                                    id="custos_atendimento"
                                                    value={formData.custos_atendimento}
                                                    onChange={handleInputChange}
                                                    placeholder="Calculado automaticamente"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="valor_servico">Valor do Serviço</label>
                                                <input
                                                    type="number"
                                                    id="valor_servico"
                                                    value={formData.valor_servico}
                                                    onChange={handleInputChange}
                                                    placeholder="R$ 0,00"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                        </div>
                                    </fieldset>

                                    {/* Campo de Solução (apenas em edição) */}
                                    {editingAtendimento && (
                                        <fieldset className="form-section">
                                            <legend>Resolução</legend>
                                            <div className="form-group full-width">
                                                <label htmlFor="solucao">Solução Aplicada</label>
                                                <textarea
                                                    id="solucao"
                                                    value={formData.solucao}
                                                    onChange={handleInputChange}
                                                    rows={4}
                                                />
                                            </div>
                                        </fieldset>
                                    )}
                                </div>

                                {/* Botões de Ação */}
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingAtendimento ? 'Atualizar Atendimento' : 'Criar Atendimento'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Modal de Visualização */}
            {
                showViewModal && viewingAtendimento && (
                    <ViewModal
                        atendimento={viewingAtendimento}
                        onClose={() => setShowViewModal(false)}
                        handleEdit={handleEdit}
                        getClienteNome={getClienteNome}
                        getAssuntoNome={getAssuntoNome}
                        getEquipamentoNome={getEquipamentoNome}
                        getUsuarioNome={getUsuarioNome}
                        getEmpresaNome={getEmpresaNome}
                    />
                )
            }

            {/* Modais de Andamentos e Anexos */}
            {
                showAndamentosModal && viewingAtendimento && (
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
                )
            }

            {
                showAnexosModal && viewingAtendimento && (
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
                )
            }
        </div >
    );
};

export default AtendimentosRefatorado;
